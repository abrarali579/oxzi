import { describe, expect, it } from "vitest";

import { parseEnvironment } from "./env";

describe("environment validation", () => {
  it("accepts an empty optional application URL", () => {
    expect(parseEnvironment({ NEXT_PUBLIC_APP_URL: "" })).toEqual({
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: undefined,
    });
  });

  it("rejects an invalid application URL without exposing values", () => {
    expect(() => parseEnvironment({ NEXT_PUBLIC_APP_URL: "not-a-url" })).toThrow(
      "Invalid environment configuration: NEXT_PUBLIC_APP_URL:",
    );
  });
});
