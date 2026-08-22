/**
 * Re-runs just the summarize+classify step for links that already have
 * extracted content (`rawContent` set) but never got summarized — e.g.
 * anything processed while ANTHROPIC_API_KEY wasn't actually loaded because
 * a standalone script hadn't picked up .env yet (see git history). Covers
 * every source type, not just Facebook.
 *
 * Unlike scripts/retry-facebook.ts, this never re-extracts: it reuses the
 * content already stored in the database, so it can't accidentally replace
 * a good extraction with a failed one on a flaky re-fetch, and it doesn't
 * spend another yt-dlp/Playwright/Readability call per link.
 *
 * Usage:
 *   npm run resummarize
 *   npm run resummarize -- --limit 20   # sanity-check a small batch first
 *   npm run resummarize -- --delay 3000 # slower, gentler pacing
 */
// Standalone tsx scripts don't get .env auto-loaded the way `next dev`/`build`
// does — load it explicitly so ANTHROPIC_API_KEY etc. are set before the
// modules below (db.ts, summarize.ts) read process.env at import time.
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { summarizeLink } from "../src/lib/pipeline";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv: string[]) {
  const args = { limit: Infinity, delay: 1500 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit") args.limit = Number(argv[++i]);
    else if (argv[i] === "--delay") args.delay = Number(argv[++i]);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const links = await prisma.link.findMany({
    where: { rawContent: { not: null }, llmStatus: { not: "SUCCESS" } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${links.length} link(s) with content but no successful summary.`);
  if (Number.isFinite(args.limit)) {
    console.log(`Limiting to the first ${args.limit}.`);
  }

  const counts = { success: 0, stillFailed: 0 };
  const toProcess = links.slice(0, args.limit);

  for (let i = 0; i < toProcess.length; i++) {
    const link = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;

    try {
      await summarizeLink(link.id);
    } catch (err) {
      console.log(`${progress} ❌ unexpected error on ${link.url}:`, err);
    }

    const result = await prisma.link.findUniqueOrThrow({ where: { id: link.id } });
    if (result.llmStatus === "SUCCESS") {
      counts.success++;
      console.log(`${progress} ✅ ${result.title ?? link.url}`);
    } else {
      counts.stillFailed++;
      console.log(`${progress} ❌ still failed: ${link.url} — ${result.llmError ?? ""}`);
    }

    if (args.delay > 0 && i < toProcess.length - 1) {
      await sleep(args.delay);
    }
  }

  console.log("\n=== Done ===");
  console.log(counts);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
