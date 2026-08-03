import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import type { ExtractionResult } from "@/types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 20_000;

export async function extractGeneric(url: string): Promise<ExtractionResult> {
  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        status: "FAILED",
        content: null,
        title: null,
        error: `Fetch failed with status ${res.status}`,
      };
    }
    html = await res.text();
  } catch (err) {
    return {
      status: "FAILED",
      content: null,
      title: null,
      error: err instanceof Error ? err.message.slice(0, 300) : "Fetch failed",
    };
  }

  try {
    const dom = new JSDOM(html, { url });
    const article = new Readability(dom.window.document).parse();

    if (!article || !article.textContent || !article.textContent.trim()) {
      return {
        status: "FAILED",
        content: null,
        title: article?.title ?? null,
        error: "Could not extract readable article content from this page",
      };
    }

    return {
      status: "SUCCESS",
      content: article.textContent.trim(),
      title: article.title ?? null,
    };
  } catch (err) {
    return {
      status: "FAILED",
      content: null,
      title: null,
      error: err instanceof Error ? err.message.slice(0, 300) : "Parsing failed",
    };
  }
}
