import type { Link, Category } from "@/generated/prisma/client";
import type { LinkItem } from "@/types";

export type LinkWithCategories = Link & { categories: Category[] };

export function serializeLink(link: LinkWithCategories): LinkItem {
  return {
    id: link.id,
    url: link.url,
    sourceType: link.sourceType,
    title: link.title,
    manualText: link.manualText,
    extractionStatus: link.extractionStatus,
    extractionError: link.extractionError,
    llmStatus: link.llmStatus,
    llmError: link.llmError,
    summary: link.summary,
    keyPoints: link.keyPoints ? (JSON.parse(link.keyPoints) as string[]) : [],
    tags: link.tags ? (JSON.parse(link.tags) as string[]) : [],
    language: link.language,
    categories: link.categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  };
}
