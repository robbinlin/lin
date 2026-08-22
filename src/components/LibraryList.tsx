"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoryWithCount, LinkItem } from "@/types";
import { ItemCard } from "./ItemCard";
import { CategoryPicker } from "./CategoryPicker";

/**
 * Library results list with multi-select + bulk "apply these categories to
 * all selected" — for sweeping through a large batch of uncategorized links
 * (e.g. after a bulk import) without clicking into each one individually.
 * Categories are added to whatever each link already has, never removed.
 */
export function LibraryList({ items, categories }: { items: LinkItem[]; categories: CategoryWithCount[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applyIds, setApplyIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllOnPage() {
    setSelected(new Set(items.map((item) => item.id)));
  }

  function clearSelection() {
    setSelected(new Set());
    setApplyIds([]);
  }

  async function apply() {
    if (selected.size === 0 || applyIds.length === 0) return;
    setBusy(true);
    try {
      await fetch("/api/links/bulk-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkIds: Array.from(selected), categoryIds: applyIds }),
      });
      clearSelection();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        {items.length > 0 && (
          <button onClick={selectAllOnPage} className="text-xs text-blue-600 hover:underline">
            全選本頁 {items.length} 筆
          </button>
        )}
        {selected.size > 0 && (
          <button onClick={clearSelection} className="text-xs text-gray-500 hover:underline">
            取消選取
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 shadow-sm">
          <span className="text-sm font-medium text-blue-800">
            已選 {selected.size} 筆 — 選擇要套用的分類（會加到已選連結身上，不會動到既有分類）
          </span>
          <CategoryPicker
            categories={categories}
            selectedIds={applyIds}
            onToggle={(id) => setApplyIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))}
          />
          <button
            onClick={apply}
            disabled={busy || applyIds.length === 0}
            className="self-start rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "套用中…" : `套用到已選 ${selected.size} 筆`}
          </button>
        </div>
      )}

      {items.length === 0 && (
        <p className="py-10 text-center text-sm text-gray-500">還沒有符合條件的收藏</p>
      )}
      {items.map((item) => (
        <ItemCard key={item.id} item={item} selectable selected={selected.has(item.id)} onToggleSelect={toggle} />
      ))}
    </div>
  );
}
