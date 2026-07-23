import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "OXZI — Project clarity for every AI",
  description: "Turn one project description into a durable, AI-ready source of truth.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar" role="navigation">
          <div className="navbar-brand">
            <Link href="/" className="navbar-brand-icon" aria-label="OXZI Home">O</Link>
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>OXZI</span>
          </div>
          <div className="navbar-right">
            <div className="navbar-org">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Personal
            </div>
            <div className="navbar-status">
              <span className="badge-dot" style={{ background: "var(--accent)", width: "0.375rem", height: "0.375rem", boxShadow: "0 0 0 0.2rem var(--accent-glow)" }} />
              All systems nominal
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
