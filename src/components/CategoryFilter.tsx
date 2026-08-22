"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { CategoryWithCount } from "@/types";

export function CategoryFilter({
  categories,
  uncategorizedCount,
}: {
  categories: CategoryWithCount[];
  uncategorizedCount?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("category");
  const uncategorizedActive = searchParams.get("uncategorized") === "1";

  function select(slug: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("uncategorized");
    if (slug) {
      params.set("category", slug);
    } else {
      params.delete("category");
    }
    router.push(`/library?${params.toString()}`);
  }

  function selectUncategorized() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    params.set("uncategorized", "1");
    router.push(`/library?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => select(null)}
        className={`rounded-md px-3 py-1.5 text-left text-sm ${
          !active && !uncategorizedActive ? "bg-blue-100 font-medium text-blue-700" : "hover:bg-gray-100"
        }`}
      >
        全部
      </button>
      {typeof uncategorizedCount === "number" && uncategorizedCount > 0 && (
        <button
          onClick={selectUncategorized}
          className={`flex items-center justify-between rounded-md px-3 py-1.5 text-left text-sm ${
            uncategorizedActive ? "bg-blue-100 font-medium text-blue-700" : "hover:bg-gray-100"
          }`}
        >
          <span>未分類</span>
          <span className="text-xs text-gray-400">{uncategorizedCount}</span>
        </button>
      )}
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => select(c.slug)}
          className={`flex items-center justify-between rounded-md px-3 py-1.5 text-left text-sm ${
            active === c.slug ? "bg-blue-100 font-medium text-blue-700" : "hover:bg-gray-100"
          }`}
        >
          <span>{c.name}</span>
          <span className="text-xs text-gray-400">{c.count}</span>
        </button>
      ))}
    </div>
  );
}
