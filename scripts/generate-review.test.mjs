import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  describeProcessFailure,
  generateReview,
  isHighEntropyCredentialValue,
  isLockfilePath,
  isSensitivePath,
  parseNameStatus,
  renderArchitectureImpact,
  runProcess,
  sanitizeText,
} from "./generate-review.mjs";

const generatorPath = new URL("./generate-review.mjs", import.meta.url).pathname;
const passingScript = 'node -e "process.exit(0)"';

function write(root, relativePath, contents) {
  const destination = join(root, relativePath);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, contents);
}

function git(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function createRepository({ commit = true, scripts = {}, files = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), "oxzi-review-test-"));
  const packageScripts = {
    typecheck: passingScript,
    lint: passingScript,
    build: passingScript,
    ...scripts,
  };
  write(
    root,
    "package.json",
    `${JSON.stringify(
      {
        name: "review-test-fixture",
        private: true,
        scripts: packageScripts,
      },
      null,
      2,
    )}\n`,
  );
  write(root, "README.md", "fixture\n");
  for (const [relativePath, contents] of Object.entries(files)) {
    write(root, relativePath, contents);
  }

  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Review Test"]);
  git(root, ["config", "user.email", "review@example.invalid"]);
  if (commit) {
    git(root, ["add", "."]);
    git(root, ["commit", "-qm", "root fixture"]);
  }
  return root;
}

function withRepository(options, callback) {
  const root = createRepository(options);
  try {
    return callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
    delete process.env.OXZI_REVIEW_ACTIVE;
  }
}

test("sensitive and generated paths are excluded", () => {
  const sensitivePaths = [
    ".env",
    ".env.local",
    "node_modules/example/index.js",
    ".next/server/app.js",
    ".review/git.diff",
    "config/service-token.json",
    "data/local.sqlite",
    "certificates/private.key",
  ];

  for (const path of sensitivePaths) {
    assert.equal(isSensitivePath(path), true, path);
  }

  assert.equal(isSensitivePath(".review/.gitkeep"), false);
  assert.equal(isSensitivePath("scripts/generate-review.mjs"), false);
  assert.equal(isSensitivePath("src/features/tokenizer/index.ts"), false);
});

test("recognized credentials are redacted from captured text", () => {
  const input = [
    "OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz",
    "authorization: Bearer abcdefghijklmnopqrstuvwxyz",
    "remote=https://user:password@example.com/repository",
    "safe content remains visible",
  ].join("\n");
  const sanitized = sanitizeText(input);

  assert.doesNotMatch(sanitized, /sk-proj-abcdefghijklmnopqrstuvwxyz/);
  assert.doesNotMatch(sanitized, /Bearer abcdefghijklmnopqrstuvwxyz/);
  assert.doesNotMatch(sanitized, /user:password/);
  assert.match(sanitized, /safe content remains visible/);
});

test("Cookie, Set-Cookie, and all Authorization schemes are redacted", () => {
  const sanitized = sanitizeText(
    [
      "Cookie: session=private-cookie",
      "Set-Cookie: session=private-set-cookie; HttpOnly",
      "Authorization: Bearer private-bearer",
      "Authorization: Basic private-basic",
      "Authorization: Digest private-digest",
      "Authorization: API-Key private-api-key",
      "Authorization: CustomScheme private-custom",
    ].join("\n"),
  );

  for (const secret of [
    "private-cookie",
    "private-set-cookie",
    "private-bearer",
    "private-basic",
    "private-digest",
    "private-api-key",
    "private-custom",
  ]) {
    assert.doesNotMatch(sanitized, new RegExp(secret));
  }
  assert.equal((sanitized.match(/\[REDACTED\]/g) ?? []).length, 7);
});

test("Docker auth and credential-key values are redacted", () => {
  const highEntropy = "Q7vN2xP9kL4mR8sT6wY3zA5bC1dE0fG";
  const sanitized = sanitizeText(
    [
      `{"auth":"dXNlcjpwYXNzd29yZA=="}`,
      `client_secret=${highEntropy}`,
      `private_key="${highEntropy}"`,
      `session_token: ${highEntropy}`,
    ].join("\n"),
  );

  assert.doesNotMatch(sanitized, /dXNlcjpwYXNzd29yZA==/);
  assert.doesNotMatch(sanitized, new RegExp(highEntropy));
  assert.equal(isHighEntropyCredentialValue(highEntropy), true);
  assert.equal(sanitizeText(sanitized), sanitized);
});

test("ordinary SHAs, UUIDs, integrity hashes, and identifiers remain visible", () => {
  const values = [
    "d5ea6e8f87ba6c4df92865fbbe9c64711c48f727",
    "550e8400-e29b-41d4-a716-446655440000",
    "sha512-AbCdEf0123456789+/AbCdEf0123456789==",
    "generated_identifier_2026_07_22",
  ];
  const input = values.join("\n");

  assert.equal(sanitizeText(input), input);
});

test("recognized lockfiles are classified without classifying ordinary files", () => {
  for (const path of [
    "package-lock.json",
    "npm-shrinkwrap.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "bun.lock",
    "bun.lockb",
    "Cargo.lock",
    "nested/custom.lock",
  ]) {
    assert.equal(isLockfilePath(path), true, path);
  }
  assert.equal(isLockfilePath("src/lockfile.ts"), false);
});

test("NUL-delimited Git name-status output supports renames", () => {
  const parsed = parseNameStatus("M\0README.md\0R100\0old.md\0new.md\0");

  assert.deepEqual(parsed, [
    { path: "README.md", status: "M", rawStatus: "M" },
    {
      path: "new.md",
      previousPath: "old.md",
      status: "R",
      rawStatus: "R100",
    },
  ]);
});

test("architecture impact renderer always emits the required sections", () => {
  const report = renderArchitectureImpact(["scripts/generate-review.mjs", "README.md"]);

  for (const heading of [
    "Affected Domains",
    "Changed Invariants",
    "Schema Impact",
    "API Impact",
    "UI Impact",
    "Security Impact",
    "Documentation Impact",
    "Unresolved Risks",
  ]) {
    assert.match(report, new RegExp(`## ${heading}`));
  }
});

test("spawn errors and timeouts retain actionable diagnostics", () => {
  const missing = runProcess("oxzi-command-that-does-not-exist", [], { timeout: 100 });
  assert.equal(missing.error?.code, "ENOENT");
  assert.match(describeProcessFailure(missing, 100), /Spawn error.*ENOENT/);

  const timedOut = runProcess(process.execPath, ["-e", "setTimeout(() => {}, 1000)"], {
    timeout: 25,
  });
  assert.equal(timedOut.timedOut, true);
  assert.match(describeProcessFailure(timedOut, 25), /Timed out after 25ms/);
});

test("lockfile changes expose counts but never raw lockfile content", () => {
  withRepository({}, (root) => {
    write(root, "package-lock.json", "LOCKFILE_SECRET_MARKER\nsecond line\n");
    const result = generateReview(root);
    const changedFiles = readFileSync(join(root, ".review/changed-files.md"), "utf8");
    const diff = readFileSync(join(root, ".review/git.diff"), "utf8");

    assert.equal(result.exitCode, 0);
    assert.match(changedFiles, /package-lock\.json/);
    assert.match(changedFiles, /Added lines/);
    assert.match(changedFiles, /Dependencies changed/);
    assert.doesNotMatch(diff, /LOCKFILE_SECRET_MARKER/);
    assert.match(diff, /LOCKFILE SUMMARIES — RAW CONTENT EXCLUDED/);
  });
});

test("failing validations are all recorded and produce a nonzero result", () => {
  withRepository(
    {
      scripts: {
        typecheck: "node -e \"console.error('typecheck failed'); process.exit(2)\"",
        lint: passingScript,
        build: "node -e \"console.error('build failed'); process.exit(3)\"",
      },
    },
    (root) => {
      const result = generateReview(root);
      const validation = readFileSync(join(root, ".review/validation-results.md"), "utf8");

      assert.equal(result.exitCode, 1);
      assert.deepEqual(
        result.results.map((item) => item.passed),
        [false, true, false],
      );
      assert.match(validation, /Exited with code 2/);
      assert.match(validation, /Exited with code 3/);
      assert.match(validation, /npm run lint[\s\S]*PASS/);
      assert.equal(existsSync(join(root, ".review/.active-run")), false);
    },
  );
});

test("indirect review recursion is blocked and the sentinel is cleaned", () => {
  withRepository(
    {
      scripts: {
        review: `node ${JSON.stringify(generatorPath)}`,
        typecheck: "npm run review",
      },
    },
    (root) => {
      const result = generateReview(root);
      const validation = readFileSync(join(root, ".review/validation-results.md"), "utf8");

      assert.equal(result.exitCode, 1);
      assert.equal(result.results[0].recursionDetected, true);
      assert.match(validation, /BLOCKER: Review generation recursion detected/);
      assert.equal(existsSync(join(root, ".review/.active-run")), false);
    },
  );
});

test("a root-commit repository uses the empty-tree base and includes working changes", () => {
  withRepository({}, (root) => {
    write(root, "README.md", "fixture\nuncommitted change\n");
    write(root, "untracked.md", "untracked change\n");
    const result = generateReview(root);
    const summary = readFileSync(join(root, ".review/summary.md"), "utf8");
    const changedFiles = readFileSync(join(root, ".review/changed-files.md"), "utf8");

    assert.equal(result.exitCode, 0);
    assert.match(summary, /root commit has no parent/);
    assert.match(changedFiles, /untracked\.md/);
  });
});

test("an unborn repository generates a complete package from working files", () => {
  withRepository({ commit: false }, (root) => {
    write(root, "working.md", "unborn working tree\n");
    const result = generateReview(root);
    const summary = readFileSync(join(root, ".review/summary.md"), "utf8");
    const changedFiles = readFileSync(join(root, ".review/changed-files.md"), "utf8");

    assert.equal(result.exitCode, 0);
    assert.match(summary, /No commit exists \(unborn repository\)/);
    assert.match(summary, /repository has no commits/);
    assert.match(changedFiles, /working\.md/);
    assert.equal(existsSync(join(root, ".review/.active-run")), false);
  });
});
