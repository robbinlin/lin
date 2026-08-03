import { describe, it, expect } from "vitest";
import { detectSourceType, isValidUrl, normalizeUrl } from "./url";

describe("detectSourceType", () => {
  it.each([
    ["https://www.youtube.com/watch?v=abc", "YOUTUBE"],
    ["https://youtu.be/abc", "YOUTUBE"],
    ["https://m.youtube.com/watch?v=abc", "YOUTUBE"],
    ["https://www.tiktok.com/@user/video/123", "TIKTOK"],
    ["https://www.facebook.com/some/post/123", "FACEBOOK"],
    ["https://www.linkedin.com/posts/abc", "LINKEDIN"],
    ["https://scholar.google.com/citations?user=abc", "GOOGLE_SCHOLAR"],
    ["https://example.com/blog/post", "GENERIC_WEB"],
    ["not a url", "GENERIC_WEB"],
  ])("%s -> %s", (url, expected) => {
    expect(detectSourceType(url)).toBe(expected);
  });
});

describe("isValidUrl", () => {
  it("accepts http/https URLs", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
    expect(isValidUrl("http://example.com")).toBe(true);
  });

  it("rejects non-http(s) or malformed input", () => {
    expect(isValidUrl("ftp://example.com")).toBe(false);
    expect(isValidUrl("not a url")).toBe(false);
    expect(isValidUrl("")).toBe(false);
  });
});

describe("normalizeUrl", () => {
  it("trims whitespace and returns a canonical URL string", () => {
    expect(normalizeUrl("  https://example.com/a  ")).toBe("https://example.com/a");
  });
});
