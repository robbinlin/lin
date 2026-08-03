import { prisma } from "@/lib/db";
import { serializeLink } from "@/lib/serialize";
import { SubmitForm } from "@/components/SubmitForm";
import { ItemCard } from "@/components/ItemCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const recent = await prisma.link.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { category: true },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">丟一個連結進來</h1>
      <p className="mt-1 text-sm text-gray-500">
        YouTube、TikTok 短片，或 Facebook、LinkedIn、Google Scholar、任何網頁——自動摘要並分類收藏。
      </p>

      <div className="mt-6">
        <SubmitForm />
      </div>

      {recent.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-gray-500">最近加入</h2>
          <div className="flex flex-col gap-3">
            {recent.map((item) => (
              <ItemCard key={item.id} item={serializeLink(item)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
