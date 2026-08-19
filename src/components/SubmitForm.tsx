"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { detectSourceType } from "@/lib/url";
import type { CategoryWithCount, LinkItem } from "@/types";
import { ExtractionStatusBadge, LLMStatusBadge } from "./StatusBadge";
import { CategoryPicker } from "./CategoryPicker";

export function SubmitForm({ categories }: { categories: CategoryWithCount[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [manualText, setManualText] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LinkItem | null>(null);

  const sourceType = url ? detectSourceType(url) : null;
  const needsManualHint = sourceType === "FACEBOOK" || sourceType === "LINKEDIN";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          manualText: manualText || undefined,
          categoryId: categoryId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "提交失敗");
        return;
      }
      setResult(data as LinkItem);
      setUrl("");
      setManualText("");
      setCategoryId(null);
      router.refresh();
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            type="url"
            required
            placeholder="貼上連結（YouTube、TikTok、Facebook、LinkedIn、Google Scholar、任何網址…）"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "處理中…" : "加入收藏"}
          </button>
        </div>

        {needsManualHint && (
          <textarea
            placeholder="Facebook / LinkedIn 無法自動擷取內容，請貼上貼文文字（選填，之後也可以補上）"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={3}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-gray-500">
            先選好分類（選填）——就算之後內容抓不到、AI 也無法摘要，這個分類還是會保留
          </span>
          <CategoryPicker categories={categories} selectedId={categoryId} onSelect={setCategoryId} />
        </div>
      </form>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-4 rounded-lg border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <ExtractionStatusBadge status={result.extractionStatus} />
            <LLMStatusBadge status={result.llmStatus} />
            {result.category && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                {result.category.name}
              </span>
            )}
          </div>
          {result.summary ? (
            <p className="mt-2 text-sm text-gray-700">{result.summary}</p>
          ) : result.extractionError ? (
            <p className="mt-2 text-sm text-gray-500">{result.extractionError}</p>
          ) : result.llmError ? (
            <p className="mt-2 text-sm text-gray-500">{result.llmError}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
