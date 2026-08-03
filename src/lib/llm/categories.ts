import { prisma } from "@/lib/db";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");
}

export async function listCategoryNames(): Promise<string[]> {
  const categories = await prisma.category.findMany({ select: { name: true } });
  return categories.map((c) => c.name);
}

/**
 * Case-insensitive find-or-create, used when the LLM proposes a new category.
 * SQLite has no portable case-insensitive filter in Prisma, so the match is
 * done in JS against the (small) full category list.
 */
export async function findOrCreateCategory(name: string): Promise<{ id: string; name: string }> {
  const trimmed = name.trim();
  const all = await prisma.category.findMany({ select: { id: true, name: true } });
  const existing = all.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;

  return prisma.category.create({
    data: { name: trimmed, slug: slugify(trimmed), isSeeded: false },
  });
}
