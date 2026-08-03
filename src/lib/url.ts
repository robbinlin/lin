import type { SourceType } from "@/types";

export function detectSourceType(rawUrl: string): SourceType {
  let hostname: string;
  try {
    hostname = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "GENERIC_WEB";
  }

  if (hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "youtu.be") {
    return "YOUTUBE";
  }
  if (hostname === "tiktok.com" || hostname.endsWith(".tiktok.com")) {
    return "TIKTOK";
  }
  if (hostname === "facebook.com" || hostname.endsWith(".facebook.com") || hostname === "fb.com") {
    return "FACEBOOK";
  }
  if (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")) {
    return "LINKEDIN";
  }
  if (hostname === "scholar.google.com") {
    return "GOOGLE_SCHOLAR";
  }
  return "GENERIC_WEB";
}

export function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const url = new URL(trimmed);
  return url.toString();
}

export function isValidUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
