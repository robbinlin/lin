import type { ExtractionResult } from "@/types";
import { extractViaYtDlp } from "./ytdlp";

export async function extractYoutube(url: string): Promise<ExtractionResult> {
  return extractViaYtDlp(url);
}
