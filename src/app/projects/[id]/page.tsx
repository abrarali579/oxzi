"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

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
    return () => {
      cancelled = true;
    };
  }, [id]);

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
      // Refresh project data to show generated status
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

  if (loading) {
    return (
      <main className="home-shell">
        <section className="hero">
          <p className="hero-copy">Loading project…</p>
        </section>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="home-shell">
        <section className="hero">
          <p className="field-error">{error ?? "Project not found"}</p>
          <div className="form-actions" style={{ marginTop: "1.5rem" }}>
            <Link href="/" className="btn btn-secondary">
              Back to projects
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const hasGenerated = project.generatedFiles !== null;
  const hasCanonical = project.canonicalState !== null;
  const hasDiscovery = project.discoveryResult !== null;
  const hasExtraction = project.extractionResult !== null;

  return (
    <main className="home-shell">
      <section className="hero project-detail-hero" aria-labelledby="detail-title">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p className="eyebrow">OXZI · Project</p>
            <h1 id="detail-title" style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}>
              {project.title}
            </h1>
          </div>
        </div>

        <div className="detail-meta">
          <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
          <span>·</span>
          <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
        </div>

        {project.brief && (
          <div className="detail-section">
            <h2 className="detail-section-title">Brief</h2>
            <p className="detail-brief">{project.brief}</p>
          </div>
        )}

        <div className="detail-section">
          <h2 className="detail-section-title">Analysis Status</h2>
          <div className="status-grid">
            <div className={`status-card ${hasCanonical ? "done" : "pending"}`}>
              <span className="status-card-icon">{hasCanonical ? "✅" : "⏳"}</span>
              <span className="status-card-label">Canonical State</span>
            </div>
            <div className={`status-card ${hasDiscovery ? "done" : "pending"}`}>
              <span className="status-card-icon">{hasDiscovery ? "✅" : "⏳"}</span>
              <span className="status-card-label">Discovery Analysis</span>
            </div>
            <div className={`status-card ${hasExtraction ? "done" : "pending"}`}>
              <span className="status-card-icon">{hasExtraction ? "✅" : "⏳"}</span>
              <span className="status-card-label">Extraction</span>
            </div>
            <div className={`status-card ${hasGenerated ? "done" : "pending"}`}>
              <span className="status-card-icon">{hasGenerated ? "✅" : "⏳"}</span>
              <span className="status-card-label">Six Files</span>
            </div>
          </div>
        </div>

        {hasGenerated && project.generatedFiles && (
          <div className="detail-section">
            <h2 className="detail-section-title">Generated Files</h2>
            <ul className="file-list">
              {Object.keys(project.generatedFiles).map((name) => (
                <li key={name} className="file-list-item">
                  📄 {name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="field-error">{error}</p>}

        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating
              ? "Generating…"
              : hasGenerated
                ? "Regenerate & Download ZIP"
                : "Generate Six Files & Download"}
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete project
          </button>
          <Link href="/" className="btn btn-secondary">
            Back
          </Link>
        </div>
      </section>
    </main>
  );
}
