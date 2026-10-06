import { getRedis, RedisKeys } from "@/server/redis/client";
import { buildClickEventEnvelope } from "@/server/services/click-event-build";
import type { RedirectRequestMeta } from "@/server/services/redirect-resolve.service";
import { clickEventEnvelopeSchema } from "@/shared/validations/click-event";

const STREAM_MAXLEN = 50_000;

export type ClickEnqueueResult = { eventId: string; durationMs: number };

/**
 * Hot path: append one click to Redis stream (~O(1)). No Postgres on redirect path.
 */
export async function enqueueClickEvent(linkId: string, meta: RedirectRequestMeta): Promise<ClickEnqueueResult> {
  const started = performance.now();
  const envelope = buildClickEventEnvelope({
    linkId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    referer: meta.referer,
    countryCode: meta.countryCode,
  });
  clickEventEnvelopeSchema.parse(envelope);

  const redis = getRedis();
  const payload = JSON.stringify(envelope);
  await redis.xadd(
    RedisKeys.clickStream(),
    "MAXLEN",
    "~",
    String(STREAM_MAXLEN),
    "*",
    "payload",
    payload,
  );

  return { eventId: envelope.eventId, durationMs: Math.round(performance.now() - started) };
}

/** Best-effort legacy list buffer when stream publish fails. */
export async function enqueueClickEventLegacyFallback(
  linkId: string,
  meta: RedirectRequestMeta,
): Promise<void> {
  const redis = getRedis();
  await redis.lpush(
    RedisKeys.clickQueue(),
    JSON.stringify({
      linkId,
      ip: meta.ip,
      userAgent: meta.userAgent,
      referer: meta.referer,
      country: meta.countryCode,
      at: new Date().toISOString(),
    }),
  );
}
