import { execFile } from "node:child_process";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { ExtractionResult } from "@/types";
import { parseVtt } from "./vtt";

const execFileAsync = promisify(execFile);
const YT_DLP_PATH = process.env.YT_DLP_PATH || "yt-dlp";
const SUB_LANGS = "en,zh-Hant,zh-Hans,zh-TW,zh-CN,zh";
const TIMEOUT_MS = 45_000;

interface YtDlpInfo {
  title?: string;
  description?: string;
}

/**
 * Extracts a transcript (from captions) plus title for a YouTube/TikTok URL.
 * Falls back to title+description (status "partial") when no captions exist.
 */
export async function extractViaYtDlp(url: string): Promise<ExtractionResult> {
  const dir = await mkdtemp(path.join(tmpdir(), "yt-dlp-"));
  try {
    try {
      await execFileAsync(
        YT_DLP_PATH,
        [
          "--skip-download",
          "--write-auto-sub",
          "--write-sub",
          "--sub-lang",
          SUB_LANGS,
          "--sub-format",
          "vtt",
          "--no-warnings",
          "-o",
          path.join(dir, "%(id)s.%(ext)s"),
          url,
        ],
        { timeout: TIMEOUT_MS },
      );
    } catch (err) {
      return await fallbackToMetadata(url, dir, describeError(err));
    }

    const { readdir } = await import("node:fs/promises");
    const files = await readdir(dir);
    const vttFile = files.find((f) => f.endsWith(".vtt"));

    if (!vttFile) {
      return await fallbackToMetadata(url, dir, "No captions found for this video");
    }

    const vttContent = await readFile(path.join(dir, vttFile), "utf-8");
    const transcript = parseVtt(vttContent);
    const info = await fetchInfo(url);

    if (!transcript) {
      return await fallbackToMetadata(url, dir, "Captions file was empty");
    }

    return {
      status: "SUCCESS",
      content: transcript,
      title: info?.title ?? null,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function fallbackToMetadata(
  url: string,
  _dir: string,
  reason: string,
): Promise<ExtractionResult> {
  const info = await fetchInfo(url);
  if (!info || (!info.title && !info.description)) {
    return {
      status: "FAILED",
      content: null,
      title: null,
      error: reason,
    };
  }

  const content = [info.title, info.description].filter(Boolean).join("\n\n");
  return {
    status: "PARTIAL",
    content,
    title: info.title ?? null,
    error: `Transcript unavailable — ${reason}`,
  };
}

async function fetchInfo(url: string): Promise<YtDlpInfo | null> {
  try {
    const { stdout } = await execFileAsync(
      YT_DLP_PATH,
      ["--skip-download", "--dump-json", "--no-warnings", url],
      { timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
    );
    const json = JSON.parse(stdout);
    return { title: json.title, description: json.description };
  } catch {
    return null;
  }
}

function describeError(err: unknown): string {
  if (err && typeof err === "object" && "killed" in err && (err as { killed?: boolean }).killed) {
    return "yt-dlp timed out";
  }
  if (err instanceof Error) {
    return err.message.slice(0, 300);
  }
  return "yt-dlp failed";
}
