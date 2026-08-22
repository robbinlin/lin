export type SourceType =
  | "YOUTUBE"
  | "TIKTOK"
  | "FACEBOOK"
  | "LINKEDIN"
  | "GOOGLE_SCHOLAR"
  | "GENERIC_WEB";

export type ExtractionStatus =
  | "PENDING"
  | "SUCCESS"
  | "PARTIAL"
  | "FAILED"
  | "NEEDS_MANUAL";

export type LLMStatus = "PENDING" | "SUCCESS" | "FAILED";

export interface ExtractionResult {
  status: Exclude<ExtractionStatus, "PENDING">;
  content: string | null;
  title: string | null;
  error?: string;
}

export interface SummarizeResult {
  summary: string;
  keyPoints: string[];
  category: string;
  categoryIsNew: boolean;
  tags: string[];
  language: string;
}

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
}

export interface LinkItem {
  id: string;
  url: string;
  sourceType: SourceType;
  title: string | null;
  manualText: string | null;
  extractionStatus: ExtractionStatus;
  extractionError: string | null;
  llmStatus: LLMStatus;
  llmError: string | null;
  summary: string | null;
  keyPoints: string[];
  tags: string[];
  language: string | null;
  categories: CategoryInfo[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithCount extends CategoryInfo {
  isSeeded: boolean;
  count: number;
}
