import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { SourceType, SummarizeResult } from "@/types";
import { listCategoryNames } from "./categories";

const client = new Anthropic();
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";
const MAX_CONTENT_CHARS = 60_000; // ~15k tokens, keeps the call cheap

const SummarySchema = z.object({
  summary: z.string().describe("2-4 sentence summary of the content"),
  key_points: z.array(z.string()).describe("Bulleted key points, up to 5"),
  category: z.string().describe("Best-fit category name, existing or newly proposed"),
  category_is_new: z.boolean().describe("True if `category` is not one of the existing categories"),
  tags: z.array(z.string()).describe("Up to 5 short freeform tags"),
  language: z.string().describe("BCP-47-ish language code of the content, e.g. zh-TW, en"),
});

export interface SummarizeInput {
  url: string;
  sourceType: SourceType;
  title: string | null;
  content: string;
}

export async function summarizeAndClassify(input: SummarizeInput): Promise<SummarizeResult> {
  const existingCategories = await listCategoryNames();
  const truncated = input.content.slice(0, MAX_CONTENT_CHARS);

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: "disabled" },
    output_config: {
      effort: "low",
      format: zodOutputFormat(SummarySchema),
    },
    system:
      "You are a content summarization and classification assistant. Given extracted text " +
      "from a web page, video transcript, or social post, produce a structured summary. " +
      `Existing categories: ${JSON.stringify(existingCategories)}. Prefer an existing category ` +
      "if it reasonably fits; propose a new short category name only if none of the existing " +
      "ones fit. Use the same language as the content for the category name and summary " +
      "(Traditional Chinese for Chinese content).",
    messages: [
      {
        role: "user",
        content:
          `Source type: ${input.sourceType}\nURL: ${input.url}\n` +
          `Title: ${input.title ?? "(unknown)"}\n---\n${truncated}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Model declined to process this content");
  }
  if (!response.parsed_output) {
    throw new Error(`No structured output returned (stop_reason: ${response.stop_reason})`);
  }

  const parsed = response.parsed_output;
  return {
    summary: parsed.summary,
    keyPoints: parsed.key_points,
    category: parsed.category,
    categoryIsNew: parsed.category_is_new,
    tags: parsed.tags,
    language: parsed.language,
  };
}
