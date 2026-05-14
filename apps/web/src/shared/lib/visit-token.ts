import { createHmac, timingSafeEqual } from "crypto";
import { getEnv } from "@/shared/validations/env";

const TTL_SEC = 600;

function signingSecret(): string {
  const env = getEnv();
  return env.INTERNAL_CLICK_SECRET?.trim() || env.NEXTAUTH_SECRET;
}

export function createVisitToken(slug: string): string {
  const normalized = slug.toLowerCase();
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  const nonce = Math.random().toString(36).slice(2, 12);
  const payload = JSON.stringify({ s: normalized, e: exp, n: nonce });
  const b64 = Buffer.from(payload, "utf8").toString("base64url");
  const sig = createHmac("sha256", signingSecret()).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyVisitToken(token: string, expectedSlug: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [b64, sig] = parts;
    if (!b64 || !sig) return false;
    const expectedSig = createHmac("sha256", signingSecret()).update(b64).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as { s?: string; e?: number; n?: string };
    if (typeof payload.s !== "string" || typeof payload.e !== "number") return false;
    if (payload.s !== expectedSlug.toLowerCase()) return false;
    if (payload.e < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}
