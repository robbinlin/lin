import type { ExtractionResult } from "@/types";
import { extractViaYtDlp } from "./ytdlp";

export async function extractTiktok(url: string): Promise<ExtractionResult> {
  return extractViaYtDlp(url);
}
