"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Client-side Mermaid diagram renderer.
 * Falls back to displaying the raw source text if rendering fails.
 */
export default function MermaidDiagram({ chart, maxHeight = "24rem" }: { chart: string; maxHeight?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!containerRef.current) return;

      // Reset state
      setError(null);

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

        if (cancelled || !containerRef.current) return;

        // Clear previous content to prevent removeChild conflicts
        containerRef.current.innerHTML = '<div class="loading-spinner"><span class="spinner" /> Rendering diagram…</div>';

        // Use a stable ID so mermaid can manage its own DOM lifecycle
        const id = "oxzi-mermaid-svg";

        const { svg } = await mermaid.default.render(id, chart);
        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = svg;
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
        <div className="loading-spinner"><span className="spinner" /> Rendering diagram…</div>
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
