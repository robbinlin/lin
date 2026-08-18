import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectSourceType, isValidUrl, normalizeUrl } from "@/lib/url";
import { processLink } from "@/lib/pipeline";
import { verifySlackSignature } from "@/lib/slack/verify";
import { extractUrlsFromSlackText } from "@/lib/slack/extractUrls";
import { postSlackMessage } from "@/lib/slack/postMessage";

interface SlackMessageEvent {
  type: string;
  subtype?: string;
  bot_id?: string;
  channel: string;
  user?: string;
  text?: string;
  ts: string;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const verified = verifySlackSignature({
    signingSecret: process.env.SLACK_SIGNING_SECRET ?? "",
    timestampHeader: request.headers.get("x-slack-request-timestamp"),
    signatureHeader: request.headers.get("x-slack-signature"),
    rawBody,
  });
  if (!verified) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);

  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  if (body.type === "event_callback") {
    const event: SlackMessageEvent = body.event;
    handleMessageEvent(event).catch((err) => {
      console.error("Slack event processing failed:", err);
    });
  }

  // Ack immediately — Slack expects a response within ~3s, and extraction +
  // summarization can take much longer. The actual work continues in the
  // background on this same (persistent, non-serverless) Node process.
  return NextResponse.json({ ok: true });
}

async function handleMessageEvent(event: SlackMessageEvent): Promise<void> {
  if (!event || event.type !== "message") return;
  if (event.subtype || event.bot_id) return; // ignore edits, deletes, bot messages

  const restrictChannel = process.env.SLACK_CHANNEL_ID;
  if (restrictChannel && event.channel !== restrictChannel) return;

  const urls = extractUrlsFromSlackText(event.text ?? "").filter(isValidUrl);
  if (urls.length === 0) return;

  for (const rawUrl of urls) {
    await handleOneLink(rawUrl, event.channel, event.ts);
  }
}

async function handleOneLink(rawUrl: string, channel: string, threadTs: string): Promise<void> {
  const url = normalizeUrl(rawUrl);
  const sourceType = detectSourceType(url);

  let link = await prisma.link.findUnique({ where: { url }, include: { category: true } });

  if (!link) {
    const created = await prisma.link.create({ data: { url, sourceType } });
    await processLink(created.id);
    link = await prisma.link.findUniqueOrThrow({ where: { id: created.id }, include: { category: true } });
  }

  await postSlackMessage({ channel, threadTs, text: formatSlackReply(link) });
}

function formatSlackReply(link: {
  id: string;
  url: string;
  title: string | null;
  summary: string | null;
  extractionStatus: string;
  extractionError: string | null;
  llmStatus: string;
  llmError: string | null;
  category: { name: string } | null;
}): string {
  const appUrl = process.env.APP_URL;
  const detailLink = appUrl ? `\n<${appUrl}/item/${link.id}|查看詳情>` : "";

  if (link.extractionStatus === "NEEDS_MANUAL") {
    return `⚠️ *${link.url}*\n這個來源（Facebook/LinkedIn）需要手動貼上貼文文字才能摘要。${detailLink}`;
  }
  if (link.extractionStatus === "FAILED") {
    const manualHint = appUrl ? `\n可以到<${appUrl}/item/${link.id}|詳情頁>手動貼上文字內容改用貼上內容摘要。` : "";
    return `❌ *${link.url}*\n擷取失敗：${link.extractionError ?? "未知錯誤"}${manualHint}`;
  }
  if (link.llmStatus === "FAILED") {
    return `⚠️ *${link.title ?? link.url}*\n內容已擷取，但摘要失敗：${link.llmError ?? "未知錯誤"}${detailLink}`;
  }
  if (link.summary) {
    const category = link.category ? `\n分類：${link.category.name}` : "";
    return `✅ *${link.title ?? link.url}*${category}\n${link.summary}${detailLink}`;
  }
  return `已收到，處理中…${detailLink}`;
}
