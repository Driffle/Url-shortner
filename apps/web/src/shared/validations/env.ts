import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((s) => s.startsWith("postgresql://") || s.startsWith("postgres://"), "Must be a PostgreSQL URL"),
  REDIS_URL: z.string().min(1),

  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  ALLOWED_EMAIL_DOMAIN: z.string().default("driffle.com"),

  PUBLIC_APP_URL: z.string().url(),
  SHORT_LINK_HOST: z.string().min(1).default("go.driffle.com"),
  /** Exposed to browser for display (optional; falls back to SHORT_LINK_HOST server-side). */
  NEXT_PUBLIC_SHORT_LINK_HOST: z.string().min(1).optional(),

  // Optional: internal API for click ingestion HMAC
  INTERNAL_CLICK_SECRET: z.string().min(16).optional(),

  // Slack (architecture hook; optional at runtime)
  SLACK_WEBHOOK_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

function readEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(msg)}`);
  }
  return parsed.data;
}

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) cached = readEnv();
  return cached;
}
