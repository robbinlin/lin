"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LinkItem } from "@/types";

export function ItemActions({ item }: { item: LinkItem }) {
  const router = useRouter();
  const [manualText, setManualText] = useState(item.manualText ?? "");
  const [busy, setBusy] = useState(false);

  async function retry() {
    setBusy(true);
    try {
      await fetch(`/api/links/${item.id}/retry`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function submitManualText(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch(`/api/links/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualText }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("確定要刪除這筆收藏嗎？")) return;
    setBusy(true);
    try {
      await fetch(`/api/links/${item.id}`, { method: "DELETE" });
      router.push("/library");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      {item.extractionStatus === "NEEDS_MANUAL" && (
        <form onSubmit={submitManualText} className="flex flex-col gap-2 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <label className="text-sm font-medium text-orange-800">
            這個來源需要手動貼上貼文文字才能摘要
          </label>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={4}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="貼上貼文文字…"
          />
          <button
            type="submit"
            disabled={busy || !manualText.trim()}
            className="self-start rounded-md bg-orange-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            送出並產生摘要
          </button>
        </form>
      )}

      {(item.extractionStatus === "FAILED" || item.llmStatus === "FAILED") && (
        <button
          onClick={retry}
          disabled={busy}
          className="self-start rounded-md border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          重試
        </button>
      )}

      <button
        onClick={remove}
        disabled={busy}
        className="self-start text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        刪除這筆收藏
      </button>
    </div>
  );
}
