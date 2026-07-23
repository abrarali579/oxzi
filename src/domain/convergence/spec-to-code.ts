/**
 * Spec-to-Code Convergence Runtime (Step 9)
 *
 * Deterministic pipeline that evaluates whether proposed code changes
 * converge with a Task Card's specifications, constraints, and
 * acceptance criteria.
 *
 * Pipeline:
 *   TaskCard + CompiledContext + ProposedCodeManifest
 *   → Spec Requirement Extraction
 *   → Structural Divergence Audit
 *   → Acceptance Criteria Verification
 *   → Convergence Matrix Calculation
 *   → Convergence Report (CONVERGED | DIVERGED)
 */
import { contentFingerprint, type JsonValue } from "../knowledge-graph";
import { taskCardSchema, type TaskCard } from "../task-card";
import { compiledContextSchema, type CompiledContext } from "../context-compiler";
import { repositoryManifestSchema, type RepositoryManifest } from "../repository-intelligence";
import {
  specToCodeConvergenceReportSchema,
  divergenceItemSchema,
  convergenceMatrixSchema,
  type SpecToCodeConvergenceReport,
  type DivergenceItem,
  type ConvergenceItem,
  type ConvergenceMatrix,
} from "./schemas";

// ── Input Schema ───────────────────────────────────────────────

export interface SpecToCodeInput {
  taskCard: TaskCard;
  compiledContext: CompiledContext;
  proposedCode: RepositoryManifest;
}

// ── Step 1: Spec Requirement Extraction ─────────────────────────

interface SpecRequirement {
  criterionId: string;
  targetFiles: string[];
  requiredExports: string[];
}

function extractSpecRequirements(taskCard: TaskCard): SpecRequirement[] {
  const boundaries = taskCard.fileBoundaries;
  const allTargetFiles = [
    ...boundaries.writableFiles,
    ...boundaries.readOnlyFiles,
  ];
  const _protectedFiles = new Set(boundaries.protectedFiles); // eslint-disable-line @typescript-eslint/no-unused-vars

  const requirements: SpecRequirement[] = [];

  // Create a requirement for each acceptance criterion
  for (const criterionId of taskCard.acceptanceCriteria) {
    // Infer target files from the criterion ID keywords against boundary files
    const keywords = criterionId.replace(/^criterion_/, "").split("_");
    const targetFiles = allTargetFiles.filter((f) =>
      keywords.some((kw) => f.includes(kw)),
    );

    // Infer required exports from the criterion-specific keywords
    // Only capitalize words that relate to the criterion's target files
    const requiredExports = keywords
      .filter((kw) => kw.length > 2)
      .map((kw) => kw.charAt(0).toUpperCase() + kw.slice(1));

    requirements.push({
      criterionId,
      targetFiles: targetFiles.length > 0 ? targetFiles : allTargetFiles,
      requiredExports: [...new Set(requiredExports)],
    });
  }

  return requirements;
}

// ── Step 2: Structural Divergence Audit ─────────────────────────

function auditDivergence(
  taskCard: TaskCard,
  proposedCode: RepositoryManifest,
): DivergenceItem[] {
  const divergences: DivergenceItem[] = [];
  const boundaries = taskCard.fileBoundaries;
  const protectedSet = new Set(boundaries.protectedFiles);
  const writableSet = new Set(boundaries.writableFiles);
  const proposedPaths = new Set(proposedCode.files.map((f) => f.filePath));

  // 2a. Check that all protected files are untouched
  for (const protectedPath of protectedSet) {
    if (proposedPaths.has(protectedPath)) {
      divergences.push(
        divergenceItemSchema.parse({
          criterionId: "boundary_protected_file",
          severity: "CRITICAL",
          message: `Protected file "${protectedPath}" is present in the proposed code changes. Protected files must not be modified.`,
          targetFile: protectedPath,
        }),
      );
    }
  }

  // 2b. Check that all writable files are present in the proposal
  for (const writablePath of writableSet) {
    if (!proposedPaths.has(writablePath)) {
      divergences.push(
        divergenceItemSchema.parse({
          criterionId: "boundary_missing_writable",
          severity: "WARNING",
          message: `Expected writable file "${writablePath}" is missing from the proposed code.`,
          targetFile: writablePath,
        }),
      );
    }
  }

  // 2c. Check for unauthorised files (files not in any boundary)
  const allPermitted = new Set([
    ...boundaries.writableFiles,
    ...boundaries.readOnlyFiles,
    ...boundaries.protectedFiles,
  ]);
  for (const file of proposedCode.files) {
    if (!allPermitted.has(file.filePath)) {
      divergences.push(
        divergenceItemSchema.parse({
          criterionId: "boundary_unauthorised_file",
          severity: "WARNING",
          message: `File "${file.filePath}" is not listed in any Task Card boundary.`,
          targetFile: file.filePath,
        }),
      );
    }
  }

  return divergences;
}

// ── Step 3: Acceptance Criteria Verification ────────────────────

function verifyAcceptanceCriteria(
  requirements: SpecRequirement[],
  proposedCode: RepositoryManifest,
): ConvergenceItem[] {
  const convergences: ConvergenceItem[] = [];
  const fileMap = new Map(proposedCode.files.map((f) => [f.filePath, f]));

  for (const req of requirements) {
    for (const targetFile of req.targetFiles) {
      const fileNode = fileMap.get(targetFile);
      if (!fileNode) {
        convergences.push({
          criterionId: req.criterionId,
          status: "fail",
          detail: `Required file "${targetFile}" is absent from the proposed code.`,
          targetFile,
        });
        continue;
      }

      // Check required exports exist in the file
      const missingExports = req.requiredExports.filter(
        (exp) => !fileNode.exports.includes(exp),
      );

      if (missingExports.length > 0) {
        convergences.push({
          criterionId: req.criterionId,
          status: "fail",
          detail: `File "${targetFile}" is missing required exports: [${missingExports.join(", ")}].`,
          targetFile,
        });
      } else if (req.requiredExports.length > 0) {
        convergences.push({
          criterionId: req.criterionId,
          status: "pass",
          detail: `File "${targetFile}" contains all required exports: [${req.requiredExports.join(", ")}].`,
          targetFile,
        });
      } else {
        // No specific exports required — file presence is sufficient
        convergences.push({
          criterionId: req.criterionId,
          status: "pass",
          detail: `Required file "${targetFile}" is present in the proposed code.`,
          targetFile,
        });
      }
    }
  }

  return convergences;
}

// ── Step 4: Convergence Matrix Calculation ──────────────────────

function calculateMatrix(
  convergences: ConvergenceItem[],
  divergences: DivergenceItem[],
): ConvergenceMatrix {
  const totalCriteria = convergences.length + divergences.length;
  const passed = convergences.filter((c) => c.status === "pass").length;
  const failed = convergences.filter((c) => c.status === "fail").length + divergences.length;
  const skipped = convergences.filter((c) => c.status === "skip").length;

  const score = totalCriteria > 0
    ? Math.round((passed / totalCriteria) * 100)
    : 100;

  return convergenceMatrixSchema.parse({
    totalCriteria,
    passed,
    failed,
    skipped,
    score,
  });
}

// ── Step 5: Report Generation ──────────────────────────────────

function generateReportId(taskCardId: string): string {
  const fp = contentFingerprint({ taskCardId, timestamp: Date.now() } as unknown as JsonValue);
  return `convergence_report_${fp.replace("fp_f1_", "").slice(0, 16)}`;
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Run the full Spec-to-Code Convergence pipeline.
 *
 * @param input - TaskCard + CompiledContext + proposed code (RepositoryManifest)
 * @returns A ConvergenceReport with CONVERGED or DIVERGED status
 */
export function runSpecToCodeConvergence(input: SpecToCodeInput): SpecToCodeConvergenceReport {
  const taskCard = taskCardSchema.parse(input.taskCard);
  const _compiledContext = compiledContextSchema.parse(input.compiledContext); // eslint-disable-line @typescript-eslint/no-unused-vars
  const proposedCode = repositoryManifestSchema.parse(input.proposedCode);

  // Step 1: Extract spec requirements from the Task Card
  const requirements = extractSpecRequirements(taskCard);

  // Step 2: Structural divergence audit
  const divergences = auditDivergence(taskCard, proposedCode);

  // Step 3: Verify acceptance criteria
  const convergences = verifyAcceptanceCriteria(requirements, proposedCode);

  // Step 4: Calculate convergence matrix
  const matrix = calculateMatrix(convergences, divergences);

  // Step 5: Determine status — convert convergence failures into divergence items
  const convergenceFailures: DivergenceItem[] = convergences
    .filter((c) => c.status === "fail")
    .map((c) =>
      divergenceItemSchema.parse({
        criterionId: c.criterionId,
        severity: "WARNING" as const,
        message: c.detail,
        targetFile: c.targetFile,
      }),
    );

  const allDivergences = [...divergences, ...convergenceFailures];
  const hasCritical = allDivergences.some((d) => d.severity === "CRITICAL");
  const status = hasCritical || allDivergences.length > 0 ? "DIVERGED" : "CONVERGED";

  const base = {
    reportId: generateReportId(taskCard.taskCardId),
    taskCardId: taskCard.taskCardId,
    status,
    score: matrix.score,
    divergences: allDivergences,
    convergences,
    matrix,
    timestamp: new Date().toISOString(),
  };

  return specToCodeConvergenceReportSchema.parse({
    ...base,
    fingerprint: contentFingerprint(base as unknown as JsonValue),
  });
}
