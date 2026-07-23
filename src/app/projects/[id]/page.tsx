"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";

interface ProjectData {
  id: string;
  title: string;
  brief: string;
  createdAt: string;
  updatedAt: string;
  canonicalState: Record<string, unknown> | null;
  discoveryResult: Record<string, unknown> | null;
  extractionResult: Record<string, unknown> | null;
  generatedFiles: Record<string, string> | null;
}

// ── Loading skeleton ──────────────────────────────────────────

function DetailSkeleton() {
  return (
    <main className="home-shell">
      <section className="hero">
        <div className="brand-mark" aria-hidden="true">O</div>
        <p className="eyebrow">OXZI · Project</p>
        <div style={{ height: "2.5rem", width: "60%", background: "var(--line)", borderRadius: "0.5rem", marginTop: "1rem" }} />
        <div style={{ height: "1rem", width: "40%", background: "var(--line)", borderRadius: "0.5rem", marginTop: "0.75rem" }} />
      </section>
    </main>
  );
}

// ── Loading overlay ───────────────────────────────────────────

function LoadingOverlay({ children, loading }: { children: ReactNode; loading: boolean }) {
  return (
    <div style={{ position: "relative" }}>
      {loading && (
        <div style={{
          position: "absolute", inset: 0, display: "grid", placeItems: "center",
          background: "var(--surface)", borderRadius: "0.75rem", zIndex: 10,
        }}>
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>Loading…</span>
        </div>
      )}
      {children}
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="detail-section">
      <p className="field-error">{message}</p>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry} style={{ marginTop: "0.5rem" }}>
          Retry
        </button>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Divergence state
  const [diverging, setDiverging] = useState(false);
  const [divergenceReport, setDivergenceReport] = useState<Record<string, unknown> | null>(null);
  const [divError, setDivError] = useState<string | null>(null);

  // History state
  const [history, setHistory] = useState<{ version: number; timestamp: string; event: string }[]>([]);
  const [historyVersion, setHistoryVersion] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Visual map state
  const [diagram, setDiagram] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Drift state
  const [driftFindings, setDriftFindings] = useState<Record<string, unknown>[]>([]);
  const [driftSummary, setDriftSummary] = useState<Record<string, number> | null>(null);
  const [driftLoading, setDriftLoading] = useState(false);
  const [driftError, setDriftError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Project not found");
        const data = (await res.json()) as { project: ProjectData };
        if (!cancelled) setProject(data.project);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message ?? "Failed to load project");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  // Load history
  useEffect(() => {
    fetch(`/api/projects/${id}/history`)
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as { history: { version: number; timestamp: string; event: string }[] };
          setHistory(data.history);
          setHistoryVersion(data.history.length);
        }
      })
      .catch(() => { /* silent */ });
  }, [id]);

  // ── Handlers ──────────────────────────────────────────────

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}/generate`, { method: "POST" });
      if (!res.ok) throw new Error("Generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${encodeURIComponent(project?.title ?? "project")}-oxzi-files.zip`;
      a.click();
      URL.revokeObjectURL(url);
      const refresh = await fetch(`/api/projects/${id}`);
      if (refresh.ok) {
        const data = (await refresh.json()) as { project: ProjectData };
        setProject(data.project);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDivergence() {
    setDiverging(true);
    setDivError(null);
    try {
      const res = await fetch(`/api/divergence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Divergence failed");
      }
      const data = (await res.json()) as { report: Record<string, unknown> };
      setDivergenceReport(data.report);
    } catch (err) {
      setDivError(err instanceof Error ? err.message : "Divergence failed");
    } finally {
      setDiverging(false);
    }
  }

  async function handleApproveCandidate(candidateId: string) {
    try {
      const res = await fetch(`/api/projects/${id}/taskcard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      if (!res.ok) throw new Error("Task Card compilation failed");
      setDivergenceReport(null);
      // Refresh project
      const refresh = await fetch(`/api/projects/${id}`);
      if (refresh.ok) {
        const data = (await refresh.json()) as { project: ProjectData };
        setProject(data.project);
      }
    } catch (err) {
      setDivError(err instanceof Error ? err.message : "Failed to create Task Card");
    }
  }

  async function handleLoadMap() {
    setMapLoading(true);
    setMapError(null);
    try {
      const res = await fetch(`/api/projects/${id}/visualize`);
      if (!res.ok) throw new Error("Failed to generate visual map");
      const data = (await res.json()) as { dependencyDiagram: string; featureDiagram: string };
      setDiagram(data.dependencyDiagram);
    } catch (err) {
      setMapError(err instanceof Error ? err.message : "Failed to generate visual map");
    } finally {
      setMapLoading(false);
    }
  }

  async function handleRestoreVersion() {
    if (!confirm(`Restore to version ${historyVersion}? This creates a new version.`)) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/projects/${id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: historyVersion }),
      });
      if (!res.ok) throw new Error("Restore failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setRestoring(false);
    }
  }

  async function handleScanDrift() {
    setDriftLoading(true);
    setDriftError(null);
    try {
      const res = await fetch(`/api/convergence/${id}`);
      if (!res.ok) throw new Error("Drift scan failed");
      const data = (await res.json()) as {
        findings: Record<string, unknown>[];
        summary: Record<string, number>;
      };
      setDriftFindings(data.findings);
      setDriftSummary(data.summary);
    } catch (err) {
      setDriftError(err instanceof Error ? err.message : "Drift scan failed");
    } finally {
      setDriftLoading(false);
    }
  }

  async function handleAcknowledgeDrift(findingId: string) {
    setDriftFindings((prev) =>
      prev.map((f) => (f.id === findingId ? { ...f, acknowledged: true } : f)),
    );
  }

  async function handleDelete() {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  // ── Render ────────────────────────────────────────────────

  if (loading) return <DetailSkeleton />;

  if (error || !project) {
    return (
      <main className="home-shell">
        <section className="hero">
          <p className="field-error">{error ?? "Project not found"}</p>
          <div className="form-actions" style={{ marginTop: "1.5rem" }}>
            <Link href="/" className="btn btn-secondary">Back to projects</Link>
          </div>
        </section>
      </main>
    );
  }

  const hasGenerated = project.generatedFiles !== null;
  const hasCanonical = project.canonicalState !== null;

  return (
    <main className="home-shell">
      <section className="hero project-detail-hero" aria-labelledby="detail-title" style={{ maxWidth: "52rem" }}>
        <div className="brand-mark" aria-hidden="true">O</div>
        <p className="eyebrow">OXZI · Project</p>
        <h1 id="detail-title" style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", maxWidth: "100%" }}>
          {project.title}
        </h1>
        <div className="detail-meta">
          <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
          <span>·</span>
          <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
        </div>

        {/* Brief */}
        {project.brief && (
          <div className="detail-section">
            <h2 className="detail-section-title">Brief</h2>
            <p className="detail-brief">{project.brief}</p>
          </div>
        )}

        {/* Analysis Status */}
        <div className="detail-section">
          <h2 className="detail-section-title">Analysis Status</h2>
          <div className="status-grid">
            <div className={`status-card ${hasCanonical ? "done" : "pending"}`}>
              <span className="status-card-icon">{hasCanonical ? "✅" : "⏳"}</span>
              <span className="status-card-label">Canonical State</span>
            </div>
            <div className={`status-card ${hasGenerated ? "done" : "pending"}`}>
              <span className="status-card-icon">{hasGenerated ? "✅" : "⏳"}</span>
              <span className="status-card-label">Six Files</span>
            </div>
          </div>
        </div>

        {/* Generated Files */}
        {hasGenerated && project.generatedFiles && (
          <div className="detail-section">
            <h2 className="detail-section-title">Generated Files</h2>
            <ul className="file-list">
              {Object.keys(project.generatedFiles).map((name) => (
                <li key={name} className="file-list-item">📄 {name}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Divergent Reasoning ─────────────────────────────── */}
        <div className="detail-section">
          <h2 className="detail-section-title">Divergent Reasoning</h2>
          <LoadingOverlay loading={diverging}>
            <button className="btn btn-primary" onClick={handleDivergence} disabled={diverging}>
              {diverging ? "Analyzing…" : "Run Divergent Reasoning"}
            </button>
          </LoadingOverlay>

          {divError && <ErrorBanner message={divError} />}

          {divergenceReport && (
            <div className="divergence-modal" style={{
              marginTop: "1rem", padding: "1rem", border: "1px solid var(--line)",
              borderRadius: "0.75rem", background: "var(--background)",
            }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>Divergence Report</h3>
              {(divergenceReport.candidates as Array<Record<string, unknown>>)?.map((c: Record<string, unknown>) => (
                <div key={c.id as string} className="divergence-candidate" style={{
                  padding: "0.75rem", marginBottom: "0.5rem",
                  border: "1px solid var(--line)", borderRadius: "0.5rem",
                }}>
                  <p><strong>{c.title as string}</strong></p>
                  <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{c.approach as string}</p>
                  <button className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "0.3rem 0.7rem" }}
                    onClick={() => handleApproveCandidate(c.id as string)}>
                    Approve & Create Task Card
                  </button>
                </div>
              ))}
              <button className="btn btn-secondary" onClick={() => setDivergenceReport(null)}
                style={{ marginTop: "0.5rem" }}>
                Close
              </button>
            </div>
          )}
        </div>

        {/* ── History Timeline ────────────────────────────────── */}
        {history.length > 0 && (
          <div className="detail-section">
            <h2 className="detail-section-title">History (Version {historyVersion} of {history.length})</h2>
            <input
              type="range" min={1} max={history.length} value={historyVersion}
              onChange={(e) => setHistoryVersion(Number(e.target.value))}
              style={{ width: "100%", margin: "0.5rem 0" }}
            />
            <div className="history-detail" style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              {history[historyVersion - 1] && (
                <span>{history[historyVersion - 1]!.event} — {new Date(history[historyVersion - 1]!.timestamp).toLocaleString()}</span>
              )}
            </div>
            <div className="form-actions" style={{ marginTop: "0.5rem" }}>
              <button className="btn btn-secondary" onClick={handleRestoreVersion} disabled={restoring}
                style={{ fontSize: "0.8rem", padding: "0.3rem 0.7rem" }}>
                {restoring ? "Restoring…" : "Restore to this version"}
              </button>
            </div>
          </div>
        )}

        {/* ── Visual Map ────────────────────────────────────────── */}
        <div className="detail-section">
          <h2 className="detail-section-title">Visual Architecture Map</h2>
          <LoadingOverlay loading={mapLoading}>
            <button className="btn btn-primary" onClick={handleLoadMap} disabled={mapLoading}>
              {mapLoading ? "Generating…" : diagram ? "Refresh Map" : "Generate Visual Map"}
            </button>
          </LoadingOverlay>
          {mapError && <ErrorBanner message={mapError} onRetry={handleLoadMap} />}
          {diagram && (
            <div className="mermaid-container" style={{
              marginTop: "1rem", padding: "1rem", background: "var(--surface)",
              border: "1px solid var(--line)", borderRadius: "0.75rem",
              fontFamily: "monospace", fontSize: "0.75rem", overflowX: "auto",
              whiteSpace: "pre", maxHeight: "20rem", overflowY: "auto",
            }}>
              {diagram}
            </div>
          )}
        </div>

        {/* ── Drift Detection ──────────────────────────────────── */}
        <div className="detail-section">
          <h2 className="detail-section-title">Code Drift Detection</h2>
          <LoadingOverlay loading={driftLoading}>
            <button className="btn btn-primary" onClick={handleScanDrift} disabled={driftLoading}>
              {driftLoading ? "Scanning…" : driftFindings.length > 0 ? "Rescan Repository" : "Scan for Drift"}
            </button>
          </LoadingOverlay>
          {driftError && <ErrorBanner message={driftError} onRetry={handleScanDrift} />}
          {driftSummary && (
            <div className="status-grid" style={{ marginTop: "0.75rem" }}>
              <div className={`status-card ${driftSummary.overbuilt > 0 ? "pending" : "done"}`} style={{ padding: "0.5rem", fontSize: "0.85rem" }}>
                <strong>{driftSummary.overbuilt}</strong> overbuilt
              </div>
              <div className={`status-card ${driftSummary.missing > 0 ? "pending" : "done"}`} style={{ padding: "0.5rem", fontSize: "0.85rem" }}>
                <strong>{driftSummary.missing}</strong> missing
              </div>
              <div className={`status-card ${driftSummary.architectureDrift > 0 ? "pending" : "done"}`} style={{ padding: "0.5rem", fontSize: "0.85rem" }}>
                <strong>{driftSummary.architectureDrift}</strong> arch. drift
              </div>
              <div className={`status-card ${driftSummary.outOfScope > 0 ? "pending" : "done"}`} style={{ padding: "0.5rem", fontSize: "0.85rem" }}>
                <strong>{driftSummary.outOfScope}</strong> out-of-scope
              </div>
            </div>
          )}
          {driftFindings.length > 0 && (
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {driftFindings.map((finding) => (
                <div key={finding.id as string} style={{
                  padding: "0.75rem", background: "var(--surface)",
                  border: `1px solid ${finding.acknowledged ? "var(--line)" : "var(--accent)"}`,
                  borderRadius: "0.5rem", fontSize: "0.85rem",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600 }}>{finding.drift as string}</span>
                    <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                      {finding.changeType as string} — {finding.filePath as string}
                    </span>
                  </div>
                  <p style={{ margin: "0.25rem 0", color: "var(--muted)" }}>
                    {finding.detail as string}
                  </p>
                  {(finding.reverseProposal as string) && (
                    <details style={{ marginTop: "0.25rem" }}>
                      <summary style={{ cursor: "pointer", fontSize: "0.75rem", color: "var(--accent)" }}>
                        Reverse Proposal
                      </summary>
                      <pre style={{
                        marginTop: "0.25rem", padding: "0.5rem", fontSize: "0.7rem",
                        background: "rgba(0,0,0,0.03)", borderRadius: "0.25rem",
                        whiteSpace: "pre-wrap", maxHeight: "10rem", overflowY: "auto",
                      }}>
                        {finding.reverseProposal as string}
                      </pre>
                    </details>
                  )}
                  <div className="form-actions" style={{ marginTop: "0.5rem", gap: "0.5rem" }}>
                    {!finding.acknowledged && (
                      <button className="btn btn-secondary"
                        onClick={() => handleAcknowledgeDrift(finding.id as string)}
                        style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}>
                        Acknowledge
                      </button>
                    )}
                    {finding.autoFixable as boolean && (
                      <button className="btn btn-primary"
                        style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}>
                        Auto-Fix
                      </button>
                    )}
                    {(finding.acknowledged as boolean) && (
                      <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Acknowledged</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Actions ──────────────────────────────────────────── */}
        <div className="form-actions" style={{ marginTop: "2rem" }}>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? "Generating…" : hasGenerated ? "Regenerate & Download ZIP" : "Generate Six Files & Download"}
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>Delete project</button>
          <Link href="/" className="btn btn-secondary">Back</Link>
        </div>
      </section>
    </main>
  );
}
