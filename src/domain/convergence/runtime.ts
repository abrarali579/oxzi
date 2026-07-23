import { execSync } from "node:child_process";
import { contentFingerprint, stableJson, type JsonValue } from "../knowledge-graph";
import { taskCardSchema, type TaskCard } from "../task-card";

// ── Types ──────────────────────────────────────────────────────

export type ChangeType = "added" | "modified" | "deleted";

export interface FileChange {
  filePath: string;
  changeType: ChangeType;
}

export interface ConvergenceFinding {
  id: string;
  taskCardId: string;
  timestamp: string;
  changeType: ChangeType;
  filePath: string;
  drift: "out_of_scope" | "protected_file" | "untracked_file";
  detail: string;
  reverseProposal: string;
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
 * Returns relative file paths grouped by change type.
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
    // If git fails (not a repo, no ref, etc.), return empty
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
  const allPermittedSet = new Set([
    ...writableSet,
    ...readOnlySet,
  ]);
  return { writableSet, readOnlySet, protectedSet, allPermittedSet };
}

// ── Drift Detection ────────────────────────────────────────────

function classifyDrift(
  filePath: string,
  taskCardId: string,
  boundaries: ResolvedBoundaries,
): { drift: ConvergenceFinding["drift"]; detail: string } | null {
  // If the file is within the permitted scope, no drift
  if (boundaries.allPermittedSet.has(filePath)) return null;
  if (boundaries.writableSet.has(filePath)) return null;
  if (boundaries.readOnlySet.has(filePath)) return null;

  // Protected file changed
  if (boundaries.protectedSet.has(filePath)) {
    return {
      drift: "protected_file",
      detail: `Protected file "${filePath}" was modified but is protected by Task Card ${taskCardId}`,
    };
  }

  // File is outside any known boundary
  return {
    drift: "out_of_scope",
    detail: `File "${filePath}" is outside the scope of Task Card ${taskCardId}`,
  };
}

// ── Reverse Proposal Generation ────────────────────────────────

function generateReverseProposal(
  change: FileChange,
  drift: ConvergenceFinding["drift"],
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
    `2. **Option B**: If this change was intentional and within the project's scope,`,
    `   update the Specification's file inventory to register \`${change.filePath}\`.`,
    `3. **Option C**: If this change is unrelated to the current Task Card,`,
    `   it may indicate a cross-cutting concern that needs its own planning slice.`,
  );

  return proposal.join("\n");
}

// ── Main Scanning API ──────────────────────────────────────────

/**
 * Scan repository changes since a given Git ref and detect drift relative
 * to a Task Card's file boundaries. Generates "Reverse Proposals" for any
 * file changed outside the permitted scope.
 */
export function scanConvergence(
  taskCard: TaskCard,
  gitRef: string,
  options?: { includeUncommitted?: boolean },
): ConvergenceScanResult {
  const startTime = Date.now();
  const parsedCard = taskCardSchema.parse(taskCard);
  const boundaries = resolveBoundaries(parsedCard);

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

    if (!classification) continue; // file is within permitted scope

    const reverseProposal = generateReverseProposal(change, classification.drift, parsedCard);

    const finding: ConvergenceFinding = {
      id: `convergence_finding_${contentFingerprint({
        taskCardId: parsedCard.taskCardId,
        filePath: change.filePath,
        changeType: change.changeType,
      } satisfies Record<string, JsonValue>).replace("fp_f1_", "").slice(0, 16)}`,
      taskCardId: parsedCard.taskCardId,
      timestamp: new Date().toISOString(),
      changeType: change.changeType,
      filePath: change.filePath,
      drift: classification.drift,
      detail: classification.detail,
      reverseProposal,
      acknowledged: false,
      fingerprint: contentFingerprint({
        taskCardId: parsedCard.taskCardId,
        filePath: change.filePath,
        reverseProposal,
      } satisfies Record<string, JsonValue>),
    };

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
