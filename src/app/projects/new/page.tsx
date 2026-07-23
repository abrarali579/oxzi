"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function NewProjectPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), brief: brief.trim() }),
      });

      // Guard: check Content-Type before calling res.json()
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(
          `Server returned non-JSON response (${res.status}): ${text.slice(0, 100)}...`,
        );
      }

      const data = await res.json() as { project?: { id: string }; error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create project");
      }

      if (!data.project?.id) {
        throw new Error("Server did not return a project ID");
      }

      router.push(`/projects/${data.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <main className="home-shell">
      <section className="hero" aria-labelledby="new-title">
        <div className="brand-mark" aria-hidden="true">
          O
        </div>
        <p className="eyebrow">OXZI · New Project</p>
        <h1 id="new-title">Tell OXZI what you are building.</h1>
        <p className="hero-copy">A rough idea or full master prompt both work.</p>

        <form onSubmit={handleSubmit} className="project-form">
          <label className="field">
            <span className="field-label">Project title</span>
            <input
              className="field-input"
              type="text"
              placeholder="e.g. AI Chat Dashboard"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={saving}
            />
          </label>

          <label className="field">
            <span className="field-label">Brief or master prompt</span>
            <textarea
              className="field-input field-textarea"
              placeholder="Describe what you are building — goals, features, constraints..."
              rows={6}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              disabled={saving}
            />
          </label>

          {error && <p className="field-error">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
              {saving ? "Creating…" : "Create project"}
            </button>
            <Link href="/" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
