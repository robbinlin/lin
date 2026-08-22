"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoryWithCount } from "@/types";

export function CategoryQuickPick({
  linkId,
  categories,
  selectedIds: initialSelectedIds,
}: {
  linkId: string;
  categories: CategoryWithCount[];
  selectedIds: string[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [busy, setBusy] = useState(false);

  async function toggle(categoryId: string) {
    const next = selectedIds.includes(categoryId)
      ? selectedIds.filter((id) => id !== categoryId)
      : [...selectedIds, categoryId];
    setSelectedIds(next);
    setBusy(true);
    try {
      await fetch(`/api/links/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (categories.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-purple-200 bg-purple-50 p-4">
      <label className="text-sm font-medium text-purple-800">
        還沒內容也可以先快速歸類（可以選多個），之後再回來補摘要
      </label>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => {
          const selected = selectedIds.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              disabled={busy}
              className={
                selected
                  ? "rounded-full bg-purple-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
                  : "rounded-full bg-white px-3 py-1 text-sm font-medium text-purple-700 ring-1 ring-purple-300 hover:bg-purple-100 disabled:opacity-50"
              }
            >
              #{c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
