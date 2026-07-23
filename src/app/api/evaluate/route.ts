import { NextResponse } from "next/server";
import { runTestSuite, runBenchmark } from "@/domain/evaluation/runner";
import { loadBaseline, compareAgainstBaseline, updateBaseline } from "@/domain/evaluation/baseline";
import { getTokenLedgerReport } from "@/domain/evaluation/token-ledger";
import { extractionSuite } from "@/domain/evaluation/suites/extraction.suite";
import { discoverySuite } from "@/domain/evaluation/suites/discovery.suite";
import { contextCompilerSuite } from "@/domain/evaluation/suites/context-compiler.suite";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  // Only authenticated users can run evaluations
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    // Run all test suites
    const extractionResult = await runTestSuite(extractionSuite);
    const discoveryResult = await runTestSuite(discoverySuite);
    const contextResult = await runTestSuite(contextCompilerSuite);

    // Run benchmarks
    const engineInputs: { engine: string; input: unknown }[] = [
      { engine: "discovery", input: discoverySuite.cases[0]!.input },
      { engine: "context_compiler_v1", input: contextCompilerSuite.cases[0]!.input },
    ];

    const benchmarkResults = await Promise.all(
      engineInputs.map((e) => runBenchmark(e.engine, e.input, 3)),
    );

    // Compare against baseline
    const baseline = loadBaseline();
    const regressionReport = compareAgainstBaseline(benchmarkResults, baseline);
    const tokenLedger = getTokenLedgerReport();

    // Update baseline if no regressions
    if (regressionReport.regressions.length === 0 && baseline.entries.length === 0) {
      updateBaseline(benchmarkResults, "1.0.0");
    }

    return NextResponse.json({
      suites: {
        extraction: extractionResult,
        discovery: discoveryResult,
        contextCompiler: contextResult,
      },
      benchmarks: benchmarkResults,
      regressionReport,
      tokenLedger,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Evaluation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
