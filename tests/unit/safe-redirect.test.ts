import { describe, it, expect } from "vitest";
import { safeInternalPath } from "@/lib/auth/safe-redirect";

describe("safeInternalPath", () => {
  it("allows normal root-relative paths", () => {
    expect(safeInternalPath("/today", "/fallback")).toBe("/today");
    expect(safeInternalPath("/knowledge-map?tab=x", "/fallback")).toBe(
      "/knowledge-map?tab=x",
    );
  });

  it("falls back for absolute URLs (open-redirect)", () => {
    expect(safeInternalPath("https://evil.com", "/today")).toBe("/today");
    expect(safeInternalPath("http://evil.com/path", "/today")).toBe("/today");
  });

  it("falls back for protocol-relative URLs", () => {
    expect(safeInternalPath("//evil.com", "/today")).toBe("/today");
  });

  it("falls back for backslash tricks", () => {
    expect(safeInternalPath("/\\evil.com", "/today")).toBe("/today");
    expect(safeInternalPath("\\/evil.com", "/today")).toBe("/today");
  });

  it("falls back for control-character injection", () => {
    expect(safeInternalPath("/a\nb", "/today")).toBe("/today");
    expect(safeInternalPath("/a\tb", "/today")).toBe("/today");
  });

  it("falls back for null/undefined/empty", () => {
    expect(safeInternalPath(null, "/today")).toBe("/today");
    expect(safeInternalPath(undefined, "/today")).toBe("/today");
    expect(safeInternalPath("   ", "/today")).toBe("/today");
  });

  it("falls back for non-slash-leading input", () => {
    expect(safeInternalPath("today", "/today")).toBe("/today");
    expect(safeInternalPath("javascript:alert(1)", "/today")).toBe("/today");
  });
});
