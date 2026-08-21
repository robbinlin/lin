import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import type { ExtractionResult } from "@/types";

const SESSION_PATH = process.env.FACEBOOK_SESSION_PATH || "./facebook-session.json";
const NAV_TIMEOUT_MS = 20_000;

export function isFacebookPlaywrightConfigured(): boolean {
  // turbopackIgnore: this is a runtime-only existence check on a path from
  // an env var — it must not make the bundler trace/include the whole
  // project (see https://nextjs.org/docs/messages/turbopack-dynamic-fs).
  return existsSync(/* turbopackIgnore: true */ SESSION_PATH);
}

/**
 * Reuses a logged-in Facebook session (set up once via
 * `npm run facebook:login`) to render a post/reel/share URL and extract its
 * text. Best-effort: any failure (expired session, login redirect, blocked
 * content, no meaningful text) returns FAILED so the caller can fall back to
 * manual text paste — this never throws.
 */
export async function extractFacebookPlaywright(url: string): Promise<ExtractionResult> {
  if (!isFacebookPlaywrightConfigured()) {
    return {
      status: "FAILED",
      content: null,
      title: null,
      error: "Facebook session not configured (run `npm run facebook:login`)",
    };
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: SESSION_PATH });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    await page.waitForTimeout(2500); // let dynamic content settle

    if (/\/login/.test(page.url())) {
      return {
        status: "FAILED",
        content: null,
        title: null,
        error: "Facebook session expired — re-run `npm run facebook:login`",
      };
    }

    const html = await page.content();
    const title = await page.title().catch(() => null);

    const dom = new JSDOM(html, { url });
    const article = new Readability(dom.window.document).parse();
    const text = article?.textContent?.trim();

    if (!text) {
      return {
        status: "FAILED",
        content: null,
        title: title ?? null,
        error: "Rendered page had no extractable text",
      };
    }

    return { status: "SUCCESS", content: text, title: article?.title ?? title ?? null };
  } catch (err) {
    return {
      status: "FAILED",
      content: null,
      title: null,
      error: err instanceof Error ? err.message.slice(0, 300) : "Playwright extraction failed",
    };
  } finally {
    await browser?.close().catch(() => {});
  }
}
