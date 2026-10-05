import { after } from "next/server";
import { getRedis, RedisKeys } from "@/server/redis/client";
import { clickIngestService } from "@/server/services/click-ingest.service";
import type { RedirectRequestMeta } from "@/server/services/redirect-resolve.service";

/** Non-blocking click ingest after redirect response (see `after()`). */
export function scheduleClickIngest(linkId: string, meta: RedirectRequestMeta): void {
  after(async () => {
    try {
      await clickIngestService.ingest({
        linkId,
        ip: meta.ip,
        userAgent: meta.userAgent,
        referer: meta.referer,
        countryCode: meta.countryCode,
      });
    } catch {
      try {
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
      } catch {
        // best-effort queue buffer
      }
    }
  });
}
