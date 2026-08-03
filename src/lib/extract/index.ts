import type { ExtractionResult, SourceType } from "@/types";
import { extractYoutube } from "./youtube";
import { extractTiktok } from "./tiktok";
import { extractGeneric } from "./generic";
import { extractManual } from "./manual";

export { detectSourceType } from "@/lib/url";

export async function extractContent(
  url: string,
  sourceType: SourceType,
  manualText?: string | null,
): Promise<ExtractionResult> {
  try {
    switch (sourceType) {
      case "YOUTUBE":
        return await extractYoutube(url);
      case "TIKTOK":
        return await extractTiktok(url);
      case "FACEBOOK":
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
