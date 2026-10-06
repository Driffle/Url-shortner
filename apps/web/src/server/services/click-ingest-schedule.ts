import { after } from "next/server";
import { enqueueClickEvent, enqueueClickEventLegacyFallback } from "@/server/services/click-enqueue.service";
import type { RedirectRequestMeta } from "@/server/services/redirect-resolve.service";

/** Non-blocking click enqueue after redirect response (see `after()`). Postgres writes happen in the worker. */
export function scheduleClickIngest(linkId: string, meta: RedirectRequestMeta): void {
  after(async () => {
    const started = performance.now();
    try {
      const { eventId, durationMs } = await enqueueClickEvent(linkId, meta);
      console.log(
        JSON.stringify({
          event: "click_enqueue",
          linkId,
          eventId,
          durationMs,
          cacheHit: null,
        }),
      );
    } catch {
      try {
        await enqueueClickEventLegacyFallback(linkId, meta);
        console.log(
          JSON.stringify({
            event: "click_enqueue_fallback",
            linkId,
            durationMs: Math.round(performance.now() - started),
          }),
        );
      } catch {
        // best-effort buffer
      }
    }
  });
}
