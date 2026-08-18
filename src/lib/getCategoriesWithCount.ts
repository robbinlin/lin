import { prisma } from "@/lib/db";
import type { CategoryWithCount } from "@/types";

export async function getCategoriesWithCount(): Promise<CategoryWithCount[]> {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { links: true } } },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    isSeeded: c.isSeeded,
    count: c._count.links,
  }));
}
