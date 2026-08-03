import type { ExtractionStatus, LLMStatus } from "@/types";

const EXTRACTION_LABELS: Record<ExtractionStatus, { label: string; className: string }> = {
  PENDING: { label: "處理中", className: "bg-gray-100 text-gray-700" },
  SUCCESS: { label: "已擷取", className: "bg-green-100 text-green-700" },
  PARTIAL: { label: "部分擷取", className: "bg-yellow-100 text-yellow-700" },
  FAILED: { label: "擷取失敗", className: "bg-red-100 text-red-700" },
  NEEDS_MANUAL: { label: "待補文字", className: "bg-orange-100 text-orange-700" },
};

const LLM_LABELS: Record<LLMStatus, { label: string; className: string }> = {
  PENDING: { label: "尚未摘要", className: "bg-gray-100 text-gray-700" },
  SUCCESS: { label: "已摘要", className: "bg-blue-100 text-blue-700" },
  FAILED: { label: "摘要失敗", className: "bg-red-100 text-red-700" },
};

export function ExtractionStatusBadge({ status }: { status: ExtractionStatus }) {
  const { label, className } = EXTRACTION_LABELS[status];
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function LLMStatusBadge({ status }: { status: LLMStatus }) {
  const { label, className } = LLM_LABELS[status];
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
