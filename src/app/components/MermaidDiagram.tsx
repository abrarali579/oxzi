"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Client-side Mermaid diagram renderer.
 * Falls back to displaying the raw source text if rendering fails.
 */
export default function MermaidDiagram({ chart, maxHeight = "24rem" }: { chart: string; maxHeight?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const mermaid = await import("mermaid");
        mermaid.default.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            background: "transparent",
            primaryColor: "#18181b",
            primaryBorderColor: "#34d399",
            primaryTextColor: "#f1f1f3",
            lineColor: "#34d399",
            secondaryColor: "#0d0f12",
            tertiaryColor: "#141619",
          },
        });

        if (containerRef.current && !cancelled) {
          const { svg } = await mermaid.default.render("mermaid-svg-" + Math.random().toString(36).slice(2), chart);
          containerRef.current.innerHTML = svg;
          if (!cancelled) setRendered(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render diagram");
        }
      }
    }
    render();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return <RawDiagram chart={chart} />;
  }

  return (
    <div className="mermaid-container" style={{ maxHeight }}>
      <div ref={containerRef} style={{ minHeight: "4rem" }}>
        {!rendered && <div className="loading-spinner"><span className="spinner" /> Rendering diagram…</div>}
      </div>
    </div>
  );
}

/** Fallback: display raw Mermaid source text */
function RawDiagram({ chart }: { chart: string }): ReactNode {
  return (
    <div className="mermaid-container" style={{ fontSize: "0.625rem", lineHeight: 1.5, fontFamily: "var(--font-mono)", overflow: "auto", maxHeight: "24rem" }}>
      <pre style={{ margin: 0, whiteSpace: "pre" }}>{chart}</pre>
    </div>
  );
}
