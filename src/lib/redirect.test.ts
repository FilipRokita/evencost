import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./redirect";

describe("safeRedirectPath", () => {
  it.each(["/dashboard", "/invite/abc123", "/groups/abc?before=2026-10-01", "/groups/abc#top"])(
    "keeps the same-origin path %s",
    (value) => {
      expect(safeRedirectPath(value)).toBe(value);
    },
  );

  it.each([
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/..//evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "evil.com",
    "",
  ])("falls back for %j", (value) => {
    expect(safeRedirectPath(value)).toBe("/dashboard");
  });

  it("accepts an encoded slash as part of the path, not as a new host", () => {
    expect(safeRedirectPath("/%2F%2Fevil.com")).toBe("/%2F%2Fevil.com");
  });
});
