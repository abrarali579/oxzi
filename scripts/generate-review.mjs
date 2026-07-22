import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const GENERATED_FILES = new Set([
  "summary.md",
  "changed-files.md",
  "validation-results.md",
  "architecture-impact.md",
  "codex-report.md",
  "git.diff",
]);

const ACTIVE_RUN_ENV = "OXZI_REVIEW_ACTIVE";
const ACTIVE_RUN_SENTINEL = ".active-run";
const RECURSION_BLOCKER = "BLOCKER: Review generation recursion detected.";
const DEFAULT_COMMAND_TIMEOUT_MS = 10 * 60 * 1000;
const LOCKFILE_NAMES = new Set([
  "bun.lock",
  "bun.lockb",
  "cargo.lock",
  "composer.lock",
  "gemfile.lock",
  "npm-shrinkwrap.json",
  "package-lock.json",
  "pipfile.lock",
  "pnpm-lock.yaml",
  "poetry.lock",
  "uv.lock",
  "yarn.lock",
]);

const STATUS_LABELS = {
  A: "Added",
  C: "Copied",
  D: "Deleted",
  M: "Modified",
  R: "Renamed",
  T: "Type changed",
  U: "Unmerged",
  X: "Unknown",
};

export function runProcess(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "1",
      FORCE_COLOR: "0",
      NO_COLOR: "1",
    },
    input: options.input,
    maxBuffer: 50 * 1024 * 1024,
    timeout: options.timeout ?? DEFAULT_COMMAND_TIMEOUT_MS,
  });

  return {
    command: [command, ...args].join(" "),
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error,
    signal: result.signal ?? null,
    timedOut: result.error?.code === "ETIMEDOUT",
  };
}

function runGit(root, args, options = {}) {
  return runProcess("git", args, { ...options, cwd: root });
}

export function describeProcessFailure(result, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
  if (result.timedOut) {
    return `Timed out after ${timeoutMs}ms${result.signal ? `; terminated by ${result.signal}` : ""}.`;
  }
  if (result.error) {
    const code = result.error.code ? `${result.error.code}: ` : "";
    return `Spawn error — ${code}${result.error.message}`;
  }
  if (result.signal) {
    return `Terminated by signal ${result.signal}.`;
  }
  return `Exited with code ${result.status ?? "unknown"}.`;
}

function requireSuccess(result, description) {
  if (result.status !== 0) {
    const detail = sanitizeText(result.stderr || result.stdout || "Unknown error");
    throw new Error(`${description} failed: ${detail.trim()}`);
  }

  return result.stdout.trim();
}

export function isSensitivePath(filePath) {
  const normalized = filePath.replaceAll("\\", "/").replace(/^\.\//, "");
  const lowerPath = normalized.toLowerCase();
  const segments = lowerPath.split("/");
  const basename = segments.at(-1) ?? "";

  if (segments.includes("node_modules") || segments.includes(".next")) {
    return true;
  }

  if (lowerPath.startsWith(".review/") && basename !== ".gitkeep") {
    return true;
  }

  if (basename === ".env" || basename.startsWith(".env.")) {
    return true;
  }

  if ([".npmrc", ".pypirc", ".netrc", "id_rsa", "id_ed25519"].includes(basename)) {
    return true;
  }

  if (/(^|[._-])(secret|secrets|token|tokens|credential|credentials)([._-]|$)/i.test(basename)) {
    return true;
  }

  return /\.(?:db|sqlite|sqlite3|pem|key|p12|pfx|jks)$/i.test(basename);
}

export function isLockfilePath(filePath) {
  const basename = filePath.replaceAll("\\", "/").split("/").at(-1)?.toLowerCase() ?? "";
  return LOCKFILE_NAMES.has(basename) || basename.endsWith(".lock");
}

const CREDENTIAL_KEY_SOURCE = [
  "api[_-]?key",
  "access[_-]?key(?:[_-]?id)?",
  "auth",
  "auth[_-]?token",
  "client[_-]?secret",
  "cookie",
  "credential",
  "passphrase",
  "passwd",
  "password",
  "private[_-]?key",
  "secret",
  "session(?:[_-]?(?:id|key|token))?",
  "token",
].join("|");

function shannonEntropy(value) {
  const frequencies = new Map();
  for (const character of value) {
    frequencies.set(character, (frequencies.get(character) ?? 0) + 1);
  }

  let entropy = 0;
  for (const count of frequencies.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

function isHarmlessIdentifier(value) {
  const candidate = value.trim().replace(/^["']|["'],?$/g, "");
  return (
    candidate === "" ||
    /^\[REDACTED/i.test(candidate) ||
    /^(?:null|undefined|true|false|none|example|placeholder|changeme)$/i.test(candidate) ||
    /^(?:process|import\.meta)\.env\b/.test(candidate) ||
    /^\$\{[^}]+\}$/.test(candidate) ||
    /^<[A-Z0-9_-]+>$/.test(candidate) ||
    /^[0-9a-f]{7,64}$/i.test(candidate) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate) ||
    /^sha(?:1|256|384|512)-[A-Za-z0-9+/=]+$/.test(candidate)
  );
}

export function isHighEntropyCredentialValue(value) {
  const candidate = value.trim().replace(/^["']|["'],?$/g, "");
  if (isHarmlessIdentifier(candidate) || candidate.length < 16 || candidate.length > 4096) {
    return false;
  }
  if (/\s/.test(candidate)) {
    return false;
  }

  const categories = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((pattern) =>
    pattern.test(candidate),
  ).length;
  return categories >= 2 && shannonEntropy(candidate) >= 3.3;
}

function shouldRedactCredentialValue(key, value) {
  const normalizedKey = key.toLowerCase().replaceAll("-", "_");
  const candidate = value.trim().replace(/[,;}\]]+$/, "");
  if (isHarmlessIdentifier(candidate)) {
    return false;
  }
  if (normalizedKey === "auth") {
    return candidate.length >= 8 && /^[A-Za-z0-9+/=_-]+$/.test(candidate);
  }
  if (isHighEntropyCredentialValue(candidate)) {
    return true;
  }

  return /(?:password|passwd|passphrase|secret|private_key|access_key|api_key|cookie|session|token|credential)/.test(
    normalizedKey,
  ) && candidate.length >= 4;
}

export function sanitizeText(value) {
  let text = String(value ?? "");

  text = text.replace(
    /-----BEGIN [^-\n]*PRIVATE KEY-----[\s\S]*?-----END [^-\n]*PRIVATE KEY-----/g,
    "[REDACTED PRIVATE KEY]",
  );
  text = text.replace(/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED AWS ACCESS KEY]");
  text = text.replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, "[REDACTED GITHUB TOKEN]");
  text = text.replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, "[REDACTED SLACK TOKEN]");
  text = text.replace(/\bsk-(?:proj-)?[A-Za-z0-9_-]{12,}\b/g, "[REDACTED API KEY]");
  text = text.replace(
    /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
    "[REDACTED JWT]",
  );
  text = text.replace(
    /(https?:\/\/)([^/\s:@]+):([^@\s/]+)@/gi,
    "$1[REDACTED CREDENTIALS]@",
  );
  text = text.replace(
    new RegExp(`^([+\\- ]?\\s*["']?(?:cookie|set-cookie|authorization)["']?\\s*[:=]\\s*).*$`, "gim"),
    "$1[REDACTED]",
  );

  const quotedFieldPattern = new RegExp(
    `(["']?(${CREDENTIAL_KEY_SOURCE})["']?\\s*[:=]\\s*)(["'])([^"'\\r\\n]*)\\3`,
    "gi",
  );
  text = text.replace(quotedFieldPattern, (match, prefix, key, quote, fieldValue) => {
    if (!shouldRedactCredentialValue(key, fieldValue)) {
      return match;
    }
    return `${prefix}${quote}[REDACTED]${quote}`;
  });

  const bareFieldPattern = new RegExp(
    `((?:${CREDENTIAL_KEY_SOURCE})\\s*[:=]\\s*)([^\\s,;}\\]]+)`,
    "gi",
  );
  text = text.replace(bareFieldPattern, (match, prefix, fieldValue, offset, fullText) => {
    const key = prefix.split(/[:=]/, 1)[0].trim();
    const previousCharacter = offset > 0 ? fullText[offset - 1] : "";
    if (previousCharacter && /[A-Za-z0-9_]/.test(previousCharacter)) {
      return match;
    }
    if (!shouldRedactCredentialValue(key, fieldValue)) {
      return match;
    }
    return `${prefix}[REDACTED]`;
  });

  return text;
}

export function detectPotentialSecretLeakage(value) {
  const text = String(value ?? "");
  return sanitizeText(text) === text ? [] : ["recognized secret pattern remained after sanitization"];
}

export function parseNameStatus(rawOutput) {
  const tokens = rawOutput.split("\0");
  if (tokens.at(-1) === "") {
    tokens.pop();
  }

  const changes = [];
  let index = 0;

  while (index < tokens.length) {
    const rawStatus = tokens[index++];
    const status = rawStatus.charAt(0);

    if (status === "R" || status === "C") {
      const previousPath = tokens[index++];
      const path = tokens[index++];
      if (previousPath && path) {
        changes.push({ path, previousPath, status, rawStatus });
      }
      continue;
    }

    const path = tokens[index++];
    if (path) {
      changes.push({ path, status, rawStatus });
    }
  }

  return changes;
}

function getEmptyTree(root) {
  return requireSuccess(
    runGit(root, ["mktree"], { input: "" }),
    "Creating an empty-tree comparison base",
  );
}

function getRepositoryState(root) {
  const headCheck = runGit(root, ["rev-parse", "--verify", "HEAD"]);
  if (headCheck.status !== 0) {
    const emptyTree = getEmptyTree(root);
    return {
      baseRef: emptyTree,
      comparisonLabel: `empty tree (${emptyTree}) — repository has no commits`,
      hasCommit: false,
      latestCommit: null,
    };
  }

  const parentCheck = runGit(root, ["rev-parse", "--verify", "HEAD~1"]);
  if (parentCheck.status === 0) {
    return {
      baseRef: "HEAD~1",
      comparisonLabel: "HEAD~1",
      hasCommit: true,
      latestCommit: getLatestCommit(root),
    };
  }

  const emptyTree = getEmptyTree(root);
  return {
    baseRef: emptyTree,
    comparisonLabel: `empty tree (${emptyTree}) — root commit has no parent`,
    hasCommit: true,
    latestCommit: getLatestCommit(root),
  };
}

function collectChanges(root, baseRef) {
  const trackedResult = runGit(root, ["diff", "--name-status", "-z", baseRef]);
  const trackedChanges = parseNameStatus(
    requireSuccess(trackedResult, "Collecting tracked changed files"),
  );
  const untrackedOutput = requireSuccess(
    runGit(root, ["ls-files", "--others", "--exclude-standard", "-z"]),
    "Collecting untracked files",
  );
  const untrackedChanges = untrackedOutput
    .split("\0")
    .filter(Boolean)
    .map((path) => ({ path, status: "A", rawStatus: "A", untracked: true }));

  const allChanges = [...trackedChanges, ...untrackedChanges];
  const eligible = [];
  let excludedCount = 0;

  for (const change of allChanges) {
    const paths = [change.path, change.previousPath].filter(Boolean);
    if (paths.some(isSensitivePath)) {
      excludedCount += 1;
      continue;
    }
    eligible.push({ ...change, lockfile: paths.some(isLockfilePath) });
  }

  return { changes: eligible, excludedCount };
}

function literalPathspec(filePath) {
  return `:(literal)${filePath}`;
}

function parseNumstat(output) {
  let added = 0;
  let removed = 0;
  let binary = false;

  for (const line of output.split("\n").filter(Boolean)) {
    const [addedValue, removedValue] = line.split("\t", 3);
    if (addedValue === "-" || removedValue === "-") {
      binary = true;
      continue;
    }
    added += Number.parseInt(addedValue, 10) || 0;
    removed += Number.parseInt(removedValue, 10) || 0;
  }

  return {
    added: binary ? "binary" : added,
    removed: binary ? "binary" : removed,
  };
}

function collectLockfileSummary(root, baseRef, change) {
  const pathspecs = [change.path, change.previousPath].filter(Boolean).map(literalPathspec);
  let result;

  if (change.untracked) {
    const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
    result = runGit(root, ["diff", "--no-index", "--numstat", "--", nullDevice, change.path]);
    if (![0, 1].includes(result.status)) {
      throw new Error("Generating untracked lockfile statistics failed for a safe path.");
    }
  } else {
    result = runGit(root, ["diff", "--numstat", baseRef, "--", ...pathspecs]);
    requireSuccess(result, "Generating tracked lockfile statistics");
  }

  return {
    path: change.path,
    ...parseNumstat(result.stdout),
    dependenciesChanged: true,
  };
}

function collectDiff(root, baseRef, changes) {
  const trackedPaths = new Set();
  const untrackedPaths = [];
  const lockfiles = [];

  for (const change of changes) {
    if (change.lockfile) {
      lockfiles.push(collectLockfileSummary(root, baseRef, change));
      continue;
    }
    if (change.untracked) {
      untrackedPaths.push(change.path);
      continue;
    }
    trackedPaths.add(change.path);
    if (change.previousPath) {
      trackedPaths.add(change.previousPath);
    }
  }

  const trackedArguments = [...trackedPaths].map(literalPathspec);
  let diff = "";
  let stat = "";

  if (trackedArguments.length > 0) {
    diff = requireSuccess(
      runGit(root, ["diff", "--no-ext-diff", baseRef, "--", ...trackedArguments]),
      "Generating the tracked diff",
    );
    stat = requireSuccess(
      runGit(root, ["diff", "--stat", baseRef, "--", ...trackedArguments]),
      "Generating tracked diff statistics",
    );
  }

  for (const filePath of untrackedPaths) {
    const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
    const fileDiff = runGit(root, ["diff", "--no-index", "--no-ext-diff", "--", nullDevice, filePath]);
    if (![0, 1].includes(fileDiff.status)) {
      throw new Error(`Generating the untracked diff failed for a safe path.`);
    }
    if (fileDiff.stdout) {
      diff += `${diff ? "\n" : ""}${fileDiff.stdout.trimEnd()}`;
    }

    const fileStat = runGit(root, ["diff", "--no-index", "--stat", "--", nullDevice, filePath]);
    if (![0, 1].includes(fileStat.status)) {
      throw new Error(`Generating untracked diff statistics failed for a safe path.`);
    }
    if (fileStat.stdout) {
      stat += `${stat ? "\n" : ""}${fileStat.stdout.trimEnd()}`;
    }
  }

  const lockfileReport = lockfiles.length > 0
    ? [
        "LOCKFILE SUMMARIES — RAW CONTENT EXCLUDED",
        ...lockfiles.flatMap((lockfile) => [
          `Filename: ${lockfile.path}`,
          `Added lines: ${lockfile.added}`,
          `Removed lines: ${lockfile.removed}`,
          `Dependencies changed: ${lockfile.dependenciesChanged ? "yes" : "no"}`,
          "",
        ]),
      ].join("\n").trimEnd()
    : "";
  if (lockfileReport) {
    diff += `${diff ? "\n\n" : ""}${lockfileReport}`;
    stat += `${stat ? "\n" : ""}${lockfileReport}`;
  }

  return {
    diff: `${sanitizeText(diff).trimEnd()}\n`,
    stat: sanitizeText(stat).trim() || "No eligible diff statistics were produced.",
    lockfiles,
  };
}

export function runValidation(root, scriptName, options = {}) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const startedAt = Date.now();
  const timeoutMs = options.timeout ?? DEFAULT_COMMAND_TIMEOUT_MS;
  const result = runProcess(npmCommand, ["run", scriptName], { cwd: root, timeout: timeoutMs });
  const durationMs = Date.now() - startedAt;
  const passed = result.status === 0 && !result.error && !result.signal;
  const diagnostic = passed ? "" : describeProcessFailure(result, timeoutMs);
  const combinedOutput = [result.stdout, result.stderr, diagnostic ? `[Execution diagnostic] ${diagnostic}` : ""]
    .filter(Boolean)
    .join("\n");
  const output = sanitizeText(combinedOutput).trim();

  return {
    command: `npm run ${scriptName}`,
    durationMs,
    output,
    passed,
    status: result.status,
    signal: result.signal,
    timedOut: result.timedOut,
    spawnErrorCode: result.error?.code ?? null,
    diagnostic,
    recursionDetected: output.includes(RECURSION_BLOCKER),
  };
}

function markdownPath(value) {
  return `\`${sanitizeText(value).replaceAll("`", "\\`")}\``;
}

function renderLockfileTable(lockfiles) {
  if (lockfiles.length === 0) {
    return "No lockfiles changed.";
  }

  return `| Filename | Added lines | Removed lines | Dependencies changed |
|---|---:|---:|---|
${lockfiles.map((lockfile) =>
    `| ${markdownPath(lockfile.path)} | ${lockfile.added} | ${lockfile.removed} | ${lockfile.dependenciesChanged ? "Yes" : "No"} |`,
  ).join("\n")}`;
}

function renderChangedFiles(changes, stat, comparisonLabel, lockfiles) {
  const rows = changes.filter((change) => !change.lockfile).map((change) => {
    const label = STATUS_LABELS[change.status] ?? change.rawStatus;
    const path = change.previousPath
      ? `${markdownPath(change.previousPath)} → ${markdownPath(change.path)}`
      : markdownPath(change.path);
    return `| ${label} | ${path} |`;
  });

  return `# Changed Files

Comparison base: ${markdownPath(comparisonLabel)}

| Status | Path |
|---|---|
${rows.length > 0 ? rows.join("\n") : "| — | No eligible changed files detected |"}

## Lockfile Changes

Raw lockfile contents are excluded.

${renderLockfileTable(lockfiles)}

## Git Diff Stat

\`\`\`text
${stat}
\`\`\`
`;
}

function renderValidationResults(results) {
  const summaryRows = results.map(
    (result) =>
      `| ${markdownPath(result.command)} | ${result.passed ? "PASS" : `FAIL — ${sanitizeText(result.diagnostic)}`} | ${(result.durationMs / 1000).toFixed(1)}s |`,
  );
  const detailSections = results.map((result) => {
    const output = result.output || "Command completed without output.";
    const limit = 16_000;
    const captured = output.length > limit
      ? `${output.slice(0, limit)}\n[Output truncated after ${limit} characters]`
      : output;

    return `## ${result.command}

**Result:** ${result.passed ? "PASS" : `FAIL — ${sanitizeText(result.diagnostic)}`}

**Exit code:** ${result.status ?? "none"}  
**Signal:** ${result.signal ?? "none"}  
**Timed out:** ${result.timedOut ? "yes" : "no"}  
**Spawn error:** ${result.spawnErrorCode ?? "none"}

\`\`\`text
${captured}
\`\`\``;
  });

  return `# Validation Results

| Command | Result | Duration |
|---|---|---:|
${summaryRows.join("\n")}

${detailSections.join("\n\n")}
`;
}

function pathMatches(paths, pattern) {
  return paths.some((path) => pattern.test(path));
}

export function renderArchitectureImpact(paths, excludedCount = 0) {
  const domains = [];
  if (pathMatches(paths, /^(scripts\/|\.review\/|package\.json$|\.gitignore$)/)) {
    domains.push("Developer tooling and local review handoff");
  }
  if (pathMatches(paths, /(^|\/)(?:README|PROJECT|DECISIONS|AGENTS|OXZI)?[^/]*\.md$/i)) {
    domains.push("Project documentation and agent workflow");
  }
  if (pathMatches(paths, /^src\//)) {
    domains.push("Application implementation");
  }

  const invariantImpact = pathMatches(paths, /^(DECISIONS\.md|context\/02-architecture\.md|specs\/)/)
    ? "Decision, architecture, or specification files changed; a reviewer must confirm protected invariants remain consistent."
    : "No protected decision, architecture, or specification file changed."
  const schemaImpact = pathMatches(paths, /(project-schema|canonical-project-schema|schema)/i)
    ? "Potential schema impact detected from changed paths; inspect the diff before approval."
    : "No canonical project schema path changed."
  const apiImpact = pathMatches(paths, /(^src\/app\/api\/|route\.[cm]?[jt]sx?$|\/api\/)/)
    ? "Potential API surface changes detected; inspect route contracts and authorization."
    : "No application API route path changed."
  const uiImpact = pathMatches(paths, /^(src\/(?:app|components)\/|.*\.(?:css|scss)$)/)
    ? "Potential UI changes detected; inspect responsive, accessibility, and visual behavior."
    : "No application UI path changed."
  const securityImpact = pathMatches(paths, /(^src\/lib\/security\/|package(?:-lock)?\.json$|scripts\/generate-review\.mjs$)/)
    ? "Review execution boundaries, dependency changes, and redaction safeguards. Sensitive paths are excluded and recognized credential patterns are redacted."
    : "No security-domain or dependency-manifest path changed."
  const documentationImpact = pathMatches(paths, /\.md$/i)
    ? "Documentation changed and should be checked for consistency with code and accepted decisions."
    : "No Markdown documentation path changed."
  const risks = [
    "Architecture classification is path-based and requires human confirmation.",
    "The package compares against HEAD~1, so it can include the latest commit plus working-tree changes.",
  ];
  if (excludedCount > 0) {
    risks.push(`${excludedCount} sensitive or generated path(s) were excluded without exposing their names.`);
  }

  return `# Architecture Impact

## Affected Domains

${(domains.length > 0 ? domains : ["No domain inferred from eligible changed paths."]).map((item) => `- ${item}`).join("\n")}

## Changed Invariants

${invariantImpact}

## Schema Impact

${schemaImpact}

## API Impact

${apiImpact}

## UI Impact

${uiImpact}

## Security Impact

${securityImpact}

## Documentation Impact

${documentationImpact}

## Unresolved Risks

${risks.map((risk) => `- ${risk}`).join("\n")}
`;
}

function renderSummary({
  branch,
  latestCommit,
  comparisonLabel,
  changes,
  stat,
  results,
  excludedCount,
  lockfiles,
  securityLeakageDetected,
}) {
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;
  const latestCommitLine = latestCommit
    ? `${markdownPath(latestCommit.shortHash)} — ${sanitizeText(latestCommit.subject)}`
    : "No commit exists (unborn repository).";
  const latestCommitDate = latestCommit ? sanitizeText(latestCommit.date) : "Not available";

  return `# Review Summary

- Generated: ${new Date().toISOString()}
- Branch: ${markdownPath(branch)}
- Latest commit: ${latestCommitLine}
- Latest commit date: ${latestCommitDate}
- Comparison base: ${markdownPath(comparisonLabel)}
- Eligible changed files: ${changes.length}
- Excluded sensitive/generated paths: ${excludedCount}
- Lockfiles summarized without raw content: ${lockfiles.length}
- Validation: ${passed} passed, ${failed} failed
- Generated-output secret scan: ${securityLeakageDetected ? "BLOCKER" : "PASS"}

## Git Diff Stat

\`\`\`text
${stat}
\`\`\`

See changed-files.md, validation-results.md, architecture-impact.md, codex-report.md, and git.diff for review evidence.
`;
}

function renderCodexReport({
  changes,
  results,
  comparisonLabel,
  excludedCount,
  securityLeakageDetected,
}) {
  const paths = changes.map((change) => change.path);
  const generatorChanged = paths.includes("scripts/generate-review.mjs");
  const failed = results.filter((result) => !result.passed);
  const warnings = [
    "Architecture and semantic impact are inferred from file paths and require reviewer confirmation.",
    "Recognized credential formats are redacted, but repository policy must still prevent secrets from entering tracked files.",
  ];
  if (excludedCount > 0) {
    warnings.push(`${excludedCount} sensitive or generated path(s) were excluded without exposing their names.`);
  }
  if (failed.length > 0) {
    warnings.push(`Failed validation: ${failed.map((result) => result.command).join(", ")}.`);
  }
  if (results.some((result) => result.recursionDetected)) {
    warnings.push(RECURSION_BLOCKER);
  }
  if (securityLeakageDetected) {
    warnings.push("BLOCKER: A recognized secret pattern remained after output sanitization.");
  }

  const suggestedCommit = generatorChanged
    ? "feat: add local review package generator"
    : "chore: prepare auditable review package";
  const nextUnit = generatorChanged
    ? "Complete the deferred Phase 2 Unit 2 developer tooling foundation, then proceed to canonical Zod schemas."
    : "Confirm the next smallest unit recorded in context/06-progress-tracker.md."

  return `# Codex Report

## Unit Goal

${generatorChanged ? "Create a compact, auditable local review-package generator." : `Review repository changes against ${markdownPath(comparisonLabel)}.`}

## Completed Work

- Collected branch, commit, changed-file, diff-stat, and sanitized full-diff evidence.
- Ran and captured type checking, linting, and production build validation.
- Generated structured architecture and handoff reports.

## Files Modified

- ${changes.length} eligible changed file(s) are listed in changed-files.md.

## Checks Run

${results.map((result) => `- ${markdownPath(result.command)} — ${result.passed ? "PASS" : "FAIL"}`).join("\n")}

## Warnings

${warnings.map((warning) => `- ${warning}`).join("\n")}

## Deferred Work

- Human review of semantic architecture impact and the suggested handoff narrative.
- Product services, persistence, authentication, billing, and AI provider integration remain outside this unit.

## Recommended Next Unit

${nextUnit}

## Suggested Commit Message

${markdownPath(suggestedCommit)}
`;
}

function getLatestCommit(root) {
  const format = "%H%x00%h%x00%s%x00%aI";
  const output = requireSuccess(
    runGit(root, ["log", "-1", `--format=${format}`]),
    "Reading the latest commit",
  );
  const [hash, shortHash, subject, date] = output.split("\0");
  return { hash, shortHash, subject, date };
}

function prepareReviewDirectory(root) {
  const reviewDir = resolve(root, ".review");
  if (existsSync(reviewDir) && lstatSync(reviewDir).isSymbolicLink()) {
    throw new Error("Refusing to write through a symlinked .review directory.");
  }
  mkdirSync(reviewDir, { recursive: true });
  return reviewDir;
}

function acquireRunGuard(reviewDir) {
  if (process.env[ACTIVE_RUN_ENV]) {
    throw new Error(RECURSION_BLOCKER);
  }

  const sentinelPath = resolve(reviewDir, ACTIVE_RUN_SENTINEL);
  if (existsSync(sentinelPath)) {
    throw new Error(`${RECURSION_BLOCKER} Active sentinel already exists at .review/${ACTIVE_RUN_SENTINEL}.`);
  }

  const runId = randomUUID();
  writeFileSync(
    sentinelPath,
    JSON.stringify({ pid: process.pid, runId, startedAt: new Date().toISOString() }),
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );
  process.env[ACTIVE_RUN_ENV] = runId;

  let cleaned = false;
  const signalHandlers = new Map();
  const cleanup = () => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    for (const [signal, handler] of signalHandlers) {
      process.off(signal, handler);
    }
    rmSync(sentinelPath, { force: true });
    delete process.env[ACTIVE_RUN_ENV];
  };

  const signalNumbers = { SIGHUP: 1, SIGINT: 2, SIGTERM: 15 };
  for (const [signal, number] of Object.entries(signalNumbers)) {
    const handler = () => {
      cleanup();
      console.error(`BLOCKER: Review generation interrupted by ${signal}.`);
      process.exit(128 + number);
    };
    signalHandlers.set(signal, handler);
    process.once(signal, handler);
  }

  return cleanup;
}

function secureGeneratedFiles(files) {
  const secured = {};
  let leakageDetected = false;

  for (const [filename, content] of Object.entries(files)) {
    const sanitized = sanitizeText(content);
    const findings = detectPotentialSecretLeakage(sanitized);
    if (findings.length > 0) {
      leakageDetected = true;
    }
    secured[filename] = sanitizeText(sanitized);
  }

  return { files: secured, leakageDetected };
}

function writeGeneratedFile(reviewDir, filename, content) {
  if (!GENERATED_FILES.has(filename)) {
    throw new Error(`Refusing to write undeclared review file: ${filename}`);
  }

  const destination = resolve(reviewDir, filename);
  if (dirname(destination) !== reviewDir) {
    throw new Error(`Refusing to write outside .review: ${filename}`);
  }
  if (existsSync(destination) && lstatSync(destination).isSymbolicLink()) {
    throw new Error(`Refusing to overwrite symlinked review file: ${filename}`);
  }

  writeFileSync(destination, content, { encoding: "utf8", mode: 0o600 });
}

export function findRepositoryRoot(startDirectory) {
  return requireSuccess(
    runGit(startDirectory, ["rev-parse", "--show-toplevel"]),
    "Locating the Git repository root",
  );
}

function getBranch(root, hasCommit) {
  const branch = runGit(root, ["branch", "--show-current"]);
  if (branch.status === 0 && branch.stdout.trim()) {
    return branch.stdout.trim();
  }

  const symbolicBranch = runGit(root, ["symbolic-ref", "--short", "HEAD"]);
  if (symbolicBranch.status === 0 && symbolicBranch.stdout.trim()) {
    return symbolicBranch.stdout.trim();
  }

  if (hasCommit) {
    return `detached@${requireSuccess(runGit(root, ["rev-parse", "--short", "HEAD"]), "Reading HEAD")}`;
  }
  return "unborn";
}

export function generateReview(startDirectory = process.cwd()) {
  const root = findRepositoryRoot(startDirectory);
  const reviewDir = prepareReviewDirectory(root);
  const cleanupGuard = acquireRunGuard(reviewDir);

  try {
    const repository = getRepositoryState(root);
    const branch = getBranch(root, repository.hasCommit);
    const { changes, excludedCount } = collectChanges(root, repository.baseRef);
    const { diff, stat, lockfiles } = collectDiff(root, repository.baseRef, changes);
    const results = ["typecheck", "lint", "build"].map((scriptName) =>
      runValidation(root, scriptName),
    );
    const paths = changes.map((change) => change.path);
    let securityLeakageDetected = [
      diff,
      stat,
      branch,
      repository.comparisonLabel,
      repository.latestCommit?.subject ?? "",
      ...results.map((result) => result.output),
    ].some((content) => detectPotentialSecretLeakage(content).length > 0);

    const buildFiles = () => ({
      "summary.md": renderSummary({
        branch: sanitizeText(branch),
        latestCommit: repository.latestCommit,
        comparisonLabel: repository.comparisonLabel,
        changes,
        stat,
        results,
        excludedCount,
        lockfiles,
        securityLeakageDetected,
      }),
      "changed-files.md": renderChangedFiles(
        changes,
        stat,
        repository.comparisonLabel,
        lockfiles,
      ),
      "validation-results.md": renderValidationResults(results),
      "architecture-impact.md": renderArchitectureImpact(paths, excludedCount),
      "codex-report.md": renderCodexReport({
        changes,
        results,
        comparisonLabel: repository.comparisonLabel,
        excludedCount,
        securityLeakageDetected,
      }),
      "git.diff": diff,
    });

    let securedPackage = secureGeneratedFiles(buildFiles());
    if (securedPackage.leakageDetected && !securityLeakageDetected) {
      securityLeakageDetected = true;
      securedPackage = secureGeneratedFiles(buildFiles());
    }

    let writtenCount = 0;
    for (const [filename, content] of Object.entries(securedPackage.files)) {
      writeGeneratedFile(reviewDir, filename, content);
      writtenCount += 1;
    }
    const generationIncomplete = writtenCount !== GENERATED_FILES.size;
    const recursionDetected = results.some((result) => result.recursionDetected);
    const validationFailed = results.some((result) => !result.passed);
    const exitCode = validationFailed || securityLeakageDetected || recursionDetected || generationIncomplete
      ? 1
      : 0;

    const relativeReviewDir = relative(root, reviewDir) || ".review";
    console.log(`Review package generated in ${relativeReviewDir}/`);
    for (const result of results) {
      console.log(`${result.passed ? "PASS" : "FAIL"}: ${result.command}${result.passed ? "" : ` — ${result.diagnostic}`}`);
    }
    if (securityLeakageDetected) {
      console.error("BLOCKER: Generated-output secret scan failed.");
    }
    if (generationIncomplete) {
      console.error("BLOCKER: Review generation is incomplete.");
    }

    return {
      files: securedPackage.files,
      results,
      changes,
      excludedCount,
      lockfiles,
      root,
      exitCode,
      securityLeakageDetected,
      generationIncomplete,
    };
  } finally {
    cleanupGuard();
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    if (process.env[ACTIVE_RUN_ENV]) {
      console.error(RECURSION_BLOCKER);
      process.exitCode = 2;
    } else {
      const result = generateReview();
      process.exitCode = result.exitCode;
    }
  } catch (error) {
    const message = sanitizeText(error instanceof Error ? error.message : error);
    console.error(message.includes("BLOCKER:") ? message : `Review generation failed: ${message}`);
    process.exitCode = 1;
  }
}
