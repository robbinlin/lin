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

  try {
    const result = await summarizeAndClassify({
      url: link.url,
      sourceType: link.sourceType,
      title: extraction.title ?? link.title,
      content: extraction.content,
    });

    // A category picked by the user at submit time (or via quick-categorize)
    // always wins — the LLM's classification only fills in categoryId when
    // nothing was chosen yet.
    let categoryId = link.categoryId;
    if (!categoryId) {
      const category = await findOrCreateCategory(result.category);
      categoryId = category.id;
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
        categoryId,
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
