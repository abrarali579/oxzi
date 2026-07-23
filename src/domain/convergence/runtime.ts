import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { contentFingerprint, stableJson, type JsonValue } from "../knowledge-graph";
import { taskCardSchema, type TaskCard } from "../task-card";

// ── Lazy oxc-parser import guard (eval-based to hide from Turbopack) ─

let cachedParseExports: ((content: string) => string[]) | null = null;

function getParseExports(): (content: string) => string[] {
  if (!cachedParseExports) {
    try {
      const mod = eval('require')("../repository-intelligence") as {
        parseExports: (content: string) => string[];
      };
      cachedParseExports = mod.parseExports;
    } catch {
      cachedParseExports = () => [];
    }
  }
  return cachedParseExports;
}

// ── Types ──────────────────────────────────────────────────────

export type ChangeType = "added" | "modified" | "deleted";

export type DriftClass =
  | "out_of_scope"
  | "protected_file"
  | "untracked_file"
  | "overbuilt"
  | "missing_implementation"
  | "architecture_drift";

export interface FileChange {
  filePath: string;
  changeType: ChangeType;
}

export interface ConvergenceFinding {
  id: string;
  projectId: string;
  taskCardId: string;
  timestamp: string;
  changeType: ChangeType;
  filePath: string;
  drift: DriftClass;
  detail: string;
  reverseProposal: string;
  autoFixable: boolean;
  acknowledged: boolean;
  fingerprint: string;
}

export interface ConvergenceScanResult {
  findings: ConvergenceFinding[];
  scanTimestamp: string;
  scanDurationMs: number;
}

// ── Git Integration ────────────────────────────────────────────

/**
 * Get changed files since a given Git ref (commit hash, tag, or HEAD~n).
 */
export function getGitChangesSince(ref: string): FileChange[] {
  try {
    const diffOutput = execSync(`git diff --name-status ${ref}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 10000,
    });

    const changes: FileChange[] = [];

    for (const line of diffOutput.trim().split("\n")) {
      if (!line.trim()) continue;
      const parts = line.split("\t");
      if (parts.length < 2) continue;

      const status = parts[0]!;
      const filePath = parts.slice(1).join("/");

      let changeType: ChangeType;
      if (status === "A") changeType = "added";
      else if (status === "D") changeType = "deleted";
      else changeType = "modified";

      changes.push({ filePath, changeType });
    }

    return changes;
  } catch {
    return [];
  }
}

/**
 * Get uncommitted tracked file changes (working tree vs HEAD).
 */
export function getWorkingTreeChanges(): FileChange[] {
  try {
    const diffOutput = execSync(`git diff --name-status HEAD`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 10000,
    });

    const changes: FileChange[] = [];

    for (const line of diffOutput.trim().split("\n")) {
      if (!line.trim()) continue;
      const parts = line.split("\t");
      if (parts.length < 2) continue;

      const status = parts[0]!;
      const filePath = parts.slice(1).join("/");

      let changeType: ChangeType;
      if (status === "A") changeType = "added";
      else if (status === "D") changeType = "deleted";
      else changeType = "modified";

      changes.push({ filePath, changeType });
    }

    return changes;
  } catch {
    return [];
  }
}

/**
 * List all files under a directory recursively relative to repo root.
 */
function listFiles(dir: string, repoRoot: string): string[] {
  try {
    const output = execSync(`git ls-files "${dir}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 10000,
      cwd: repoRoot,
    });
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

// ── Boundary Resolution ────────────────────────────────────────

interface ResolvedBoundaries {
  writableSet: Set<string>;
  readOnlySet: Set<string>;
  protectedSet: Set<string>;
  allPermittedSet: Set<string>;
}

function resolveBoundaries(taskCard: TaskCard): ResolvedBoundaries {
  const writableSet = new Set(taskCard.fileBoundaries.writableFiles);
  const readOnlySet = new Set(taskCard.fileBoundaries.readOnlyFiles);
  const protectedSet = new Set(taskCard.fileBoundaries.protectedFiles);
  const allPermittedSet = new Set([...writableSet, ...readOnlySet]);
  return { writableSet, readOnlySet, protectedSet, allPermittedSet };
}

// ── Drift Classification ───────────────────────────────────────

function classifyDrift(
  filePath: string,
  taskCardId: string,
  boundaries: ResolvedBoundaries,
): { drift: DriftClass; detail: string } | null {
  if (boundaries.allPermittedSet.has(filePath)) return null;
  if (boundaries.writableSet.has(filePath)) return null;
  if (boundaries.readOnlySet.has(filePath)) return null;

  if (boundaries.protectedSet.has(filePath)) {
    return {
      drift: "protected_file",
      detail: `Protected file "${filePath}" was modified but is protected by Task Card ${taskCardId}`,
    };
  }

  return {
    drift: "out_of_scope",
    detail: `File "${filePath}" is outside the scope of Task Card ${taskCardId}`,
  };
}

/**
 * Detect files that exist in the repository but are not listed in any
 * known plan boundary — these may be overbuilt or undocumented.
 */
function detectOverbuiltFiles(
  repoRoot: string,
  srcDir: string,
  allPlannedFiles: Set<string>,
  projectId: string,
): ConvergenceFinding[] {
  const repoFiles = listFiles(srcDir, repoRoot);
  const findings: ConvergenceFinding[] = [];

  for (const file of repoFiles) {
    if (!allPlannedFiles.has(file)) {
      const finding = makeFinding({
        projectId,
        taskCardId: "N/A",
        filePath: file,
        drift: "overbuilt",
        changeType: "added",
        detail: `File "${file}" exists in the repository but is not listed in any Technical Plan or Task Card boundary.`,
        reverseProposal: `## Reverse Proposal: Undocumented file\n\nFile \`${file}\` exists in the repository but is not referenced by any plan. Consider adding it to the Specification's file inventory or documenting why it exists.`,
        autoFixable: true,
      });
      findings.push(finding);
    }
  }

  return findings;
}

/**
 * Detect files listed in a Task Card boundary that are missing from
 * the repository — these represent missing implementation.
 */
function detectMissingFiles(
  taskCard: TaskCard,
  repoRoot: string,
  projectId: string,
): ConvergenceFinding[] {
  const allBoundaryFiles = [
    ...taskCard.fileBoundaries.writableFiles,
    ...taskCard.fileBoundaries.readOnlyFiles,
    ...taskCard.fileBoundaries.protectedFiles,
  ];

  const findings: ConvergenceFinding[] = [];

  for (const file of allBoundaryFiles) {
    const fullPath = join(repoRoot, file);
    if (!existsSync(fullPath)) {
      const finding = makeFinding({
        projectId,
        taskCardId: taskCard.taskCardId,
        filePath: file,
        drift: "missing_implementation",
        changeType: "deleted",
        detail: `File "${file}" is listed in Task Card ${taskCard.taskCardId} boundaries but does not exist in the repository.`,
        reverseProposal: `## Reverse Proposal: Missing implementation\n\nFile \`${file}\` is required by Task Card ${taskCard.taskCardId} but is missing from the repository. Either create it or update the Task Card boundaries.`,
        autoFixable: false,
      });
      findings.push(finding);
    }
  }

  return findings;
}

/**
 * Detect architecture drift by comparing registered exports (from the
 * AST parser) against expected exports inferred from the Task Card
 * boundaries. A public function appearing/disappearing constitutes drift.
 */
function detectArchitectureDrift(
  taskCard: TaskCard,
  repoRoot: string,
  projectId: string,
): ConvergenceFinding[] {
  const findings: ConvergenceFinding[] = [];
  const writableFiles = taskCard.fileBoundaries.writableFiles;

  for (const file of writableFiles) {
    const fullPath = join(repoRoot, file);
    if (!existsSync(fullPath)) continue;

    try {
      const content = readFileSync(fullPath, "utf-8");
      const exports = getParseExports()(content);

      // Check if the Task Card goal mentions specific functions/classes
      // that should exist based on the file content
      const goalKeywords = taskCard.goal
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);

      const matchedExports = exports.filter((exp) =>
        goalKeywords.some((kw) => exp.toLowerCase().includes(kw)),
      );

      if (matchedExports.length === 0 && exports.length > 0) {
        // File has exports but none match the Task Card goal — this may
        // indicate the implementation drifted from the specification
        const finding = makeFinding({
          projectId,
          taskCardId: taskCard.taskCardId,
          filePath: file,
          drift: "architecture_drift",
          changeType: "modified",
          detail: `File "${file}" exports [${exports.join(", ")}] but none match expected symbols from Task Card goal "${taskCard.goal}".`,
          reverseProposal: `## Reverse Proposal: Architecture drift\n\nFile \`${file}\` exports symbols that don't align with Task Card ${taskCard.taskCardId} goal. Review whether the implementation matches the specification.`,
          autoFixable: false,
        });
        findings.push(finding);
      }
    } catch {
      // File can't be read — skip
    }
  }

  return findings;
}

// ── Finding Factory ─────────────────────────────────────────────

function makeFinding(opts: {
  projectId: string;
  taskCardId: string;
  filePath: string;
  drift: DriftClass;
  changeType: ChangeType;
  detail: string;
  reverseProposal: string;
  autoFixable: boolean;
}): ConvergenceFinding {
  return {
    id: `convergence_finding_${contentFingerprint({
      projectId: opts.projectId,
      taskCardId: opts.taskCardId,
      filePath: opts.filePath,
      drift: opts.drift,
    } satisfies Record<string, JsonValue>).replace("fp_f1_", "").slice(0, 16)}`,
    projectId: opts.projectId,
    taskCardId: opts.taskCardId,
    timestamp: new Date().toISOString(),
    changeType: opts.changeType,
    filePath: opts.filePath,
    drift: opts.drift,
    detail: opts.detail,
    reverseProposal: opts.reverseProposal,
    autoFixable: opts.autoFixable,
    acknowledged: false,
    fingerprint: contentFingerprint({
      projectId: opts.projectId,
      taskCardId: opts.taskCardId,
      filePath: opts.filePath,
      reverseProposal: opts.reverseProposal,
    } satisfies Record<string, JsonValue>),
  };
}

// ── Reverse Proposal Generation ────────────────────────────────

function generateReverseProposal(
  change: FileChange,
  drift: DriftClass,
  taskCard: TaskCard,
): string {
  const action = change.changeType === "deleted" ? "removed" : "changed";
  const proposal = [
    `## Reverse Proposal: ${action} file outside Task Card scope`,
    "",
    `File: \`${change.filePath}\` was ${action}.`,
    `Task Card: ${taskCard.taskCardId} — "${taskCard.goal}"`,
    "",
    `This file is not part of the current Task Card's file boundaries.`,
    ``,
  ];

  if (drift === "protected_file") {
    proposal.push(
      `**Recommendation**: The change to \`${change.filePath}\` may affect protected`,
      `functionality. Consider creating a new Task Card to audit and validate this change.`,
    );
  } else {
    proposal.push(
      `**Recommendation**: Either update the Specification to include \`${change.filePath}\``,
      `as a known project file, or create a new Task Card that explicitly targets`,
      `this file for modification.`,
    );
  }

  proposal.push(
    ``,
    `### Suggested actions`,
    ``,
    `1. **Option A**: Create a new Task Card that includes \`${change.filePath}\` in its file boundaries.`,
    `2. **Option B**: If this change was intentional, update the Specification's file inventory.`,
    `3. **Option C**: If unrelated, it may indicate a cross-cutting concern needing its own slice.`,
  );

  return proposal.join("\n");
}

// ── Main Scanning API ──────────────────────────────────────────

/**
 * Scan the repository for drift by comparing the current file structure
 * and AST symbols against the approved Technical Plan and Task Card
 * boundaries.
 *
 * Detects:
 *   - overbuilt: file exists but not in any plan
 *   - missing_implementation: file in boundary but missing from repo
 *   - architecture_drift: exports don't match expected goal symbols
 *   - out_of_scope / protected_file: git changes outside boundaries
 */
export function scanForDrift(
  projectId: string,
  taskCards: TaskCard[],
  repoRoot: string,
  srcDir: string,
): ConvergenceScanResult {
  const startTime = Date.now();
  const findings: ConvergenceFinding[] = [];

  // Collect all planned files across all Task Cards
  const allPlannedFiles = new Set<string>();
  for (const card of taskCards) {
    const parsed = taskCardSchema.parse(card);
    for (const f of parsed.fileBoundaries.writableFiles) allPlannedFiles.add(f);
    for (const f of parsed.fileBoundaries.readOnlyFiles) allPlannedFiles.add(f);
    for (const f of parsed.fileBoundaries.protectedFiles) allPlannedFiles.add(f);
  }

  // 1. Detect overbuilt files
  const overbuilt = detectOverbuiltFiles(repoRoot, srcDir, allPlannedFiles, projectId);
  findings.push(...overbuilt);

  // 2. Detect missing implementation per Task Card
  for (const card of taskCards) {
    const parsed = taskCardSchema.parse(card);
    const missing = detectMissingFiles(parsed, repoRoot, projectId);
    findings.push(...missing);

    // 3. Detect architecture drift per Task Card
    const drift = detectArchitectureDrift(parsed, repoRoot, projectId);
    findings.push(...drift);
  }

  return {
    findings,
    scanTimestamp: new Date().toISOString(),
    scanDurationMs: Date.now() - startTime,
  };
}

/**
 * Scan repository changes since a given Git ref and detect drift relative
 * to a Task Card's file boundaries. Generates "Reverse Proposals" for any
 * file changed outside the permitted scope.
 */
export function scanConvergence(
  taskCard: TaskCard,
  gitRef: string,
  options?: { includeUncommitted?: boolean; projectId?: string },
): ConvergenceScanResult {
  const startTime = Date.now();
  const parsedCard = taskCardSchema.parse(taskCard);
  const boundaries = resolveBoundaries(parsedCard);
  const projectId = options?.projectId ?? "unknown";

  const changes: FileChange[] = getGitChangesSince(gitRef);

  if (options?.includeUncommitted) {
    const uncommitted = getWorkingTreeChanges();
    const existingPaths = new Set(changes.map((c) => c.filePath));
    for (const uc of uncommitted) {
      if (!existingPaths.has(uc.filePath)) {
        changes.push(uc);
      }
    }
  }

  const findings: ConvergenceFinding[] = [];

  for (const change of changes) {
    const classification = classifyDrift(
      change.filePath,
      parsedCard.taskCardId,
      boundaries,
    );

    if (!classification) continue;

    const reverseProposal = generateReverseProposal(change, classification.drift, parsedCard);

    const finding = makeFinding({
      projectId,
      taskCardId: parsedCard.taskCardId,
      filePath: change.filePath,
      drift: classification.drift,
      changeType: change.changeType,
      detail: classification.detail,
      reverseProposal,
      autoFixable: classification.drift === "out_of_scope",
    });

    findings.push(finding);
  }

  return {
    findings,
    scanTimestamp: new Date().toISOString(),
    scanDurationMs: Date.now() - startTime,
  };
}

// ── Finding Management ─────────────────────────────────────────

/**
 * Mark a convergence finding as acknowledged (supresses UI alerts).
 */
export function acknowledgeFinding(finding: ConvergenceFinding): ConvergenceFinding {
  return { ...finding, acknowledged: true };
}

/**
 * Serialize findings for persistence or display.
 */
export function serializeFindings(findings: ConvergenceFinding[]): string {
  return stableJson(
    findings.map((f) => ({
      ...f,
      fingerprint: undefined,
    })) as unknown as JsonValue,
  );
}

