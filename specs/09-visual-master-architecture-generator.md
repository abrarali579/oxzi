# OXZI — Visual Master Architecture Generator Specification

## Status and Purpose

**Status:** Approved and specified; not implemented.

The Visual Master Architecture Generator creates traceable visual views over one versioned Knowledge Graph projection. It does not maintain an independent diagram dataset and cannot mutate canonical state.

## Supported Future Views

- Executive Master Architecture
- Product capability map
- System architecture
- Data-flow diagram
- User-flow diagram
- Agent workflow
- Implementation roadmap
- Dependency/impact map
- Security boundary map
- Project status infographic

## View Input

- Canonical project version/hash
- Knowledge Graph version/policy and selected subgraph
- View type
- Audience profile
- Detail level
- Optional lifecycle, confidence, domain, or status filters
- Export target

## View-Model Rules

1. Every displayed node and edge references its graph identity and canonical or repository evidence.
2. Filtering changes presentation, never the underlying graph.
3. Low-confidence and unresolved relationships remain visibly distinct.
4. Hidden nodes required to explain a visible dependency are summarized or exposed on demand.
5. Deterministic layout inputs and ordering make identical view requests logically stable; renderer-specific pixel placement may be versioned separately.
6. Security-boundary views cannot omit a relevant trust boundary merely for visual simplicity.
7. Audience/detail filters may reduce explanation but cannot misrepresent scope, blockers, or relationship direction.
8. Visual edits emit proposed canonical or graph changes for validation and approval; they never silently edit the source graph.

## Future Exports

- SVG
- PNG
- PDF
- Mermaid
- Graph JSON

All exports carry canonical and graph version references. Graph JSON is a derived portable view, not an alternate source of truth.

## View-Specific Minimums

- Executive views retain goals, major capabilities, blockers, and status.
- System views retain components, interfaces, data movement, integrations, and trust boundaries.
- User-flow views retain actors, steps, decisions, failures, and outcomes.
- Agent workflow views retain task boundaries, approvals, validation, and review gates.
- Dependency/impact views retain direct and transitive paths with confidence.
- Security views retain protected assets, trust boundaries, authorization, privacy constraints, and unresolved risks.

## Non-Goals

- Free-form source-of-truth diagram editing
- Image-generation providers
- Figma integration
- UI implementation in the architecture-expansion unit
- Canonical or Knowledge Graph persistence

## Acceptance Criteria

- Every supported view is generated from one validated graph contract.
- Traceability is available for every visual node and relationship.
- Tests cover audience/detail filtering without invariant or blocker loss.
- Visual-change proposals require validation and approval.
- Export adapters cannot invent nodes or relationships absent from the view model.

