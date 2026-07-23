"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import MermaidDiagram from "@/app/components/MermaidDiagram";

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

// ── Helpers ────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ── Loading skeleton ───────────────────────────────────────

function DetailSkeleton() {
  return (
    <main className="page-shell">
      <div className="card">
        <div className="brand-mark" aria-hidden="true">O</div>
        <p className="eyebrow" style={{ visibility: "hidden" }}>OXZI · Project</p>
        <div className="skeleton skeleton-line skeleton-line-sm" style={{ marginTop: "0.75rem" }} />
        <div className="skeleton skeleton-line skeleton-line-xs" style={{ marginTop: "0.5rem" }} />
        <div className="skeleton skeleton-line" style={{ marginTop: "1.5rem", width: "90%" }} />
        <div className="skeleton skeleton-line" style={{ width: "75%" }} />
      </div>
    </main>
  );
}

// ── Error banner ───────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-banner" style={{ marginTop: "0.75rem" }}>
      <p style={{ margin: 0, fontSize: "0.8125rem" }}>{message}</p>
      {onRetry && (
        <button className="btn btn-xs btn-danger" onClick={onRetry} style={{ marginTop: "0.5rem" }}>
          Retry
        </button>
      )}
    </div>
  );
}

// ── Loading overlay ────────────────────────────────────────

function LoadingOverlay({ children, loading, label = "Loading…" }: { children: ReactNode; loading: boolean; label?: string }) {
  return (
    <div className="loading-overlay">
      {loading && (
        <div className="loading-overlay-mask">
          <div className="loading-spinner">
            <span className="spinner" />
            {label}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────

type BadgeVariant = "green" | "amber" | "red" | "cyan" | "blue" | "muted";

function StatusBadge({ variant = "muted", label, dot = true }: { variant?: BadgeVariant; label: string; dot?: boolean }) {
  return (
    <span className={`badge badge-${variant}`}>
      {dot && <span className="badge-dot" />}
      {label}
    </span>
  );
}

// ── Pipeline visualizer ────────────────────────────────────

type PipelineStatus = "idle" | "active" | "done" | "warning" | "error";

interface PipelineStep {
  icon: string;
  label: string;
  status: PipelineStatus;
}

function PipelineVisualizer({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="pipeline">
      {steps.map((step, i) => (
        <div key={step.label} className="pipeline-step">
          <div className={`pipeline-node ${step.status !== "idle" ? step.status : ""}`}>
            {step.status === "done" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              step.icon
            )}
          </div>
          <span className="pipeline-label">{step.label}</span>
          {i < steps.length - 1 && (
            <div className="pipeline-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Code inspector card ────────────────────────────────────

function CodeCard({ title, children, defaultCollapsed = false, fileName }: {
  title: string; children: string; defaultCollapsed?: boolean; fileName?: string;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    copyToClipboard(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [children]);

  return (
    <div className="code-card">
      <div className="code-card-header">
        <span className="code-card-title">{fileName ? `${fileName} — ` : ""}{title}</span>
        <div className="code-card-actions">
          <button className="btn btn-xs btn-ghost" onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand" : "Collapse"}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <button className="btn btn-xs btn-ghost" onClick={handleCopy} title="Copy">
            {copied ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <div className={`code-card-body ${collapsed ? "collapsed" : ""}`}>
        {children}
      </div>
      {collapsed && (
        <div style={{ textAlign: "center", padding: "0.25rem 0 0.5rem" }}>
          <button className="btn btn-xs btn-ghost" onClick={() => setCollapsed(false)}>
            Show more
          </button>
        </div>
      )}
      {copied && <div className="copy-toast">Copied!</div>}
    </div>
  );
}

// ── Detail section header ──────────────────────────────────

function SectionTitle({ icon, label }: { icon?: string; label: string }) {
  return (
    <h2 className="detail-section-title">
      {icon && <span className="detail-section-title-icon">{icon}</span>}
      {label}
    </h2>
  );
}

// ── Main page ──────────────────────────────────────────────

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

  // Extraction review state (ADR-086)
  const [extractionUpdates, setExtractionUpdates] = useState<Record<string, unknown>[]>([]);
  const [extractionLoading, setExtractionLoading] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [approvedUpdateIds, setApprovedUpdateIds] = useState<Set<string>>(new Set());
  const [applyingUpdates, setApplyingUpdates] = useState(false);

  // Pipeline state (Task 3)
  const [pipelineResult, setPipelineResult] = useState<Record<string, unknown> | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

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

  // ── Handlers ────────────────────────────────────────────

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

  function handleAcknowledgeDrift(findingId: string) {
    setDriftFindings((prev) =>
      prev.map((f) => (f.id === findingId ? { ...f, acknowledged: true } : f)),
    );
  }

  // ── Extraction Review (ADR-086 Phase 1) ──────────────────

  async function handleLoadExtraction() {
    setExtractionLoading(true);
    setExtractionError(null);
    try {
      const res = await fetch(`/api/projects/${id}/generate`, { method: "POST" });
      if (!res.ok) throw new Error("Extraction failed");
      // Re-fetch project to get stored extractionResult
      const refresh = await fetch(`/api/projects/${id}`);
      if (!refresh.ok) throw new Error("Failed to reload project");
      const data = (await refresh.json()) as { project: ProjectData };
      setProject(data.project);
      if (data.project.extractionResult) {
        const extraction = data.project.extractionResult as { updates?: Record<string, unknown>[] };
        const updates = (extraction.updates ?? []).filter(
          (u) => u.disposition === "proposed",
        );
        setExtractionUpdates(updates);
        setApprovedUpdateIds(new Set(updates.map((u) => u.updateId as string)));
      }
    } catch (err) {
      setExtractionError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtractionLoading(false);
    }
  }

  function toggleUpdateApproval(updateId: string) {
    setApprovedUpdateIds((prev) => {
      const next = new Set(prev);
      if (next.has(updateId)) next.delete(updateId);
      else next.add(updateId);
      return next;
    });
  }

  async function handleApplyExtraction() {
    if (approvedUpdateIds.size === 0) return;
    setApplyingUpdates(true);
    setExtractionError(null);
    try {
      const res = await fetch(`/api/projects/${id}/canonical`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedUpdateIds: [...approvedUpdateIds] }),
      });
      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error ?? "Failed to apply updates");
      }
      // Refresh project data
      const refresh = await fetch(`/api/projects/${id}`);
      if (refresh.ok) {
        const data = (await refresh.json()) as { project: ProjectData };
        setProject(data.project);
        setExtractionUpdates([]);
        setApprovedUpdateIds(new Set());
      }
    } catch (err) {
      setExtractionError(err instanceof Error ? err.message : "Failed to apply updates");
    } finally {
      setApplyingUpdates(false);
    }
  }

  // ── Full Pipeline (Task 3) ───────────────────────────────

  async function handleRunPipeline() {
    setPipelineLoading(true);
    setPipelineError(null);
    try {
      const res = await fetch(`/api/projects/${id}/pipeline`, { method: "POST" });
      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error ?? "Pipeline execution failed");
      }
      const data = (await res.json()) as Record<string, unknown>;
      setPipelineResult(data);
    } catch (err) {
      setPipelineError(err instanceof Error ? err.message : "Pipeline failed");
    } finally {
      setPipelineLoading(false);
    }
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

  // ── Compute pipeline status ─────────────────────────────

  const hasCanonical = project?.canonicalState !== null;
  const hasGenerated = project?.generatedFiles !== null;

  const pipelineSteps: PipelineStep[] = [
    { icon: "📋", label: "Specification", status: hasCanonical ? "done" : "active" },
    { icon: "📄", label: "Task Card", status: hasCanonical ? "done" : "idle" },
    { icon: "✅", label: "Certification", status: hasCanonical ? "done" : "idle" },
    { icon: "🔄", label: "Convergence", status: hasGenerated ? "done" : "idle" },
    { icon: "🛂", label: "Passport", status: hasGenerated ? "done" : "idle" },
  ];

  // ── Render ──────────────────────────────────────────────

  if (loading) return <DetailSkeleton />;

  if (error || !project) {
    return (
      <main className="page-shell">
        <div className="card" style={{ textAlign: "center" }}>
          <div className="brand-mark" aria-hidden="true" style={{ margin: "0 auto 2.5rem" }}>O</div>
          <p className="field-error" style={{ fontSize: "0.9375rem" }}>{error ?? "Project not found"}</p>
          <div className="form-actions" style={{ justifyContent: "center" }}>
            <Link href="/" className="btn btn-primary">Back to projects</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell page-shell-wide">
      <div className="card-wide">
        {/* ── Header ──────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: "0.5rem" }}>OXZI · Project Workspace</p>
            <h1 className="page-title" style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", maxWidth: "100%" }}>
              {project.title}
            </h1>
            <div className="detail-meta">
              <span>Created {formatDate(project.createdAt)}</span>
              <span className="detail-meta-sep">·</span>
              <span>Updated {formatDate(project.updatedAt)}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0, flexWrap: "wrap" }}>
            <StatusBadge variant={hasCanonical ? "green" : "amber"} label={hasCanonical ? "Active" : "Pending"} />
            {driftSummary && driftSummary.architectureDrift > 0 && (
              <StatusBadge variant="red" label="Drift detected" />
            )}
          </div>
        </div>

        {/* ── Pipeline Visualizer ─────────────────────────── */}
        <div className="detail-section">
          <SectionTitle icon="⚡" label="Pipeline" />
          <PipelineVisualizer steps={pipelineSteps} />
        </div>

        {/* ── Brief ───────────────────────────────────────── */}
        {project.brief && (
          <div className="detail-section">
            <SectionTitle icon="📝" label="Brief" />
            <p className="detail-brief">{project.brief}</p>
          </div>
        )}

        {/* ── Analysis Status ─────────────────────────────── */}
        <div className="detail-section">
          <SectionTitle icon="📊" label="Analysis Status" />
          <div className="status-grid">
            <div className={`status-card ${hasCanonical ? "done" : "pending"}`}>
              <span className="status-card-icon">{hasCanonical ? "✅" : "⏳"}</span>
              <span className="status-card-label">Canonical State</span>
            </div>
            <div className={`status-card ${hasGenerated ? "done" : "pending"}`}>
              <span className="status-card-icon">{hasGenerated ? "✅" : "⏳"}</span>
              <span className="status-card-label">Six Files</span>
            </div>
            <div className={`status-card ${divergenceReport ? "done" : "pending"}`}>
              <span className="status-card-icon">{divergenceReport ? "✅" : "⏳"}</span>
              <span className="status-card-label">Divergence</span>
            </div>
            <div className={`status-card ${driftFindings.length > 0 ? "done" : "pending"}`}>
              <span className="status-card-icon">{driftFindings.length > 0 ? "⚠️" : "⏳"}</span>
              <span className="status-card-label">Drift Scan</span>
            </div>
          </div>
        </div>

        {/* ── Pipeline detail columns ─────────────────────── */}
        <div className="detail-two-col" style={{ marginTop: "1.5rem" }}>
          {/* ── Left column ─────────────────────────────────── */}
          <div className="detail-grid">
            {/* Canonical State */}
            {project.canonicalState && (
              <div className="detail-section" style={{ marginTop: 0 }}>
                <SectionTitle icon="📋" label="Canonical State" />
                <CodeCard title="canonicalState" defaultCollapsed>
                  {JSON.stringify(project.canonicalState, null, 2)}
                </CodeCard>
              </div>
            )}

            {/* Generated Files */}
            {hasGenerated && project.generatedFiles && (
              <div className="detail-section" style={{ marginTop: 0 }}>
                <SectionTitle icon="📁" label="Generated Files" />
                <ul className="file-list">
                  {Object.keys(project.generatedFiles).map((name) => (
                    <li key={name} className="file-list-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── Right column ────────────────────────────────── */}
          <div className="detail-grid">
            {/* Visual Map */}
            <div className="detail-section" style={{ marginTop: 0 }}>
              <SectionTitle icon="🗺️" label="Visual Architecture" />
              <LoadingOverlay loading={mapLoading} label="Generating map…">
                <button className="btn btn-sm btn-primary" onClick={handleLoadMap} disabled={mapLoading}>
                  {mapLoading ? "Generating…" : diagram ? "Refresh Map" : "Generate Visual Map"}
                </button>
              </LoadingOverlay>
              {mapError && <ErrorBanner message={mapError} onRetry={handleLoadMap} />}
              {diagram && (
                <MermaidDiagram chart={diagram} />
              )}
            </div>

            {/* Drift Detection */}
            <div className="detail-section" style={{ marginTop: 0 }}>
              <SectionTitle icon="🔍" label="Code Drift" />
              <LoadingOverlay loading={driftLoading} label="Scanning…">
                <button className="btn btn-sm btn-primary" onClick={handleScanDrift} disabled={driftLoading}>
                  {driftLoading ? "Scanning…" : driftFindings.length > 0 ? "Rescan Repository" : "Scan for Drift"}
                </button>
              </LoadingOverlay>
              {driftError && <ErrorBanner message={driftError} onRetry={handleScanDrift} />}
              {driftSummary && (
                <div className="status-grid" style={{ marginTop: "0.75rem" }}>
                  {(["overbuilt", "missing", "architectureDrift", "outOfScope"] as const).map((key) => (
                    <div key={key} className={`status-card ${driftSummary[key] > 0 ? "pending" : "done"}`} style={{ padding: "0.5rem", fontSize: "0.8125rem" }}>
                      <span className="status-card-icon">{driftSummary[key] > 0 ? "⚠️" : "✅"}</span>
                      <span className="status-card-label">{driftSummary[key]} {key.replace(/([A-Z])/g, " $1").toLowerCase().trim()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Divergent Reasoning ────────────────────────── */}
        <div className="detail-section">
          <SectionTitle icon="🧠" label="Divergent Reasoning" />
          <LoadingOverlay loading={diverging} label="Analyzing…">
            <button className="btn btn-primary" onClick={handleDivergence} disabled={diverging}>
              {diverging ? "Analyzing…" : "Run Divergent Reasoning"}
            </button>
          </LoadingOverlay>

          {divError && <ErrorBanner message={divError} />}

          {divergenceReport && (
            <div style={{ marginTop: "1rem" }}>
              {(divergenceReport.candidates as Array<Record<string, unknown>>)?.map((c: Record<string, unknown>) => (
                <div key={c.id as string} className="candidate-card">
                  <p className="candidate-card-title">{c.title as string}</p>
                  <p className="candidate-card-desc">{c.approach as string}</p>
                  <button className="btn btn-sm btn-accent"
                    onClick={() => handleApproveCandidate(c.id as string)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Approve & Create Task Card
                  </button>
                </div>
              ))}
              <button className="btn btn-sm btn-ghost" onClick={() => setDivergenceReport(null)}
                style={{ marginTop: "0.5rem" }}>
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* ── Extraction Review (ADR-086 Phase 1) ──────────── */}
        <div className="detail-section">
          <SectionTitle icon="🔬" label="Extraction Review" />
          <LoadingOverlay loading={extractionLoading} label="Extracting…">
            <button className="btn btn-sm btn-primary" onClick={handleLoadExtraction} disabled={extractionLoading}>
              {extractionLoading ? "Extracting…" : extractionUpdates.length > 0 ? "Re-run Extraction" : "Run Extraction"}
            </button>
          </LoadingOverlay>
          {extractionError && <ErrorBanner message={extractionError} onRetry={handleLoadExtraction} />}

          {extractionUpdates.length > 0 && (
            <div style={{ marginTop: "0.75rem" }}>
              <p style={{ fontSize: "0.8125rem", color: "var(--fg-muted)", marginBottom: "0.5rem" }}>
                Review each extracted field. Toggle off any you want to reject.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", maxHeight: "18rem", overflowY: "auto" }}>
                {extractionUpdates.map((update) => (
                  <div key={update.updateId as string}
                    className="drift-finding"
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0.75rem" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{(update.fieldPath as string)?.replace(/\./g, " › ")}</span>
                      <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "var(--fg-muted)" }}>
                        → {typeof update.value === "string" ? update.value : JSON.stringify(update.value).slice(0, 80)}
                      </span>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.6875rem", cursor: "pointer", flexShrink: 0, marginLeft: "0.5rem" }}>
                      <input
                        type="checkbox"
                        checked={approvedUpdateIds.has(update.updateId as string)}
                        onChange={() => toggleUpdateApproval(update.updateId as string)}
                      />
                      Approve
                    </label>
                  </div>
                ))}
              </div>
              <div className="form-actions" style={{ marginTop: "0.75rem" }}>
                <button className="btn btn-sm btn-accent" onClick={handleApplyExtraction} disabled={applyingUpdates || approvedUpdateIds.size === 0}>
                  {applyingUpdates ? "Applying…" : `Apply ${approvedUpdateIds.size} Approved Update${approvedUpdateIds.size !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Full Pipeline (Task 3) ────────────────────────── */}
        <div className="detail-section">
          <SectionTitle icon="🚀" label="Project Pipeline" />
          <LoadingOverlay loading={pipelineLoading} label="Running pipeline…">
            <button className="btn btn-primary" onClick={handleRunPipeline} disabled={pipelineLoading}>
              {pipelineLoading ? "Running…" : "Run Full Pipeline"}
            </button>
          </LoadingOverlay>
          {pipelineError && <ErrorBanner message={pipelineError} onRetry={handleRunPipeline} />}

          {pipelineResult && (
            <div style={{ marginTop: "0.75rem" }}>
              {/* Governance health */}
              {(pipelineResult.governance as Record<string, unknown>) && (() => {
                const gov = pipelineResult.governance as Record<string, unknown>;
                const health = gov.health as Record<string, unknown> | undefined;
                const readiness = gov.readiness as Record<string, unknown> | undefined;
                const discovery = pipelineResult.discovery as Record<string, unknown> | undefined;
                const discComplete = discovery?.completeness as Record<string, number> | undefined;
                return (
                  <>
                    <div className="status-grid" style={{ marginBottom: "0.75rem" }}>
                      <div className={`status-card ${health?.status === "healthy" ? "done" : "pending"}`}>
                        <span className="status-card-icon">{health?.status === "healthy" ? "✅" : "⚠️"}</span>
                        <span className="status-card-label">Health: {health?.status as string ?? "unknown"}</span>
                      </div>
                      <div className={`status-card ${readiness?.decision === "readiness_recommended" ? "done" : "pending"}`}>
                        <span className="status-card-icon">{readiness?.decision === "readiness_recommended" ? "✅" : "⏳"}</span>
                        <span className="status-card-label">Readiness: {readiness?.decision as string ?? "unknown"}</span>
                      </div>
                    </div>
                    {discovery && (
                      <div style={{ fontSize: "0.8125rem", color: "var(--fg-muted)" }}>
                        <strong>Completeness:</strong> {discComplete?.criticalCompleteness ?? "?"}% critical / {discComplete?.overallCompleteness ?? "?"}% overall
                        {" · "}
                        <strong>Questions:</strong> {discovery.questions as number ?? 0}
                        {" · "}
                        <strong>Updates:</strong> {pipelineResult.extractionUpdateCount as number ?? 0}
                        {" · "}
                        <strong>Warnings:</strong> {(pipelineResult.warnings as string[])?.length ?? 0}
                      </div>
                    )}
                  </>
                );
              })()}
              {/* Warnings */}
              {(pipelineResult.warnings as string[])?.length > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  {(pipelineResult.warnings as string[]).map((w, i) => (
                    <div key={i} className="error-banner" style={{ marginTop: "0.25rem", padding: "0.375rem 0.75rem", fontSize: "0.75rem" }}>
                      ⚠️ {w}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── History Timeline ───────────────────────────── */}
        {history.length > 0 && (
          <div className="detail-section">
            <SectionTitle icon="📜" label={`History (v${historyVersion} of ${history.length})`} />
            <input
              type="range" min={1} max={history.length} value={historyVersion}
              onChange={(e) => setHistoryVersion(Number(e.target.value))}
              className="slider"
              aria-label="History version slider"
            />
            <div className="history-timeline" style={{ marginTop: "0.5rem" }}>
              {history.slice(-5).reverse().map((entry) => (
                <div key={entry.version} className={`history-entry ${entry.version === historyVersion ? "drift-finding unacknowledged" : ""}`}
                  style={{ cursor: "pointer" }} onClick={() => setHistoryVersion(entry.version)}>
                  <span className="history-entry-version">#{entry.version}</span>
                  <span className="history-entry-event">{entry.event}</span>
                  <span className="history-entry-date">{formatDate(entry.timestamp)}</span>
                </div>
              ))}
            </div>
            <div className="form-actions" style={{ marginTop: "0.75rem" }}>
              <button className="btn btn-sm btn-secondary" onClick={handleRestoreVersion} disabled={restoring}>
                {restoring ? "Restoring…" : "Restore to this version"}
              </button>
            </div>
          </div>
        )}

        {/* ── Drift findings detail ───────────────────────── */}
        {driftFindings.length > 0 && (
          <div className="detail-section">
            <SectionTitle icon="📋" label="Drift Findings" />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {driftFindings.map((finding) => (
                <div key={finding.id as string}
                  className={`drift-finding ${!finding.acknowledged ? "unacknowledged" : ""}`}>
                  <div className="drift-finding-header">
                    <span className="drift-finding-label">{finding.drift as string}</span>
                    <span className="drift-finding-meta">
                      <StatusBadge
                        variant={finding.changeType === "overbuilt" ? "amber" : finding.changeType === "architecture_drift" ? "red" : "blue"}
                        label={(finding.changeType as string)?.replace(/_/g, " ")}
                        dot={false}
                      />
                      <span style={{ marginLeft: "0.375rem" }}>{finding.filePath as string}</span>
                    </span>
                  </div>
                  <p className="drift-finding-detail">{finding.detail as string}</p>
                  {(finding.reverseProposal as string) && (
                    <details style={{ marginTop: "0.25rem" }}>
                      <summary style={{ cursor: "pointer", fontSize: "0.75rem", color: "var(--accent)", fontWeight: 600 }}>
                        Reverse Proposal
                      </summary>
                      <pre style={{ marginTop: "0.375rem", whiteSpace: "pre-wrap", fontSize: "0.75rem", lineHeight: 1.5, color: "var(--fg-muted)", background: "var(--bg-surface)", padding: "0.5rem", borderRadius: "6px", maxHeight: "10rem", overflowY: "auto" }}>
                        {finding.reverseProposal as string}
                      </pre>
                    </details>
                  )}
                  <div className="form-actions" style={{ marginTop: "0.5rem" }}>
                    {!finding.acknowledged && (
                      <button className="btn btn-xs btn-secondary"
                        onClick={() => handleAcknowledgeDrift(finding.id as string)}>
                        Acknowledge
                      </button>
                    )}
                    {(finding.acknowledged as boolean) && (
                      <span style={{ fontSize: "0.6875rem", color: "var(--fg-muted)" }}>
                        <StatusBadge variant="green" label="Acknowledged" dot={false} />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Actions ─────────────────────────────────────── */}
        <div className="detail-section" style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem", marginTop: "2rem" }}>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <span className="spinner" style={{ width: "0.875rem", height: "0.875rem", borderWidth: "2px" }} />
                  Generating…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {hasGenerated ? "Regenerate & Download ZIP" : "Generate Six Files & Download"}
                </>
              )}
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete project</button>
            <Link href="/" className="btn btn-ghost">Back</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
