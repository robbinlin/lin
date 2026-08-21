/**
 * One-time interactive setup for Facebook content extraction via Playwright.
 *
 * Opens a real, visible browser window. You log in yourself, by hand, on
 * Facebook's own login page — this script never sees or handles your
 * password. Once you're logged in, press Enter in this terminal and the
 * browser's session (cookies) is saved to a local file that the app's
 * Facebook extractor reuses on later requests.
 *
 * ⚠️ Read this before running:
 * - Using an automated browser with your logged-in session to fetch pages
 *   is against Facebook's Terms of Service. Facebook may detect, rate-limit,
 *   or restrict the account this way. Consider using a secondary account
 *   you don't mind losing access to, rather than your primary one.
 * - The saved session file contains live login cookies — treat it like a
 *   password. It's gitignored so it won't be committed, but don't copy it
 *   anywhere else or share it.
 * - Sessions expire. When Facebook extraction starts failing again with a
 *   "session expired" style error, just re-run this script.
 *
 * Usage: npm run facebook:login
 */
// Standalone tsx scripts don't get .env auto-loaded the way `next dev`/`build`
// does — load it explicitly so FACEBOOK_SESSION_PATH etc. are respected.
import "dotenv/config";
import { chromium } from "playwright";
import { createInterface } from "node:readline/promises";

const SESSION_PATH = process.env.FACEBOOK_SESSION_PATH || "./facebook-session.json";

async function main() {
  console.log("Opening a browser window — log in to Facebook yourself, then come back here.");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://www.facebook.com/login");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await rl.question("\nOnce you're logged in and can see your Facebook feed, press Enter here to save the session... ");
  rl.close();

  await context.storageState({ path: SESSION_PATH });
  await browser.close();

  console.log(`\nSaved session to ${SESSION_PATH}.`);
  console.log("Facebook links should now attempt automatic extraction before falling back to manual paste.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
