"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { CategoryWithCount } from "@/types";

export function CategoryFilter({ categories }: { categories: CategoryWithCount[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("category");

  function select(slug: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set("category", slug);
    } else {
      params.delete("category");
    }
    router.push(`/library?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => select(null)}
        className={`rounded-md px-3 py-1.5 text-left text-sm ${
          !active ? "bg-blue-100 font-medium text-blue-700" : "hover:bg-gray-100"
        }`}
      >
        全部
      </button>
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
