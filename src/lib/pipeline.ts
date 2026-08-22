import { prisma } from "@/lib/db";
import { detectSourceType, extractContent } from "@/lib/extract";
import { summarizeAndClassify } from "@/lib/llm/summarize";
import { findOrCreateCategory } from "@/lib/llm/categories";

/**
 * Runs extraction + LLM summarization/classification for a Link and persists
 * the result. Never throws — failures are captured as status fields on the row.
 */
export async function processLink(linkId: string): Promise<void> {
  const link = await prisma.link.findUniqueOrThrow({ where: { id: linkId } });

  const extraction = await extractContent(link.url, link.sourceType, link.manualText);

  await prisma.link.update({
    where: { id: linkId },
    data: {
      extractionStatus: extraction.status,
      extractionError: extraction.error ?? null,
      rawContent: extraction.content,
      title: extraction.title ?? link.title,
      extractedAt: new Date(),
    },
  });

  if (extraction.status === "FAILED" || extraction.status === "NEEDS_MANUAL" || !extraction.content) {
    return;
  }

  await summarizeLink(linkId);
}

/**
 * Runs just the LLM summarization/classification step against a Link's
 * already-stored `rawContent`, without re-running extraction. Use this to
 * retry a link whose content was extracted fine but whose summary call
 * failed (e.g. a missing API key) — re-extracting would waste a yt-dlp/
 * Playwright/Readability call and risks clobbering already-good content if
 * the source is flaky the second time around. Never throws — failures are
 * captured as status fields on the row, same as processLink().
 */
export async function summarizeLink(linkId: string): Promise<void> {
  const link = await prisma.link.findUniqueOrThrow({ where: { id: linkId }, include: { categories: true } });

  if (!link.rawContent) {
    return;
  }

  try {
    const result = await summarizeAndClassify({
      url: link.url,
      sourceType: link.sourceType,
      title: link.title,
      content: link.rawContent,
    });

    // Categories picked by the user (at submit time, or via quick-categorize)
    // always win — the LLM's classification only fills one in when the user
    // hasn't chosen any yet.
    let categoryIds = link.categories.map((c) => c.id);
    if (categoryIds.length === 0) {
      const category = await findOrCreateCategory(result.category);
      categoryIds = [category.id];
    }

    await prisma.link.update({
      where: { id: linkId },
      data: {
        llmStatus: "SUCCESS",
        llmError: null,
        summary: result.summary,
        keyPoints: JSON.stringify(result.keyPoints),
        tags: JSON.stringify(result.tags),
        language: result.language,
        categories: { set: categoryIds.map((id) => ({ id })) },
      },
    });
  } catch (err) {
    await prisma.link.update({
      where: { id: linkId },
      data: {
        llmStatus: "FAILED",
        llmError: err instanceof Error ? err.message.slice(0, 500) : "LLM processing failed",
      },
    });
  }
}

export { detectSourceType };
