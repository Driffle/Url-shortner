import { NextResponse } from "next/server";
import { getQueueDepths } from "@/server/services/click-worker.service";
import { metrics, redirectCacheHitRatio } from "@/server/observability/metrics";

/** Prometheus-style text metrics for SigNoz scrapers or curl checks. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? process.env.METRICS_SECRET;
  if (secret) {
    const authz = req.headers.get("authorization");
    if (authz !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let queueDepth = 0;
  let legacyQueueDepth = 0;
  try {
    const depths = await getQueueDepths();
    queueDepth = depths.streamLen;
    legacyQueueDepth = depths.legacyQueueLen;
  } catch {
    // Redis unavailable — still expose process counters
  }

  const lines = [
    "# HELP redirect_requests_total Redirect handler invocations",
    "# TYPE redirect_requests_total counter",
    `redirect_requests_total ${metrics.redirectTotal}`,
    "# HELP redirect_latency_ms_sum Sum of redirect handler latency ms",
    "# TYPE redirect_latency_ms_sum counter",
    `redirect_latency_ms_sum ${metrics.redirectLatencyMsSum}`,
    "# HELP slug_cache_hit_ratio Ratio of cache hits to hits+misses since process start",
    "# TYPE slug_cache_hit_ratio gauge",
    `slug_cache_hit_ratio ${redirectCacheHitRatio().toFixed(4)}`,
    "# HELP click_queue_depth Redis stream length for clicks",
    "# TYPE click_queue_depth gauge",
    `click_queue_depth ${queueDepth}`,
    "# HELP click_legacy_queue_depth Legacy list queue depth",
    "# TYPE click_legacy_queue_depth gauge",
    `click_legacy_queue_depth ${legacyQueueDepth}`,
    "# HELP click_ingest_batch_failures Worker batch failures since process start",
    "# TYPE click_ingest_batch_failures counter",
    `click_ingest_batch_failures ${metrics.clickIngestBatchFailures}`,
  ];

  return new NextResponse(`${lines.join("\n")}\n`, {
    status: 200,
    headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
  });
}
