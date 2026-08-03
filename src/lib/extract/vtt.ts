/**
 * Converts WebVTT subtitle text into plain, deduplicated transcript text.
 * yt-dlp's auto-captions repeat overlapping lines across cues, so consecutive
 * duplicate lines are collapsed.
 */
export function parseVtt(vtt: string): string {
  const lines = vtt.split(/\r?\n/);
  const textLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed === "WEBVTT") continue;
    if (trimmed.startsWith("Kind:") || trimmed.startsWith("Language:")) continue;
    if (/^\d+$/.test(trimmed)) continue; // cue index
    if (/\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/.test(trimmed)) continue; // timestamp

    const withoutTags = trimmed.replace(/<[^>]*>/g, "");
    if (!withoutTags) continue;

    textLines.push(withoutTags);
  }

  const deduped: string[] = [];
  for (const line of textLines) {
    if (deduped[deduped.length - 1] !== line) {
      deduped.push(line);
    }
  }

  return deduped.join(" ").replace(/\s+/g, " ").trim();
}
