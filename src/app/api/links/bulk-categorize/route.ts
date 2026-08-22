import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Adds one or more categories to a batch of links in one call — for
 * sweeping through many uncategorized links at once (e.g. after a bulk
 * import) from the /library multi-select UI. Purely additive: existing
 * categories on each link are left alone, never routed through
 * processLink() since there's no content to (re-)summarize here.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const linkIds = Array.isArray(body.linkIds)
    ? body.linkIds.filter((id: unknown): id is string => typeof id === "string")
    : [];
  const categoryIds = Array.isArray(body.categoryIds)
    ? body.categoryIds.filter((id: unknown): id is string => typeof id === "string")
    : [];

  if (linkIds.length === 0 || categoryIds.length === 0) {
    return NextResponse.json({ error: "linkIds and categoryIds are both required" }, { status: 400 });
  }

  const [foundLinks, foundCategories] = await Promise.all([
    prisma.link.findMany({ where: { id: { in: linkIds } }, select: { id: true } }),
    prisma.category.findMany({ where: { id: { in: categoryIds } } }),
  ]);

  if (foundCategories.length !== categoryIds.length) {
    return NextResponse.json({ error: "Category not found" }, { status: 400 });
  }

  const validLinkIds = foundLinks.map((l) => l.id);

  await Promise.all(
    validLinkIds.map((id) =>
      prisma.link.update({
        where: { id },
        data: { categories: { connect: categoryIds.map((cid: string) => ({ id: cid })) } },
      })
    )
  );

  return NextResponse.json({ updated: validLinkIds.length });
}
