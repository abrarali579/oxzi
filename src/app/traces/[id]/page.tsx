"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface SpanData {
  id: string;
  traceId: string;
  parentSpanId: string | null;
  name: string;
  kind: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

interface TraceData {
  id: string;
  projectId: string;
  taskCardId: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  tags: string[];
}

function SpanRow({ span, depth }: { span: SpanData; depth: number }) {
  const duration = span.endedAt
    ? `${Math.round((new Date(span.endedAt).getTime() - new Date(span.startedAt).getTime()) / 1000 * 100) / 100}s`
    : "running";

  return (
    <div className="span-row" style={{
      padding: "0.5rem 0.75rem", marginLeft: `${depth * 1.5}rem`,
      borderLeft: "2px solid var(--line)", marginBottom: "0.25rem",
      borderRadius: "0 0.5rem 0.5rem 0",
      background: "var(--surface)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{span.name}</span>
        <span className={`trace-status trace-status-${span.status}`}
          style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem" }}>
          {span.status}
        </span>
      </div>
      <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.25rem" }}>
        <span>Duration: {duration}</span>
        {span.inputTokens !== null && <span> · Input: {span.inputTokens} tokens</span>}
        {span.outputTokens !== null && <span> · Output: {span.outputTokens} tokens</span>}
      </div>
    </div>
  );
}

export default function TraceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [trace, setTrace] = useState<TraceData | null>(null);
  const [spans, setSpans] = useState<SpanData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/traces/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Trace not found");
        const data = (await res.json()) as { trace: TraceData; spans: SpanData[] };
        setTrace(data.trace);
        setSpans(data.spans);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="home-shell">
        <section className="hero"><p className="hero-copy">Loading trace…</p></section>
      </main>
    );
  }

  if (!trace) {
    return (
      <main className="home-shell">
        <section className="hero">
          <p className="field-error">Trace not found</p>
          <Link href="/traces" className="btn btn-secondary" style={{ marginTop: "1rem" }}>Back to traces</Link>
        </section>
      </main>
    );
  }

  const duration = trace.endedAt
    ? `${Math.round((new Date(trace.endedAt).getTime() - new Date(trace.startedAt).getTime()) / 1000 * 100) / 100}s`
    : "running";

  // Build span hierarchy
  const rootSpans = spans.filter((s) => !s.parentSpanId);
  const childSpans = (parentId: string): SpanData[] =>
    spans.filter((s) => s.parentSpanId === parentId);

  function renderSpanTree(span: SpanData, depth = 0): React.ReactNode {
    return (
      <div key={span.id}>
        <SpanRow span={span} depth={depth} />
        {childSpans(span.id).map((child) => renderSpanTree(child, depth + 1))}
      </div>
    );
  }

  return (
    <main className="home-shell">
      <section className="hero" style={{ maxWidth: "52rem" }}>
        <div className="brand-mark" aria-hidden="true">O</div>
        <p className="eyebrow">OXZI · Trace Detail</p>
        <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", maxWidth: "100%" }}>
          {trace.taskCardId}
        </h1>

        <div className="detail-meta">
          <span>Status: <strong>{trace.status}</strong></span>
          <span>·</span>
          <span>Duration: {duration}</span>
          <span>·</span>
          <span>Started: {new Date(trace.startedAt).toLocaleString()}</span>
        </div>

        {trace.tags.length > 0 && (
          <div className="trace-tags" style={{ marginTop: "0.75rem" }}>
            {trace.tags.map((tag) => (
              <span key={tag} className="trace-tag">{tag}</span>
            ))}
          </div>
        )}

        <div className="detail-section">
          <h2 className="detail-section-title">Spans</h2>
          {rootSpans.length === 0 ? (
            <p className="hero-copy" style={{ margin: "0.5rem 0", fontSize: "0.9rem" }}>No spans recorded.</p>
          ) : (
            rootSpans.map((span) => renderSpanTree(span))
          )}
        </div>

        <div className="form-actions" style={{ marginTop: "2rem" }}>
          <Link href="/traces" className="btn btn-secondary">Back to traces</Link>
          <Link href="/" className="btn btn-secondary">Home</Link>
        </div>
      </section>
    </main>
  );
}
