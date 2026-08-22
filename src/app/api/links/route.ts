import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectSourceType, isValidUrl, normalizeUrl } from "@/lib/url";
import { processLink } from "@/lib/pipeline";
import { serializeLink } from "@/lib/serialize";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const rawUrl = typeof body.url === "string" ? body.url : "";
  const manualText = typeof body.manualText === "string" ? body.manualText : null;
  const categoryIds = Array.isArray(body.categoryIds)
    ? body.categoryIds.filter((id: unknown): id is string => typeof id === "string")
    : [];

  if (!isValidUrl(rawUrl)) {
    return NextResponse.json({ error: "A valid http(s) URL is required" }, { status: 400 });
  }

  if (categoryIds.length > 0) {
    const found = await prisma.category.findMany({ where: { id: { in: categoryIds } } });
    if (found.length !== categoryIds.length) {
      return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }
  }

  const url = normalizeUrl(rawUrl);
  const sourceType = detectSourceType(url);

  const existing = await prisma.link.findUnique({ where: { url } });
  if (existing) {
    return NextResponse.json({ error: "This URL has already been saved", id: existing.id }, { status: 409 });
  }

  // Categories picked at submit time (e.g. via the quick hashtag picker) are
  // preserved through processLink() below even if extraction/LLM succeeds —
  // see pipeline.ts, which only lets the LLM's classification apply when no
  // category was set yet.
  const link = await prisma.link.create({
    data: {
      url,
      sourceType,
      manualText,
      categories: categoryIds.length > 0 ? { connect: categoryIds.map((id: string) => ({ id })) } : undefined,
    },
  });

  await processLink(link.id);

  const result = await prisma.link.findUniqueOrThrow({
    where: { id: link.id },
    include: { categories: true },
  });

  return NextResponse.json(serializeLink(result), { status: 201 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("category");
  const q = searchParams.get("q");
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

  const where: Record<string, unknown> = {};
  if (categorySlug) {
    where.categories = { some: { slug: categorySlug } };
  }
  if (status) {
    where.extractionStatus = status;
  }
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { summary: { contains: q } },
      { rawContent: { contains: q } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.link.findMany({
      where,
      include: { categories: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.link.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map(serializeLink),
    page,
    limit,
    total,
  });
}
