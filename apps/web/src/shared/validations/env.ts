import { z } from "zod";
import { isAuthBypassedFromEnvFields } from "@/shared/lib/auth-bypass";

/** Compose / Deployer often set `VAR=` (empty). Treat as unset for optional fields. */
function emptyEnvToUndefined(v: unknown): unknown {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") return v;
  const t = v.trim();
  return t === "" ? undefined : t;
}

/** Picks the first 32+ character value from `AUTH_SECRET` or `NEXTAUTH_SECRET`, or empty string. */
function pickAuthSecret(data: { AUTH_SECRET?: string | undefined; NEXTAUTH_SECRET?: string | undefined }): string {
  const a = (data.AUTH_SECRET ?? "").trim();
  const n = (data.NEXTAUTH_SECRET ?? "").trim();
  if (a.length >= 32) return a;
  if (n.length >= 32) return n;
  return "";
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z
      .string()
      .min(1)
      .refine((s) => s.startsWith("postgresql://") || s.startsWith("postgres://"), "Must be a PostgreSQL URL"),
    REDIS_URL: z.string().min(1),

    NEXTAUTH_URL: z.string().url(),
    /** Legacy name; use either this or `AUTH_SECRET` (32+ chars). Output is normalized in `transform`. */
    NEXTAUTH_SECRET: z.string().optional(),
    /** Auth.js v5 name; either secret may be set. */
    AUTH_SECRET: z.string().optional(),

    /** Open access (server); validated here so bypass rules do not read raw `process.env` in Zod refiners. */
    PUBLIC_APP_NO_AUTH: z.string().optional(),
    NEXT_PUBLIC_PUBLIC_APP_NO_AUTH: z.string().optional(),
    /** Local dev only with `NODE_ENV=development`. */
    DISABLE_AUTH: z.string().optional(),

    GOOGLE_CLIENT_ID: z.string().default(""),
    GOOGLE_CLIENT_SECRET: z.string().default(""),

    ALLOWED_EMAIL_DOMAIN: z.string().default("driffle.com"),

    PUBLIC_APP_URL: z.string().url(),
    SHORT_LINK_HOST: z.string().min(1).default("go.driffle.com"),
    /** Exposed to browser for display (optional; falls back to SHORT_LINK_HOST server-side). */
    NEXT_PUBLIC_SHORT_LINK_HOST: z.preprocess(emptyEnvToUndefined, z.string().min(1).optional()),

    // Optional: internal API for click ingestion HMAC
    INTERNAL_CLICK_SECRET: z.preprocess(emptyEnvToUndefined, z.string().min(16).optional()),

    // Slack (architecture hook; optional at runtime)
    SLACK_WEBHOOK_URL: z.preprocess(emptyEnvToUndefined, z.string().url().optional()),
  })
  .superRefine((data, ctx) => {
    const resolved = pickAuthSecret(data);
    if (resolved.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Set NEXTAUTH_SECRET or AUTH_SECRET (min 32 characters)",
        path: ["NEXTAUTH_SECRET"],
      });
    }

    const bypass = isAuthBypassedFromEnvFields({
      PUBLIC_APP_NO_AUTH: data.PUBLIC_APP_NO_AUTH,
      NEXT_PUBLIC_PUBLIC_APP_NO_AUTH: data.NEXT_PUBLIC_PUBLIC_APP_NO_AUTH,
      DISABLE_AUTH: data.DISABLE_AUTH,
      NODE_ENV: data.NODE_ENV,
    });
    if (bypass) return;

    if (!data.GOOGLE_CLIENT_ID.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "GOOGLE_CLIENT_ID is required when sign-in is enabled (or enable PUBLIC_APP_NO_AUTH for no-login mode)",
        path: ["GOOGLE_CLIENT_ID"],
      });
    }
    if (!data.GOOGLE_CLIENT_SECRET.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "GOOGLE_CLIENT_SECRET is required when sign-in is enabled (or enable PUBLIC_APP_NO_AUTH for no-login mode)",
        path: ["GOOGLE_CLIENT_SECRET"],
      });
    }
  })
  .transform((data) => {
    const resolved = pickAuthSecret(data);
    return { ...data, NEXTAUTH_SECRET: resolved };
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
