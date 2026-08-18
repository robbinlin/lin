import { prisma } from "@/lib/db";
import { serializeLink } from "@/lib/serialize";
import { getCategoriesWithCount } from "@/lib/getCategoriesWithCount";
import { ItemCard } from "@/components/ItemCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { SearchBar } from "@/components/SearchBar";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ category?: string; q?: string; page?: string }>;

export default async function LibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const { category, q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (category) where.category = { slug: category };
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { summary: { contains: q } },
      { rawContent: { contains: q } },
    ];
  }

  const [items, total, categoriesWithCount] = await Promise.all([
    prisma.link.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.link.count({ where }),
    getCategoriesWithCount(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold">我的收藏</h1>

      <div className="mt-4 flex flex-col gap-6 md:flex-row">
        <aside className="w-full shrink-0 md:w-48">
          <CategoryFilter categories={categoriesWithCount} />
        </aside>

        <div className="flex-1">
          <SearchBar />

          <div className="mt-4 flex flex-col gap-3">
            {items.length === 0 && (
              <p className="py-10 text-center text-sm text-gray-500">還沒有符合條件的收藏</p>
            )}
            {items.map((item) => (
              <ItemCard key={item.id} item={serializeLink(item)} />
            ))}
          </div>

          {totalPages > 1 && (
            <p className="mt-4 text-center text-xs text-gray-400">
              第 {page} / {totalPages} 頁
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
