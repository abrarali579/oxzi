import {
  tokenLedgerEntrySchema,
  tokenLedgerReportSchema,
  type TokenCount,
  type TokenLedgerEntry,
  type TokenLedgerReport,
} from "./schema";

// ── Token Ledger (ADR-019) ─────────────────────────────────────

const entries: TokenLedgerEntry[] = [];

export function recordMeasurement(
  operation: string,
  tokens: Omit<TokenCount, "grossTokens" | "netTokens"> & {
    grossTokens?: number;
    netTokens?: number;
  },
): void {
  const gross = tokens.grossTokens ?? tokens.input + tokens.output;
  const net = tokens.netTokens ?? gross - (tokens.cacheHits ?? 0);

  const entry = tokenLedgerEntrySchema.parse({
    operation,
    tokens: {
      input: tokens.input,
      output: tokens.output,
      cacheHits: tokens.cacheHits ?? 0,
      cacheMisses: tokens.cacheMisses ?? 0,
      grossTokens: gross,
      overheadTokens: tokens.overheadTokens ?? 0,
      netTokens: net,
      status: tokens.status ?? "character_estimated",
    },
    recordedAt: new Date().toISOString(),
  });

  entries.push(entry);
}

export function getTokenLedgerReport(): TokenLedgerReport {
  return tokenLedgerReportSchema.parse({
    entries,
    totalInput: entries.reduce((s, e) => s + e.tokens.input, 0),
    totalOutput: entries.reduce((s, e) => s + e.tokens.output, 0),
    totalGross: entries.reduce((s, e) => s + e.tokens.grossTokens, 0),
    totalOverhead: entries.reduce((s, e) => s + e.tokens.overheadTokens, 0),
    totalNet: entries.reduce((s, e) => s + e.tokens.netTokens, 0),
    totalCacheHits: entries.reduce((s, e) => s + e.tokens.cacheHits, 0),
    totalCacheMisses: entries.reduce((s, e) => s + e.tokens.cacheMisses, 0),
  });
}

export function clearTokenLedger(): void {
  entries.length = 0;
}
