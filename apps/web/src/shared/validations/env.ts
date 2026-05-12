import { z } from "zod";
import { isAuthBypassed } from "@/shared/lib/auth-bypass";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z
      .string()
      .min(1)
      .refine((s) => s.startsWith("postgresql://") || s.startsWith("postgres://"), "Must be a PostgreSQL URL"),
    REDIS_URL: z.string().min(1),

    NEXTAUTH_URL: z.string().url(),
    /** Auth.js reads `AUTH_SECRET` or `NEXTAUTH_SECRET`; either may be set (32+ chars). */
    NEXTAUTH_SECRET: z.preprocess(
      (val) => {
        if (typeof val === "string" && val.length >= 32) return val;
        const a = process.env.AUTH_SECRET;
        if (typeof a === "string" && a.length >= 32) return a;
        return val;
      },
      z.string().min(32, "Set NEXTAUTH_SECRET or AUTH_SECRET (min 32 characters)"),
    ),

    GOOGLE_CLIENT_ID: z.string().default(""),
    GOOGLE_CLIENT_SECRET: z.string().default(""),

    ALLOWED_EMAIL_DOMAIN: z.string().default("driffle.com"),

    PUBLIC_APP_URL: z.string().url(),
    SHORT_LINK_HOST: z.string().min(1).default("go.driffle.com"),
    /** Exposed to browser for display (optional; falls back to SHORT_LINK_HOST server-side). */
    NEXT_PUBLIC_SHORT_LINK_HOST: z.string().min(1).optional(),

    // Optional: internal API for click ingestion HMAC
    INTERNAL_CLICK_SECRET: z.string().min(16).optional(),

    // Slack (architecture hook; optional at runtime)
    SLACK_WEBHOOK_URL: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    if (isAuthBypassed()) return;
    if (!data.GOOGLE_CLIENT_ID.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GOOGLE_CLIENT_ID is required when sign-in is enabled (or enable PUBLIC_APP_NO_AUTH for no-login mode)",
        path: ["GOOGLE_CLIENT_ID"],
      });
    }
    if (!data.GOOGLE_CLIENT_SECRET.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GOOGLE_CLIENT_SECRET is required when sign-in is enabled (or enable PUBLIC_APP_NO_AUTH for no-login mode)",
        path: ["GOOGLE_CLIENT_SECRET"],
      });
    }
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
