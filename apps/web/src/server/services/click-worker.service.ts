import { getRedis, RedisKeys } from "@/server/redis/client";
import { clickIngestService } from "@/server/services/click-ingest.service";
import { clickEventEnvelopeSchema } from "@/shared/validations/click-event";

export const CLICK_STREAM_GROUP = "click-workers";
export const DEFAULT_CONSUMER_NAME = "worker-1";
export const DEFAULT_BATCH_SIZE = 200;
export const QUEUE_DEPTH_ALERT = 10_000;

export type WorkerCycleStats = {
  streamRead: number;
  legacyQueueRead: number;
  inserted: number;
  skippedDuplicate: number;
  pendingStreamDepth: number;
  legacyQueueDepth: number;
  durationMs: number;
};

function parseStreamPayload(fields: string[]): string | null {
  for (let i = 0; i < fields.length - 1; i += 2) {
    if (fields[i] === "payload") return fields[i + 1] ?? null;
  }
  return null;
}

export async function ensureClickStreamGroup(): Promise<void> {
  const redis = getRedis();
  try {
    await redis.xgroup("CREATE", RedisKeys.clickStream(), CLICK_STREAM_GROUP, "0", "MKSTREAM");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("BUSYGROUP")) throw err;
  }
}

export async function readClickStreamBatch(
  consumerName: string,
  count: number,
): Promise<{ id: string; envelopeJson: string }[]> {
  const redis = getRedis();
  const res = (await redis.xreadgroup(
    "GROUP",
    CLICK_STREAM_GROUP,
    consumerName,
    "COUNT",
    count,
    "BLOCK",
    1000,
    "STREAMS",
    RedisKeys.clickStream(),
    ">",
  )) as [string, [string, string[]][]][] | null;
  if (!res) return [];

  const out: { id: string; envelopeJson: string }[] = [];
  for (const [, entries] of res) {
    for (const [id, fields] of entries) {
      const json = parseStreamPayload(fields);
      if (json) out.push({ id, envelopeJson: json });
    }
  }
  return out;
}

export async function drainLegacyClickQueue(maxItems: number): Promise<string[]> {
  const redis = getRedis();
  const items: string[] = [];
  for (let i = 0; i < maxItems; i++) {
    const raw = await redis.rpop(RedisKeys.clickQueue());
    if (!raw) break;
    items.push(raw);
  }
  return items;
}

export async function getQueueDepths(): Promise<{ streamLen: number; legacyQueueLen: number }> {
  const redis = getRedis();
  const [streamLen, legacyQueueLen] = await Promise.all([
    redis.xlen(RedisKeys.clickStream()),
    redis.llen(RedisKeys.clickQueue()),
  ]);
  return { streamLen, legacyQueueLen };
}

export async function runClickWorkerCycle(options?: {
  consumerName?: string;
  batchSize?: number;
  legacyDrainMax?: number;
}): Promise<WorkerCycleStats> {
  const started = performance.now();
  const consumerName = options?.consumerName ?? DEFAULT_CONSUMER_NAME;
  const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;
  const legacyDrainMax = options?.legacyDrainMax ?? 50;

  await ensureClickStreamGroup();

  const streamItems = await readClickStreamBatch(consumerName, batchSize);
  const legacyRaw = await drainLegacyClickQueue(legacyDrainMax);

  const envelopes = [];
  for (const item of streamItems) {
    try {
      envelopes.push(clickEventEnvelopeSchema.parse(JSON.parse(item.envelopeJson)));
    } catch {
      // skip malformed
    }
  }
  for (const raw of legacyRaw) {
    const env = clickIngestService.legacyQueueItemToEnvelope(raw);
    if (env) envelopes.push(env);
  }

  const result = await clickIngestService.ingestBatch(envelopes);

  const redis = getRedis();
  if (streamItems.length > 0) {
    await redis.xack(RedisKeys.clickStream(), CLICK_STREAM_GROUP, ...streamItems.map((s) => s.id));
  }

  const depths = await getQueueDepths();
  const durationMs = Math.round(performance.now() - started);

  const stats: WorkerCycleStats = {
    streamRead: streamItems.length,
    legacyQueueRead: legacyRaw.length,
    inserted: result.inserted,
    skippedDuplicate: result.skippedDuplicate,
    pendingStreamDepth: depths.streamLen,
    legacyQueueDepth: depths.legacyQueueLen,
    durationMs,
  };

  console.log(
    JSON.stringify({
      event: "click_ingest_batch",
      ...stats,
      alert: depths.legacyQueueLen > QUEUE_DEPTH_ALERT || depths.streamLen > QUEUE_DEPTH_ALERT,
    }),
  );

  return stats;
}

/** Long-running loop for the click-worker process. */
export async function runClickWorkerLoop(signal?: AbortSignal): Promise<void> {
  await ensureClickStreamGroup();
  while (!signal?.aborted) {
    try {
      await runClickWorkerCycle();
    } catch (err) {
      console.error(JSON.stringify({ event: "click_worker_error", message: String(err) }));
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
