"use client";

import type { CategoryWithCount } from "@/types";

/**
 * Controlled, multi-select hashtag row. Pure UI — no network calls, unlike
 * CategoryQuickPick (which fires a PATCH immediately). Used where the choice
 * needs to be bundled into a larger submit, e.g. the link submit form.
 */
export function CategoryPicker({
  categories,
  selectedIds,
  onToggle,
}: {
  categories: CategoryWithCount[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => {
        const selected = selectedIds.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onToggle(c.id)}
            className={
              selected
                ? "rounded-full bg-purple-600 px-3 py-1 text-sm font-medium text-white"
                : "rounded-full bg-white px-3 py-1 text-sm font-medium text-purple-700 ring-1 ring-purple-300 hover:bg-purple-100"
            }
          >
            #{c.name}
          </button>
        );
      })}
    </div>
  );
}
