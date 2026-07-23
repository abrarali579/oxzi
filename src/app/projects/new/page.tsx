"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, useRef, useEffect } from "react";

export default function NewProjectPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.max(ta.scrollHeight, 128)}px`;
    }
  }, [brief]);

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
    <main className="page-shell">
      <div className="card">
        <div className="brand-mark" aria-hidden="true">O</div>
        <p className="eyebrow">OXZI · New Project</p>
        <h1 className="page-title">Tell OXZI what you are building.</h1>
        <p className="page-copy">A rough idea or full master prompt both work.</p>

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
              ref={textareaRef}
              className="field-input field-textarea"
              placeholder="Describe what you are building — goals, features, constraints..."
              rows={5}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              disabled={saving}
            />
          </label>

          {error && <p className="field-error">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
              {saving ? (
                <>
                  <span className="spinner" style={{ width: "0.875rem", height: "0.875rem", borderWidth: "2px" }} />
                  Creating…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Create project
                </>
              )}
            </button>
            <Link href="/" className="btn btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
