export default function HomePage() {
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
        <div className="status" role="status">
          <span className="status-dot" aria-hidden="true" />
          Phase 2 foundation is ready
        </div>
      </section>
    </main>
  );
}
