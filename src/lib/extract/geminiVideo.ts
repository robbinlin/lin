import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { GoogleGenAI, createPartFromUri, createUserContent } from "@google/genai";
import type { ExtractionResult, SourceType } from "@/types";

const execFileAsync = promisify(execFile);
const YT_DLP_PATH = process.env.YT_DLP_PATH || "yt-dlp";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const DOWNLOAD_TIMEOUT_MS = 60_000;
const GEMINI_TIMEOUT_MS = 90_000;

const PROMPT =
  "Watch this video carefully — both the visual content and any spoken " +
  "audio — and write a detailed description of what happens in it: key " +
  "visuals, spoken content, on-screen text, and overall topic. Write in " +
  "the same language as the video's spoken/on-screen content where " +
  "possible. This description will be used to summarize and categorize " +
  "the video afterward, so be thorough rather than brief.";

const MIME_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
};

export function isGeminiVideoConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);
}

/**
 * Uses Gemini's video understanding to read a video's actual visual/audio
 * content — a fallback for when yt-dlp can't get captions (none exist, or
 * the source blocks extraction, e.g. TikTok's anti-bot measures). Opt-in:
 * only attempted when GEMINI_API_KEY is set. Never throws; any failure (no
 * key, quota, download failure, API error) returns a normal FAILED
 * ExtractionResult so the caller falls back to whatever it would otherwise
 * do (manual paste).
 */
export async function extractVideoWithGemini(url: string, sourceType: SourceType): Promise<ExtractionResult> {
  if (!isGeminiVideoConfigured()) {
    return {
      status: "FAILED",
      content: null,
      title: null,
      error: "Gemini video understanding not configured (set GEMINI_API_KEY)",
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    if (sourceType === "YOUTUBE") {
      return await analyzeVideo(ai, createUserContent([createPartFromUri(url, "video/*"), PROMPT]));
    }

    // Non-YouTube sources (currently just TikTok): Gemini can't fetch an
    // arbitrary video URL itself, so download the actual video file with
    // yt-dlp first, then upload it to Gemini's Files API.
    return await analyzeDownloadedVideo(ai, url);
  } catch (err) {
    return {
      status: "FAILED",
      content: null,
      title: null,
      error: err instanceof Error ? err.message.slice(0, 300) : "Gemini video analysis failed",
    };
  }
}

async function analyzeVideo(
  ai: GoogleGenAI,
  contents: ReturnType<typeof createUserContent>,
): Promise<ExtractionResult> {
  const response = await withTimeout(
    ai.models.generateContent({ model: GEMINI_MODEL, contents }),
    GEMINI_TIMEOUT_MS,
    "Gemini video analysis",
  );
  const text = response.text?.trim();
  if (!text) {
    return { status: "FAILED", content: null, title: null, error: "Gemini returned no content for this video" };
  }
  return { status: "SUCCESS", content: text, title: null };
}

async function analyzeDownloadedVideo(ai: GoogleGenAI, url: string): Promise<ExtractionResult> {
  const dir = await mkdtemp(path.join(tmpdir(), "gemini-video-"));
  let uploadedFileName: string | null = null;
  try {
    try {
      await execFileAsync(
        YT_DLP_PATH,
        ["--no-warnings", "--max-filesize", "50M", "-o", path.join(dir, "video.%(ext)s"), url],
        { timeout: DOWNLOAD_TIMEOUT_MS },
      );
    } catch (err) {
      return {
        status: "FAILED",
        content: null,
        title: null,
        error: `Could not download video for Gemini analysis: ${describeError(err)}`,
      };
    }

    const files = await readdir(dir);
    const videoFile = files.find((f) => f.startsWith("video."));
    if (!videoFile) {
      return { status: "FAILED", content: null, title: null, error: "Could not download video for Gemini analysis" };
    }

    const ext = videoFile.split(".").pop()?.toLowerCase() ?? "";
    const mimeType = MIME_BY_EXT[ext] ?? "video/mp4";
    const filePath = path.join(dir, videoFile);

    const uploaded = await ai.files.upload({ file: filePath, config: { mimeType } });
    uploadedFileName = uploaded.name ?? null;
    if (!uploaded.uri) {
      return { status: "FAILED", content: null, title: null, error: "Gemini file upload did not return a URI" };
    }

    return await analyzeVideo(
      ai,
      createUserContent([createPartFromUri(uploaded.uri, uploaded.mimeType ?? mimeType), PROMPT]),
    );
  } finally {
    if (uploadedFileName) {
      await ai.files.delete({ name: uploadedFileName }).catch(() => {});
    }
    await rm(dir, { recursive: true, force: true });
  }
}

function describeError(err: unknown): string {
  if (err && typeof err === "object" && "killed" in err && (err as { killed?: boolean }).killed) {
    return "yt-dlp timed out";
  }
  if (err instanceof Error) {
    return err.message.slice(0, 200);
  }
  return "yt-dlp failed";
}
