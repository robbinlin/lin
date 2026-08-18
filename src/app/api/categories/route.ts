import { NextResponse } from "next/server";
import { getCategoriesWithCount } from "@/lib/getCategoriesWithCount";

export async function GET() {
  return NextResponse.json(await getCategoriesWithCount());
}
