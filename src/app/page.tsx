import Link from "next/link";
import { listProjects } from "@/lib/db";

export default function HomePage() {
  const projects = listProjects();

  return (
    <main className="page-shell page-shell-wide">
      <div className="card-wide">
        <div className="brand-mark" aria-hidden="true">
          O
        </div>
        <p className="eyebrow">OXZI · Project Genesis</p>
        <h1 className="page-title">Describe the project once.</h1>
        <p className="page-copy">
          OXZI turns your idea into a durable project source of truth, so every AI can plan and
          build from the same decisions.
        </p>

        <div className="form-actions" style={{ marginTop: "2rem" }}>
          <Link href="/projects/new" className="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New project
          </Link>
        </div>

        {projects.length > 0 && (
          <>
            <h2 className="section-heading">Projects</h2>
            <div className="project-list">
              {projects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="project-card">
                  <div className="project-card-left">
                    <span className="project-card-title">{project.title}</span>
                    <span className="project-card-meta">
                      <span>OXZI v1.0</span>
                    </span>
                  </div>
                  <span className="project-card-date">
                    {new Date(project.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
