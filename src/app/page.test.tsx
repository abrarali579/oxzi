import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("OXZI homepage", () => {
  it("renders the core product promise", () => {
    const markup = renderToStaticMarkup(<HomePage />);

    expect(markup).toContain("OXZI · Project Genesis");
    expect(markup).toContain("Describe the project once.");
    expect(markup).toContain("Phase 2 foundation is ready");
  });
});
