"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface UserInfo {
  id: string;
  email: string;
  name: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [orgs, setOrgs] = useState<OrgInfo[]>([]);
  const [projects, setProjects] = useState<{ id: string; title: string; updatedAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) throw new Error("Not authenticated");
        const data = (await res.json()) as { user: UserInfo; organizations: OrgInfo[] };
        setUser(data.user);
        setOrgs(data.organizations);
        if (data.organizations.length > 0) {
          return fetch(`/api/projects?organizationId=${data.organizations[0]!.id}`);
        }
        return null;
      })
      .then(async (res) => {
        if (res) {
          const data = (await res.json()) as {
            projects: { id: string; title: string; updatedAt: string }[];
          };
          setProjects(data.projects);
        }
      })
      .catch(() => {
        router.push("/auth/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="home-shell">
        <section className="hero">
          <p className="hero-copy">Loading dashboard…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="home-shell">
      <section className="hero" aria-labelledby="dash-title" style={{ maxWidth: "52rem" }}>
        <div className="brand-mark" aria-hidden="true">
          O
        </div>
        <p className="eyebrow">OXZI · Dashboard</p>
        <h1 id="dash-title" style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", maxWidth: "100%" }}>
          {user?.name ?? "Dashboard"}
        </h1>

        <div className="dashboard-meta">
          <span>{user?.email}</span>
          <button
            className="btn btn-secondary"
            onClick={handleLogout}
            style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
          >
            Sign out
          </button>
        </div>

        <div className="detail-section">
          <h2 className="detail-section-title">Organizations</h2>
          {orgs.length === 0 ? (
            <p className="hero-copy" style={{ margin: "0.5rem 0" }}>
              No organizations yet.
            </p>
          ) : (
            <div className="org-list">
              {orgs.map((org) => (
                <div key={org.id} className="org-card">
                  <span className="org-card-name">{org.name}</span>
                  <span className="org-card-role">{org.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="detail-section">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <h2 className="detail-section-title" style={{ margin: 0 }}>
              Projects
            </h2>
            <Link
              href="/projects/new"
              className="btn btn-primary"
              style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
            >
              New project
            </Link>
          </div>
          {projects.length === 0 ? (
            <p className="hero-copy" style={{ margin: "0.5rem 0" }}>
              No projects yet. Create one to get started.
            </p>
          ) : (
            <div className="project-list">
              {projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="project-card">
                  <span className="project-card-title">{p.title}</span>
                  <span className="project-card-date">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
