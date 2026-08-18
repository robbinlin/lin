import { describe, it, expect } from "vitest";
import { extractContent } from "./index";
import type { SourceType } from "@/types";

describe("extractContent — manual text override", () => {
  it.each([
    "YOUTUBE",
    "TIKTOK",
    "FACEBOOK",
    "LINKEDIN",
    "GOOGLE_SCHOLAR",
    "GENERIC_WEB",
  ] as SourceType[])(
    "uses the pasted text instead of automated extraction for %s when manualText is provided",
    async (sourceType) => {
      const result = await extractContent(
        "https://example.com/whatever",
        sourceType,
        "  手動貼上的內容  ",
      );

      expect(result).toEqual({
        status: "SUCCESS",
        content: "手動貼上的內容",
        title: null,
      });
    },
  );

  it("falls back to NEEDS_MANUAL for Facebook when no manual text is given", async () => {
    const result = await extractContent("https://www.facebook.com/x", "FACEBOOK", null);
    expect(result.status).toBe("NEEDS_MANUAL");
  });

  it("ignores whitespace-only manual text and falls through to the source's own extractor", async () => {
    const result = await extractContent("https://www.linkedin.com/x", "LINKEDIN", "   ");
    expect(result.status).toBe("NEEDS_MANUAL");
  });
});
