import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifySlackSignature } from "./verify";

const SECRET = "test-signing-secret";

function sign(timestamp: string, body: string, secret = SECRET): string {
  const base = `v0:${timestamp}:${body}`;
  return `v0=${createHmac("sha256", secret).update(base).digest("hex")}`;
}

describe("verifySlackSignature", () => {
  it("accepts a correctly signed, fresh request", () => {
    const now = 1_700_000_000;
    const timestamp = String(now - 5);
    const body = JSON.stringify({ type: "event_callback" });

    expect(
      verifySlackSignature({
        signingSecret: SECRET,
        timestampHeader: timestamp,
        signatureHeader: sign(timestamp, body),
        rawBody: body,
        now,
      }),
    ).toBe(true);
  });

  it("rejects a signature computed with the wrong secret", () => {
    const now = 1_700_000_000;
    const timestamp = String(now);
    const body = "{}";

    expect(
      verifySlackSignature({
        signingSecret: SECRET,
        timestampHeader: timestamp,
        signatureHeader: sign(timestamp, body, "wrong-secret"),
        rawBody: body,
        now,
      }),
    ).toBe(false);
  });

  it("rejects a stale timestamp (replay protection)", () => {
    const now = 1_700_000_000;
    const timestamp = String(now - 60 * 10); // 10 minutes old
    const body = "{}";

    expect(
      verifySlackSignature({
        signingSecret: SECRET,
        timestampHeader: timestamp,
        signatureHeader: sign(timestamp, body),
        rawBody: body,
        now,
      }),
    ).toBe(false);
  });

  it("rejects when headers are missing", () => {
    expect(
      verifySlackSignature({
        signingSecret: SECRET,
        timestampHeader: null,
        signatureHeader: null,
        rawBody: "{}",
      }),
    ).toBe(false);
  });

  it("rejects a body that was tampered with after signing", () => {
    const now = 1_700_000_000;
    const timestamp = String(now);
    const originalBody = JSON.stringify({ type: "event_callback" });
    const tamperedBody = JSON.stringify({ type: "event_callback", injected: true });

    expect(
      verifySlackSignature({
        signingSecret: SECRET,
        timestampHeader: timestamp,
        signatureHeader: sign(timestamp, originalBody),
        rawBody: tamperedBody,
        now,
      }),
    ).toBe(false);
  });
});
