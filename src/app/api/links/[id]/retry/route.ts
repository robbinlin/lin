import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processLink } from "@/lib/pipeline";
import { serializeLink } from "@/lib/serialize";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.link.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await processLink(id);

  const result = await prisma.link.findUniqueOrThrow({ where: { id }, include: { categories: true } });
  return NextResponse.json(serializeLink(result));
}
