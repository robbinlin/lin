import type { Link, Category } from "@/generated/prisma/client";
import type { LinkItem } from "@/types";

export type LinkWithCategory = Link & { category: Category | null };

export function serializeLink(link: LinkWithCategory): LinkItem {
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
    category: link.category ? { id: link.category.id, name: link.category.name, slug: link.category.slug } : null,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  };
}
