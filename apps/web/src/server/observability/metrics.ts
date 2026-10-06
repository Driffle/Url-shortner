/** In-process counters for redirect and ingest (exported via GET /api/metrics). */
export const metrics = {
  redirectTotal: 0,
  redirectCacheHit: 0,
  redirectCacheMiss: 0,
  redirectLatencyMsSum: 0,
  clickIngestBatchFailures: 0,
};

export function recordRedirect(durationMs: number, cacheHit: boolean): void {
  metrics.redirectTotal += 1;
  metrics.redirectLatencyMsSum += durationMs;
  if (cacheHit) metrics.redirectCacheHit += 1;
  else metrics.redirectCacheMiss += 1;
}

export function recordClickIngestBatchFailure(): void {
  metrics.clickIngestBatchFailures += 1;
}

export function redirectCacheHitRatio(): number {
  const denom = metrics.redirectCacheHit + metrics.redirectCacheMiss;
  if (denom === 0) return 0;
  return metrics.redirectCacheHit / denom;
}
