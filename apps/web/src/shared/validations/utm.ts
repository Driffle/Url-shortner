import { z } from "zod";

function normalizeUtmPart(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

export const utmParamsSchema = z.object({
  baseUrl: z.string().url().max(2048),
  utm_source: z.string().min(1).max(120).transform(normalizeUtmPart),
  utm_medium: z.string().min(1).max(120).transform(normalizeUtmPart),
  utm_campaign: z.string().min(1).max(120).transform(normalizeUtmPart),
  utm_term: z.string().max(120).optional().transform((s) => (s ? normalizeUtmPart(s) : undefined)),
  utm_content: z.string().max(120).optional().transform((s) => (s ? normalizeUtmPart(s) : undefined)),
});

export type UtmParamsInput = z.infer<typeof utmParamsSchema>;

export function buildUtmUrl(input: UtmParamsInput): string {
  const u = new URL(input.baseUrl);
  u.searchParams.set("utm_source", input.utm_source);
  u.searchParams.set("utm_medium", input.utm_medium);
  u.searchParams.set("utm_campaign", input.utm_campaign);
  if (input.utm_term) u.searchParams.set("utm_term", input.utm_term);
  if (input.utm_content) u.searchParams.set("utm_content", input.utm_content);
  return u.toString();
}
