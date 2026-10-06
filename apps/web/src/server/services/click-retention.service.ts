import { prisma } from "@/server/db/prisma";

export type RetentionRunResult = {
  deleted: number;
  cutoff: string;
  batches: number;
};

/**
 * Delete raw click events older than retention window (rollups kept).
 */
export async function purgeOldClickEvents(options: {
  retentionDays: number;
  batchSize?: number;
  maxBatches?: number;
}): Promise<RetentionRunResult> {
  const batchSize = options.batchSize ?? 5000;
  const maxBatches = options.maxBatches ?? 20;
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - options.retentionDays);

  let deleted = 0;
  let batches = 0;

  for (let i = 0; i < maxBatches; i++) {
    const ids = await prisma.clickEvent.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true },
      take: batchSize,
    });
    if (ids.length === 0) break;

    const result = await prisma.clickEvent.deleteMany({
      where: { id: { in: ids.map((r) => r.id) } },
    });
    deleted += result.count;
    batches += 1;
    if (ids.length < batchSize) break;
  }

  console.log(
    JSON.stringify({
      event: "click_retention_run",
      deleted,
      cutoff: cutoff.toISOString(),
      retentionDays: options.retentionDays,
      batches,
    }),
  );

  return { deleted, cutoff: cutoff.toISOString(), batches };
}
