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

/** Trim, strip wrapping quotes; empty → undefined. If no `http(s)://`, add scheme (Deployer often omits it). */
function normalizeHttpUrlInput(v: unknown): unknown {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") return v;
  let t = v.trim().replace(/^['"]+|['"]+$/g, "");
  if (!t) return undefined;
  if (/^https?:\/\//i.test(t)) {
    t = stripTrailingSlashOnCanonicalOrigin(t);
    return t;
  }
  const lower = t.toLowerCase();
  if (lower.startsWith("localhost") || lower.startsWith("127.0.0.1")) {
    return stripTrailingSlashOnCanonicalOrigin(`http://${t}`);
  }
  return stripTrailingSlashOnCanonicalOrigin(`https://${t}`);
}

/** `https://host/` → `https://host` so OAuth redirect URIs match Google Console entries (no stray slash). */
function stripTrailingSlashOnCanonicalOrigin(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "") || "";
    if (path === "" || path === "/") {
      return `${u.protocol}//${u.host}`;
    }
    return url;
  } catch {
    return url.replace(/\/+$/, "");
  }
}

/** Trim Redis key prefix; empty string → unset (use default `dl`). */
function redisPrefixPreprocess(v: unknown): unknown {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z
      .string()
      .min(1)
      .refine((s) => s.startsWith("postgresql://") || s.startsWith("postgres://"), "Must be a PostgreSQL URL"),
    REDIS_URL: z.string().min(1),
    /**
     * First segment of Redis keys (default `dl`). Managed Redis ACLs often restrict key names;
     * set this to the prefix your user is allowed to use (e.g. `app_driffle_url_shortner`).
     */
    REDIS_KEY_PREFIX: z.preprocess(
      redisPrefixPreprocess,
      z
        .string()
        .min(1)
        .max(256)
        .regex(/^[^\s\r\n\x00]+$/, "REDIS_KEY_PREFIX must not contain whitespace or null bytes")
        .optional()
        .default("dl"),
    ),

    NEXTAUTH_URL: z.preprocess(
      normalizeHttpUrlInput,
      z.string().min(1, "Set NEXTAUTH_URL (e.g. https://shortly.driffle.net)").url({ message: "NEXTAUTH_URL must be a valid URL" }),
    ),
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

    /** If set to 1/true/yes, Google provider is never registered (use when you need password-only despite GOOGLE_* in env). */
    DISABLE_GOOGLE_AUTH: z.string().optional(),

    /** Seconds to wait on `/go/[slug]` before counting a visit and redirecting (default 5). */
    VISIT_HOLD_SECONDS: z.string().optional(),

    ALLOWED_EMAIL_DOMAIN: z.string().default("driffle.com"),

    PUBLIC_APP_URL: z.preprocess(
      normalizeHttpUrlInput,
      z.string().min(1, "Set PUBLIC_APP_URL (usually same origin as NEXTAUTH_URL)").url({ message: "PUBLIC_APP_URL must be a valid URL" }),
    ),
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

    const googleDisabled = ["1", "true", "yes"].includes(
      (data.DISABLE_GOOGLE_AUTH ?? "").trim().toLowerCase(),
    );
    const googleConfigured =
      data.GOOGLE_CLIENT_ID.trim().length > 0 && data.GOOGLE_CLIENT_SECRET.trim().length > 0;
    const useGoogle = googleConfigured && !googleDisabled;

    if (!useGoogle) {
      // Credentials-only mode: @driffle.com users provisioned with `npm run user:set-password`.
      return;
    }
  })
  .transform((data) => {
    const resolved = pickAuthSecret(data);
    let visitHold = 5;
    const raw = data.VISIT_HOLD_SECONDS?.trim();
    if (raw) {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n)) visitHold = Math.min(120, Math.max(1, n));
    }
    return { ...data, NEXTAUTH_SECRET: resolved, VISIT_HOLD_SECONDS: visitHold };
  });

export type Env = z.infer<typeof envSchema>;

function readEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const message = `Invalid environment: ${JSON.stringify(msg)}`;
    console.error(message, parsed.error.issues);
    throw new Error(message);
  }
  return parsed.data;
}

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) cached = readEnv();
  return cached;
}
