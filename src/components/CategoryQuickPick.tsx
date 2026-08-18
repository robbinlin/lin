"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoryWithCount } from "@/types";

export function CategoryQuickPick({
  linkId,
  categories,
}: {
  linkId: string;
  categories: CategoryWithCount[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function pick(categoryId: string) {
    setBusy(categoryId);
    try {
      await fetch(`/api/links/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (categories.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-purple-200 bg-purple-50 p-4">
      <label className="text-sm font-medium text-purple-800">
        還沒內容也可以先快速歸類，之後再回來補摘要
      </label>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => pick(c.id)}
            disabled={busy !== null}
            className="rounded-full bg-white px-3 py-1 text-sm font-medium text-purple-700 ring-1 ring-purple-300 hover:bg-purple-100 disabled:opacity-50"
          >
            #{c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
