import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { serializeLink } from "@/lib/serialize";
import { ExtractionStatusBadge, LLMStatusBadge } from "@/components/StatusBadge";
import { ItemActions } from "@/components/ItemActions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function ItemPage({ params }: { params: Params }) {
  const { id } = await params;
  const link = await prisma.link.findUnique({ where: { id }, include: { category: true } });
  if (!link) notFound();

  const item = serializeLink(link);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-2">
        <ExtractionStatusBadge status={item.extractionStatus} />
        <LLMStatusBadge status={item.llmStatus} />
        {item.category && (
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
            {item.category.name}
          </span>
        )}
      </div>

      <h1 className="mt-2 text-xl font-semibold">{item.title || item.url}</h1>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 block break-all text-sm text-blue-600 hover:underline"
      >
        {item.url}
      </a>

      {item.summary && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-gray-500">摘要</h2>
          <p className="mt-1 text-gray-800">{item.summary}</p>
        </div>
      )}

      {item.keyPoints.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-gray-500">重點</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-gray-800">
            {item.keyPoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {item.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {(item.extractionError || item.llmError) && (
        <div className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {item.extractionError || item.llmError}
        </div>
      )}

      <ItemActions item={item} />
    </div>
  );
}
