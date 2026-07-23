import { describe, expect, it } from "vitest";
import { createZipBuffer } from "./zip";

describe("ZIP utility", () => {
  it("creates a valid ZIP buffer from entries", async () => {
    const buffer = await createZipBuffer([
      { path: "hello.txt", content: "Hello, world!" },
      { path: "nested/file.md", content: "# Test" },
    ]);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // ZIP files start with PK signature
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  it("handles a single entry", async () => {
    const buffer = await createZipBuffer([{ path: "single.txt", content: "Just one file" }]);
    expect(buffer.length).toBeGreaterThan(20);
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  it("handles empty content", async () => {
    const buffer = await createZipBuffer([{ path: "empty.txt", content: "" }]);
    expect(buffer.length).toBeGreaterThan(20);
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });
});
