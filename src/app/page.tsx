import Link from "next/link";
import { listProjects } from "@/lib/db";

export default function HomePage() {
  const projects = listProjects();

  return (
    <main className="home-shell">
      <section className="hero" aria-labelledby="hero-title">
        <div className="brand-mark" aria-hidden="true">
          O
        </div>
        <p className="eyebrow">OXZI · Project Genesis</p>
        <h1 id="hero-title">Describe the project once.</h1>
        <p className="hero-copy">
          OXZI turns your idea into a durable project source of truth, so every AI can plan and
          build from the same decisions.
        </p>

        <div className="home-actions">
          <Link href="/projects/new" className="btn btn-primary">
            New project
          </Link>
        </div>
      </section>

      {projects.length > 0 && (
        <section className="project-list-section" aria-label="Your projects">
          <h2 className="section-heading">Projects</h2>
          <div className="project-list">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="project-card">
                <span className="project-card-title">{project.title}</span>
                <span className="project-card-date">
                  {new Date(project.updatedAt).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
