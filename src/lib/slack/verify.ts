import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_TIMESTAMP_SKEW_SECONDS = 60 * 5;

/**
 * Verifies a Slack Events API request per Slack's signing spec:
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackSignature(params: {
  signingSecret: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
  rawBody: string;
  now?: number;
}): boolean {
  const { signingSecret, timestampHeader, signatureHeader, rawBody } = params;
  const now = params.now ?? Math.floor(Date.now() / 1000);

  if (!timestampHeader || !signatureHeader) return false;

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(now - timestamp) > MAX_TIMESTAMP_SKEW_SECONDS) return false;

  const base = `v0:${timestampHeader}:${rawBody}`;
  const expected = `v0=${createHmac("sha256", signingSecret).update(base).digest("hex")}`;

  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signatureHeader, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}
