import { z } from "zod";

/** Canonical click event published on the redirect hot path (Redis stream field `payload`). */
export const clickEventEnvelopeSchema = z.object({
  eventId: z.string().min(1),
  linkId: z.string().min(1),
  at: z.string().datetime(),
  referer: z.string().nullable(),
  ua: z.string().nullable(),
  countryCode: z.string().length(2).nullable().optional(),
  visitorHash: z.string().min(1),
  referrerDomain: z.string().nullable(),
  deviceType: z.string(),
  osName: z.string(),
  browserName: z.string(),
  isBot: z.boolean(),
  /** Legacy queue items may include raw ip for re-hash; never persisted. */
  ip: z.string().nullable().optional(),
});

export type ClickEventEnvelope = z.infer<typeof clickEventEnvelopeSchema>;

/** Older failure-buffer shape on `dl:queue:clicks`. */
export const legacyClickQueueItemSchema = z.object({
  linkId: z.string().min(1),
  ip: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  referer: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  at: z.string().optional(),
});

export type LegacyClickQueueItem = z.infer<typeof legacyClickQueueItemSchema>;
