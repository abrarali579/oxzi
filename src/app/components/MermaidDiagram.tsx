"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Client-side Mermaid diagram renderer.
 * Falls back to displaying the raw source text if rendering fails.
 * Renders a compact thumbnail that expands to a full-size, scrollable
 * modal on click — Mermaid SVGs are scaled to fit the thumbnail width,
 * which makes complex diagrams illegible at small sizes.
 */
export default function MermaidDiagram({ chart, maxHeight = "24rem" }: { chart: string; maxHeight?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!containerRef.current) return;

      // Reset state
      setError(null);
      setSvgMarkup(null);

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

        // Unique id per render so repeated/parallel diagrams on one page don't collide
        const id = `oxzi-mermaid-svg-${Math.random().toString(36).slice(2)}`;

        const { svg } = await mermaid.default.render(id, chart);
        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = svg;
        setSvgMarkup(svg);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render diagram");
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [chart]);

  useEffect(() => {
    if (!expanded) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  if (error) {
    return <RawDiagram chart={chart} />;
  }

  return (
    <>
      <div
        className="mermaid-container mermaid-clickable"
        style={{ maxHeight }}
        onClick={() => svgMarkup && setExpanded(true)}
        role={svgMarkup ? "button" : undefined}
        tabIndex={svgMarkup ? 0 : undefined}
        title={svgMarkup ? "Click to expand" : undefined}
        onKeyDown={(e) => {
          if (svgMarkup && (e.key === "Enter" || e.key === " ")) setExpanded(true);
        }}
      >
        <div ref={containerRef} style={{ minHeight: "4rem" }}>
          <div className="loading-spinner"><span className="spinner" /> Rendering diagram…</div>
        </div>
        {svgMarkup && (
          <span className="mermaid-expand-hint" aria-hidden="true">
            ⤢ Click to expand
          </span>
        )}
      </div>

      {expanded && svgMarkup && (
        <div className="mermaid-modal-overlay" onClick={() => setExpanded(false)}>
          <div className="mermaid-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="mermaid-modal-close"
              onClick={() => setExpanded(false)}
              aria-label="Close expanded diagram"
            >
              ✕
            </button>
            <div className="mermaid-modal-content" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
          </div>
        </div>
      )}
    </>
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
