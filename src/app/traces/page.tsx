import { getAllTraces } from "@/domain/observability/capture";

export default function TracesPage() {
  const traces = getAllTraces();

  return (
    <main className="home-shell">
      <section className="hero" aria-labelledby="traces-title" style={{ maxWidth: "52rem" }}>
        <div className="brand-mark" aria-hidden="true">
          O
        </div>
        <p className="eyebrow">OXZI · Observability</p>
        <h1 id="traces-title" style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", maxWidth: "100%" }}>
          Traces
        </h1>

        <div className="detail-section" style={{ marginTop: "2rem" }}>
          <h2 className="detail-section-title">Recent Traces</h2>
          {traces.length === 0 ? (
            <p className="hero-copy" style={{ margin: "0.5rem 0" }}>
              No traces recorded yet. Run an operation to see traces here.
            </p>
          ) : (
            <div className="trace-list">
              {traces.map((trace) => (
                <div key={trace.id} className="trace-card">
                  <div className="trace-card-header">
                    <span className={`trace-status trace-status-${trace.status}`}>
                      {trace.status}
                    </span>
                    <span className="trace-id">{trace.id}</span>
                  </div>
                  <div className="trace-card-meta">
                    <span>Task: {trace.taskCardId}</span>
                    <span>Started: {new Date(trace.startedAt).toLocaleString()}</span>
                  </div>
                  {trace.tags.length > 0 && (
                    <div className="trace-tags">
                      {trace.tags.map((tag) => (
                        <span key={tag} className="trace-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
