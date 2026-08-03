import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processLink } from "@/lib/pipeline";
import { serializeLink } from "@/lib/serialize";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const link = await prisma.link.findUnique({ where: { id }, include: { category: true } });
  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(serializeLink(link));
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const manualText = typeof body.manualText === "string" ? body.manualText : undefined;

  const existing = await prisma.link.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (manualText !== undefined) {
    await prisma.link.update({ where: { id }, data: { manualText } });
    await processLink(id);
  }

  const result = await prisma.link.findUniqueOrThrow({ where: { id }, include: { category: true } });
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
