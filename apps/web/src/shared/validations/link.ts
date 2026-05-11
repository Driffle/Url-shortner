import { z } from "zod";
import { LinkStatus } from "@prisma/client";

const slugRegex = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

export const createLinkSchema = z.object({
  destinationUrl: z.string().url().max(2048),
  customSlug: z
    .string()
    .max(64)
    .optional()
    .transform((s) => (s && s.trim() !== "" ? s.trim().toLowerCase() : undefined))
    .refine((s) => s === undefined || slugRegex.test(s), {
      message: "Slug: lowercase letters, numbers, hyphens; 3–64 chars; no leading/trailing hyphen",
    }),
  campaignId: z.string().cuid().optional(),
  expiresAt: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().min(1).max(32)).max(20).optional(),
  status: z.nativeEnum(LinkStatus).default("ACTIVE"),
});

export const updateLinkSchema = createLinkSchema.partial().extend({
  id: z.string().cuid(),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
