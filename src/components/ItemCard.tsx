import Link from "next/link";
import type { LinkItem } from "@/types";
import { ExtractionStatusBadge, LLMStatusBadge } from "./StatusBadge";

const SOURCE_LABELS: Record<string, string> = {
  YOUTUBE: "YouTube",
  TIKTOK: "TikTok",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
  GOOGLE_SCHOLAR: "Google Scholar",
  GENERIC_WEB: "網頁",
};

export function ItemCard({ item }: { item: LinkItem }) {
  return (
    <Link
      href={`/item/${item.id}`}
      className="block rounded-lg border border-gray-200 p-4 transition hover:border-blue-400 hover:shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="font-medium">{SOURCE_LABELS[item.sourceType] ?? item.sourceType}</span>
        <span>·</span>
        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
        {item.category && (
          <span className="rounded-full bg-purple-100 px-2 py-0.5 font-medium text-purple-700">
            {item.category.name}
          </span>
        )}
      </div>

      <h3 className="mt-1 line-clamp-2 font-medium text-gray-900">
        {item.title || item.url}
      </h3>

      {item.summary ? (
        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{item.summary}</p>
      ) : (
        <div className="mt-1 flex gap-2">
          <ExtractionStatusBadge status={item.extractionStatus} />
          <LLMStatusBadge status={item.llmStatus} />
        </div>
      )}

      {item.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
