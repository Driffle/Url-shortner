import { createHash, randomUUID } from "crypto";
import type { ClickEventEnvelope } from "@/shared/validations/click-event";
import { getEnv } from "@/shared/validations/env";

function hash(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function isBotUa(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview/i.test(ua);
}

export function parseUa(ua: string | null): { deviceType: string; osName: string; browserName: string } {
  const u = ua ?? "";
  const mobile = /Mobile|Android|iPhone|iPad|webOS|BlackBerry|IEMobile|Opera Mini/i.test(u);
  const tablet = /iPad|Tablet/i.test(u);
  const deviceType = tablet ? "tablet" : mobile ? "mobile" : "desktop";

  let osName = "unknown";
  if (/Windows NT/i.test(u)) osName = "windows";
  else if (/Mac OS X/i.test(u)) osName = "macos";
  else if (/Android/i.test(u)) osName = "android";
  else if (/iPhone|iPad|iOS/i.test(u)) osName = "ios";
  else if (/Linux/i.test(u)) osName = "linux";

  let browserName = "unknown";
  if (/Edg\//i.test(u)) browserName = "edge";
  else if (/Chrome\//i.test(u) && !/Chromium/i.test(u)) browserName = "chrome";
  else if (/Safari/i.test(u) && !/Chrome/i.test(u)) browserName = "safari";
  else if (/Firefox\//i.test(u)) browserName = "firefox";

  return { deviceType, osName, browserName };
}

export function visitorHash(ip: string | null, ua: string | null, dayBucket: string): string {
  const secret = getEnv().NEXTAUTH_SECRET;
  return hash(`${secret}:${dayBucket}:${ip ?? ""}:${ua ?? ""}`);
}

export function referrerDomain(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function dayBucketStartUtc(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export type BuildClickEnvelopeInput = {
  linkId: string;
  ip: string | null;
  userAgent: string | null;
  referer: string | null;
  countryCode?: string | null;
  at?: Date;
  eventId?: string;
};

/** Build a stream-ready envelope (includes privacy-safe visitorHash). */
export function buildClickEventEnvelope(input: BuildClickEnvelopeInput): ClickEventEnvelope {
  const ua = input.userAgent ?? "";
  const at = input.at ?? new Date();
  const day = at.toISOString().slice(0, 10);
  const { deviceType, osName, browserName } = parseUa(input.userAgent);
  return {
    eventId: input.eventId ?? randomUUID(),
    linkId: input.linkId,
    at: at.toISOString(),
    referer: input.referer,
    ua: input.userAgent,
    countryCode: input.countryCode?.slice(0, 2).toUpperCase() ?? null,
    visitorHash: visitorHash(input.ip, input.userAgent, day),
    referrerDomain: referrerDomain(input.referer),
    deviceType,
    osName,
    browserName,
    isBot: isBotUa(ua),
  };
}
