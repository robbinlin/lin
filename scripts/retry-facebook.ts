/**
 * Re-runs the extraction+summarize pipeline for existing Facebook links that
 * are stuck at NEEDS_MANUAL or FAILED — e.g. ones imported before Facebook
 * Playwright extraction (`npm run facebook:login`) was set up.
 *
 * Each link goes through the exact same `processLink()` used by
 * POST /api/links and the retry button on /item/[id]: FACEBOOK links try the
 * Playwright session first (if configured) and fall back to whatever they
 * had before (still NEEDS_MANUAL/FAILED) if that doesn't work out. Nothing
 * is skipped or overwritten destructively — a link that still can't be
 * extracted just keeps its existing status.
 *
 * Usage:
 *   npm run retry:facebook
 *   npm run retry:facebook -- --limit 20   # sanity-check a small batch first
 *   npm run retry:facebook -- --delay 3000 # slower, gentler pacing
 */
// Standalone tsx scripts don't get .env auto-loaded the way `next dev`/`build`
// does — load it explicitly so ANTHROPIC_API_KEY etc. are set before the
// modules below (db.ts, summarize.ts) read process.env at import time.
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { processLink } from "../src/lib/pipeline";
import { isFacebookPlaywrightConfigured } from "../src/lib/extract/facebookPlaywright";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv: string[]) {
  const args = { limit: Infinity, delay: 2000 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit") args.limit = Number(argv[++i]);
    else if (argv[i] === "--delay") args.delay = Number(argv[++i]);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!isFacebookPlaywrightConfigured()) {
    console.log(
      "⚠️  No Facebook session found (facebook-session.json missing).\n" +
        "   Run `npm run facebook:login` first, otherwise these will just\n" +
        "   fall back to their existing manual-paste flow again.\n"
    );
  }

  const links = await prisma.link.findMany({
    where: { sourceType: "FACEBOOK", extractionStatus: { in: ["NEEDS_MANUAL", "FAILED"] } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${links.length} pending Facebook link(s).`);
  if (Number.isFinite(args.limit)) {
    console.log(`Limiting to the first ${args.limit}.`);
  }

  const counts = { success: 0, stillNeedsManual: 0, stillFailed: 0 };
  const toProcess = links.slice(0, args.limit);

  for (let i = 0; i < toProcess.length; i++) {
    const link = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;

    try {
      await processLink(link.id);
    } catch (err) {
      console.log(`${progress} ❌ unexpected error on ${link.url}:`, err);
    }

    const result = await prisma.link.findUniqueOrThrow({ where: { id: link.id } });
    if (result.extractionStatus === "NEEDS_MANUAL") {
      counts.stillNeedsManual++;
      console.log(`${progress} 📝 still needs manual text: ${link.url}`);
    } else if (result.extractionStatus === "FAILED") {
      counts.stillFailed++;
      console.log(`${progress} ❌ still failed: ${link.url} — ${result.extractionError}`);
    } else if (result.llmStatus === "SUCCESS") {
      counts.success++;
      console.log(`${progress} ✅ ${result.title ?? link.url}`);
    } else {
      console.log(`${progress} ⚠️  extracted but not summarized: ${link.url} — ${result.llmError ?? ""}`);
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
