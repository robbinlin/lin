/**
 * One-off bulk importer: reads a list of URLs (one per line) and feeds each
 * one through the same extraction+summarize pipeline used by POST /api/links
 * and the Slack integration.
 *
 * Idempotent — URLs already saved (matched by the unique `url` column) are
 * skipped, so this is safe to re-run or resume after an interruption.
 *
 * Usage:
 *   npx tsx scripts/bulk-import.ts [file] [--limit N] [--delay MS]
 *
 *   file     Path to the URL list (default: scripts/bulk-import-urls.txt)
 *   --limit  Only process the first N URLs not yet in the database (useful
 *            for a quick sanity check before committing to a big run)
 *   --delay  Milliseconds to wait between items (default: 1500)
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/db";
import { detectSourceType, isValidUrl, normalizeUrl } from "../src/lib/url";
import { processLink } from "../src/lib/pipeline";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv: string[]) {
  const args = { file: "scripts/bulk-import-urls.txt", limit: Infinity, delay: 1500 };
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--delay") args.delay = Number(argv[++i]);
    else positional.push(a);
  }
  if (positional[0]) args.file = positional[0];
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const filePath = path.resolve(process.cwd(), args.file);
  const raw = await readFile(filePath, "utf-8");
  const urls = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  console.log(`Loaded ${urls.length} URLs from ${args.file}`);
  if (Number.isFinite(args.limit)) {
    console.log(`Limiting to the first ${args.limit} new (not-yet-saved) URLs`);
  }

  const counts = { success: 0, partial: 0, failed: 0, needsManual: 0, skipped: 0, invalid: 0 };
  let processed = 0;

  for (let i = 0; i < urls.length; i++) {
    if (processed >= args.limit) {
      console.log(`\nReached --limit ${args.limit}, stopping. Re-run to continue with the rest.`);
      break;
    }

    const rawUrl = urls[i];
    const progress = `[${i + 1}/${urls.length}]`;

    if (!isValidUrl(rawUrl)) {
      console.log(`${progress} ⚠️  invalid URL, skipping: ${rawUrl}`);
      counts.invalid++;
      continue;
    }

    const url = normalizeUrl(rawUrl);
    const existing = await prisma.link.findUnique({ where: { url } });
    if (existing) {
      console.log(`${progress} ⏭  already saved, skipping: ${url}`);
      counts.skipped++;
      continue;
    }

    processed++;
    const sourceType = detectSourceType(url);
    const link = await prisma.link.create({ data: { url, sourceType } });

    try {
      await processLink(link.id);
    } catch (err) {
      console.log(`${progress} ❌ unexpected error on ${url}:`, err);
    }

    const result = await prisma.link.findUniqueOrThrow({ where: { id: link.id } });
    if (result.extractionStatus === "NEEDS_MANUAL") {
      counts.needsManual++;
      console.log(`${progress} 📝 needs manual text: ${url}`);
    } else if (result.extractionStatus === "FAILED") {
      counts.failed++;
      console.log(`${progress} ❌ extraction failed: ${url} — ${result.extractionError}`);
    } else if (result.llmStatus === "SUCCESS") {
      counts.success++;
      console.log(`${progress} ✅ ${result.title ?? url}`);
    } else {
      counts.partial++;
      console.log(`${progress} ⚠️  extracted but not summarized: ${url} — ${result.llmError ?? ""}`);
    }

    if (args.delay > 0 && i < urls.length - 1) {
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
