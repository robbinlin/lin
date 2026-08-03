import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { links: true } } },
  });

  return NextResponse.json(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      isSeeded: c.isSeeded,
      count: c._count.links,
    })),
  );
}
