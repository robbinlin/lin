const SLACK_API_BASE = "https://slack.com/api";

export async function postSlackMessage(params: {
  channel: string;
  text: string;
  threadTs?: string;
}): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.error("SLACK_BOT_TOKEN not set; skipping Slack reply");
    return;
  }

  try {
    const res = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        channel: params.channel,
        text: params.text,
        thread_ts: params.threadTs,
      }),
    });

    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      console.error("Slack chat.postMessage failed:", data.error);
    }
  } catch (err) {
    console.error("Slack chat.postMessage request failed:", err);
  }
}
