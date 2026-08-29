import type { ExtractionResult, SourceType } from "@/types";
import { extractYoutube } from "./youtube";
import { extractTiktok } from "./tiktok";
import { extractGeneric } from "./generic";
import { extractManual } from "./manual";
import { extractFacebookPlaywright, isFacebookPlaywrightConfigured } from "./facebookPlaywright";
import { extractVideoWithGemini, isGeminiVideoConfigured } from "./geminiVideo";

// A yt-dlp "no captions" result isn't necessarily useless (it falls back to
// title+description), but it's too thin to summarize well. Below this
// length, it's worth trying Gemini's video understanding instead, if
// configured — see geminiVideo.ts.
const THIN_CONTENT_CHARS = 200;

export { detectSourceType } from "@/lib/url";

export async function extractContent(
  url: string,
  sourceType: SourceType,
  manualText?: string | null,
): Promise<ExtractionResult> {
  try {
    // Manually pasted text always wins, for any source: it's the required
    // path for Facebook/LinkedIn, and an optional override elsewhere — e.g.
    // when yt-dlp can't get past TikTok's anti-bot measures, or a page
    // blocks server-side fetching, the user can paste the content by hand
    // instead of being stuck on a permanent failure.
    if (manualText && manualText.trim()) {
      return extractManual(manualText);
    }

    switch (sourceType) {
      case "YOUTUBE":
      case "TIKTOK": {
        const viaCaptions = sourceType === "YOUTUBE" ? await extractYoutube(url) : await extractTiktok(url);
        const isThin =
          viaCaptions.status === "FAILED" ||
          viaCaptions.status === "PARTIAL" ||
          (viaCaptions.content?.length ?? 0) < THIN_CONTENT_CHARS;
        if (isThin && isGeminiVideoConfigured()) {
          const viaGemini = await extractVideoWithGemini(url, sourceType);
          if (viaGemini.status === "SUCCESS") {
            return { ...viaGemini, title: viaGemini.title ?? viaCaptions.title };
          }
        }
        return viaCaptions;
      }
      case "FACEBOOK": {
        // Opt-in only: falls back to manual paste unless the user has run
        // `npm run facebook:login` to save a reusable session. See
        // facebookPlaywright.ts for the risk disclosure.
        if (isFacebookPlaywrightConfigured()) {
          const result = await extractFacebookPlaywright(url);
          if (result.status === "SUCCESS") return result;
        }
        return extractManual(manualText);
      }
      case "LINKEDIN":
        return extractManual(manualText);
      case "GOOGLE_SCHOLAR":
      case "GENERIC_WEB":
        return await extractGeneric(url);
      default:
        return await extractGeneric(url);
    }
  } catch (err) {
    return {
      status: "FAILED",
      content: null,
      title: null,
      error: err instanceof Error ? err.message.slice(0, 300) : "Extraction failed unexpectedly",
    };
  }
}
