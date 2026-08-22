import { prisma } from "@/lib/db";
import { serializeLink } from "@/lib/serialize";
import { getCategoriesWithCount } from "@/lib/getCategoriesWithCount";
import { LibraryList } from "@/components/LibraryList";
import { CategoryFilter } from "@/components/CategoryFilter";
import { SearchBar } from "@/components/SearchBar";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  category?: string;
  uncategorized?: string;
  q?: string;
  page?: string;
  limit?: string;
}>;

export default async function LibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const { category, uncategorized, q, page: pageParam, limit: limitParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  // Bulk-select (see LibraryList) works best with more than 20 results on
  // screen at once — e.g. searching a domain to sweep-tag every match in
  // one go. Default stays 20; a caller can raise it (capped) via ?limit=.
  const limit = Math.min(300, Math.max(1, Number(limitParam) || 20));

  const where: Record<string, unknown> = {};
  if (uncategorized) {
    where.categories = { none: {} };
  } else if (category) {
    where.categories = { some: { slug: category } };
  }
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { summary: { contains: q } },
      { rawContent: { contains: q } },
      { url: { contains: q } },
    ];
  }

  const [items, total, categoriesWithCount, uncategorizedCount] = await Promise.all([
    prisma.link.findMany({
      where,
      include: { categories: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.link.count({ where }),
    getCategoriesWithCount(),
    prisma.link.count({ where: { categories: { none: {} } } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  // Force LibraryList to remount (and drop stale selection) whenever the
  // filter/page/limit changes the underlying result set.
  const listKey = `${category ?? ""}|${uncategorized ?? ""}|${q ?? ""}|${page}|${limit}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold">我的收藏</h1>

      <div className="mt-4 flex flex-col gap-6 md:flex-row">
        <aside className="w-full shrink-0 md:w-48">
          <CategoryFilter categories={categoriesWithCount} uncategorizedCount={uncategorizedCount} />
        </aside>

        <div className="flex-1">
          <SearchBar />

          <div className="mt-4">
            <LibraryList key={listKey} items={items.map(serializeLink)} categories={categoriesWithCount} />
          </div>

          {totalPages > 1 && (
            <p className="mt-4 text-center text-xs text-gray-400">
              第 {page} / {totalPages} 頁（每頁 {limit} 筆，共 {total} 筆）
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
