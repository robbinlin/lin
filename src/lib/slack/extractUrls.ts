/**
 * Extracts URLs from Slack message text. Slack auto-wraps links as
 * `<https://example.com>` or `<https://example.com|display text>`, and
 * escapes `&`, `<`, `>` inside them as HTML entities.
 */
export function extractUrlsFromSlackText(text: string): string[] {
  const found = new Set<string>();

  const bracketed = text.matchAll(/<(https?:\/\/[^|>]+)(?:\|[^>]*)?>/g);
  for (const match of bracketed) {
    found.add(unescapeSlackEntities(match[1]));
  }

  const withoutBrackets = text.replace(/<[^>]*>/g, " ");
  const bare = withoutBrackets.matchAll(/https?:\/\/[^\s<>]+/g);
  for (const match of bare) {
    found.add(unescapeSlackEntities(match[0]));
  }

  return Array.from(found);
}

function unescapeSlackEntities(text: string): string {
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
