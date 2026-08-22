import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processLink } from "@/lib/pipeline";
import { serializeLink } from "@/lib/serialize";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const link = await prisma.link.findUnique({ where: { id }, include: { categories: true } });
  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(serializeLink(link));
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const manualText = typeof body.manualText === "string" ? body.manualText : undefined;
  // categoryIds lets the UI quick-categorize a link with no extracted content
  // at all (e.g. TikTok/Facebook that couldn't be read) — it's a plain field
  // update (full replace of the tag set), deliberately not routed through
  // processLink().
  const categoryIds = Array.isArray(body.categoryIds)
    ? body.categoryIds.filter((cid: unknown): cid is string => typeof cid === "string")
    : undefined;

  const existing = await prisma.link.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (categoryIds !== undefined) {
    if (categoryIds.length > 0) {
      const found = await prisma.category.findMany({ where: { id: { in: categoryIds } } });
      if (found.length !== categoryIds.length) {
        return NextResponse.json({ error: "Category not found" }, { status: 400 });
      }
    }
    await prisma.link.update({
      where: { id },
      data: { categories: { set: categoryIds.map((cid: string) => ({ id: cid })) } },
    });
  }

  if (manualText !== undefined) {
    await prisma.link.update({ where: { id }, data: { manualText } });
    await processLink(id);
  }

  const result = await prisma.link.findUniqueOrThrow({ where: { id }, include: { categories: true } });
  return NextResponse.json(serializeLink(result));
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.link.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.link.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
