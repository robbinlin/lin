import { describe, it, expect } from "vitest";
import { parseVtt } from "./vtt";

describe("parseVtt", () => {
  it("strips headers, timestamps, cue indices, and tags", () => {
    const vtt = `WEBVTT
Kind: captions
Language: en

1
00:00:00.000 --> 00:00:02.000
<c>Hello</c> world

2
00:00:02.000 --> 00:00:04.000
This is a test`;

    expect(parseVtt(vtt)).toBe("Hello world This is a test");
  });

  it("deduplicates consecutive repeated lines from overlapping auto-captions", () => {
    const vtt = `WEBVTT

00:00:00.000 --> 00:00:02.000
Hello world

00:00:01.500 --> 00:00:03.500
Hello world`;

    expect(parseVtt(vtt)).toBe("Hello world");
  });

  it("returns an empty string for empty input", () => {
    expect(parseVtt("")).toBe("");
    expect(parseVtt("WEBVTT\n")).toBe("");
  });
});
