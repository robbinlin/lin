import type { ExtractionResult } from "@/types";

/**
 * Facebook/LinkedIn are login-gated and hostile to server-side fetching, so
 * we never attempt to scrape them. The user pastes the post text instead.
 */
export function extractManual(manualText: string | null | undefined): ExtractionResult {
  const trimmed = manualText?.trim();
  if (!trimmed) {
    return {
      status: "NEEDS_MANUAL",
      content: null,
      title: null,
      error: "This source requires pasting the post text manually",
    };
  }

  return {
    status: "SUCCESS",
    content: trimmed,
    title: null,
  };
}
