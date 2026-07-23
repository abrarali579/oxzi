/**
 * Launch Hardening Report Engine — Step 14
 *
 * Aggregates bench suite results and red-team findings into a
 * versioned LaunchHardeningReport that determines launch readiness.
 */
import { contentFingerprint, type JsonValue } from "../../knowledge-graph";
import {
  launchHardeningReportSchema,
  type BenchSuiteResult,
  type LaunchHardeningReport,
} from "../schemas";

const LAUNCH_HARDENING_REPORT_PREFIX = "launch_harden";

/**
 * Generate the final LaunchHardeningReport from all bench suites
 * and red-team results.
 *
 * @param suites - Results from each bench suite
 * @param redTeamFindings - Count of failed red-team tests
 * @param redTeamTotal - Total red-team tests run
 * @returns A LaunchHardeningReport with READY_FOR_LAUNCH or NEEDS_HARDENING
 */
export function generateLaunchReport(
  suites: BenchSuiteResult[],
  redTeamFailures: number,
  redTeamTotal: number,
): LaunchHardeningReport {
  const totalFixtures = suites.reduce((s, suite) => s + suite.totalFixtures, 0);
  const totalPassed = suites.reduce((s, suite) => s + suite.passed, 0);
  const totalLatencyMs = suites.reduce((s, suite) => s + suite.totalLatencyMs, 0);
  const totalTokens = suites.reduce((s, suite) => s + suite.totalTokens, 0);

  const passRate = totalFixtures > 0 ? Math.round((totalPassed / totalFixtures) * 100) : 0;

  // Token efficiency: higher is better. Baseline: 1 token per char ≈ 0.25 efficiency
  // A well-optimized pipeline should achieve >0.5 efficiency
  const tokenEfficiencyRatio = totalTokens > 0
    ? Math.min(1, Math.round((totalPassed / Math.max(1, totalTokens)) * 1000) / 1000)
    : 0;

  // Red team must have 0 failures
  const redTeamClean = redTeamFailures === 0;

  // All suites must pass at 100%
  const allSuitesPass = suites.every((s) => s.failed === 0);

  const failures: string[] = [];
  if (!allSuitesPass) {
    for (const suite of suites) {
      if (suite.failed > 0) {
        failures.push(`Suite "${suite.suiteName}": ${suite.failed}/${suite.totalFixtures} fixtures failed`);
      }
    }
  }
  if (!redTeamClean) {
    failures.push(`Red-team: ${redTeamFailures}/${redTeamTotal} security tests failed`);
  }
  if (passRate < 100) {
    failures.push(`Overall pass rate ${passRate}% is below 100% threshold`);
  }

  const hardeningStatus = failures.length === 0 ? "READY_FOR_LAUNCH" : "NEEDS_HARDENING";

  const fp = contentFingerprint({
    suites: suites.map((s) => s.suiteName),
    passRate,
    hardeningStatus,
  } as unknown as JsonValue);

  const reportFp = contentFingerprint({
    reportId: `${LAUNCH_HARDENING_REPORT_PREFIX}_${fp.replace("fp_f1_", "").slice(0, 16)}`,
    totalFixtures,
    passRate,
    hardeningStatus,
  } as unknown as JsonValue);

  return launchHardeningReportSchema.parse({
    reportId: `${LAUNCH_HARDENING_REPORT_PREFIX}_${fp.replace("fp_f1_", "").slice(0, 16)}`,
    timestamp: new Date().toISOString(),
    totalFixtures,
    passRate,
    tokenEfficiencyRatio,
    totalLatencyMs: Math.round(totalLatencyMs * 100) / 100,
    suites,
    hardeningStatus,
    failures,
    fingerprint: reportFp,
  });
}
