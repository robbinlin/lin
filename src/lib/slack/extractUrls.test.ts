import { describe, it, expect } from "vitest";
import { extractUrlsFromSlackText } from "./extractUrls";

describe("extractUrlsFromSlackText", () => {
  it("extracts a plain Slack-wrapped link", () => {
    expect(extractUrlsFromSlackText("check this out <https://example.com/a>")).toEqual([
      "https://example.com/a",
    ]);
  });

  it("extracts a Slack-wrapped link with display text", () => {
    expect(
      extractUrlsFromSlackText("<https://example.com/a|Example Article> worth reading"),
    ).toEqual(["https://example.com/a"]);
  });

  it("extracts multiple links from one message", () => {
    const text = "two links: <https://a.com/1> and <https://b.com/2|B>";
    expect(extractUrlsFromSlackText(text)).toEqual(["https://a.com/1", "https://b.com/2"]);
  });

  it("ignores non-URL bracketed tokens like user/channel mentions", () => {
    expect(extractUrlsFromSlackText("hey <@U123ABC> check <https://example.com>")).toEqual([
      "https://example.com",
    ]);
  });

  it("unescapes Slack HTML entities inside the URL", () => {
    expect(
      extractUrlsFromSlackText("<https://example.com/search?a=1&amp;b=2>"),
    ).toEqual(["https://example.com/search?a=1&b=2"]);
  });

  it("falls back to bare URLs not wrapped in angle brackets", () => {
    expect(extractUrlsFromSlackText("no brackets here: https://example.com/bare")).toEqual([
      "https://example.com/bare",
    ]);
  });

  it("returns an empty array when there is no URL", () => {
    expect(extractUrlsFromSlackText("just a note to self, no links")).toEqual([]);
  });

  it("deduplicates the same URL appearing twice", () => {
    expect(
      extractUrlsFromSlackText("<https://example.com/a> again https://example.com/a"),
    ).toEqual(["https://example.com/a"]);
  });
});
