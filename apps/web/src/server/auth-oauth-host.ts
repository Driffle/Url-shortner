import type { NextRequest } from "next/server";
import { publicOriginFromAppHost } from "@/shared/lib/auth-redirect";
import {
  ensureGoogleOAuthCallbackEnv,
  googleOAuthCallbackUrlForHost,
  isMultiHostOAuthEnabled,
} from "@/shared/lib/google-oauth-callback";
import { getRequestAppHostFromRequest } from "@/server/request-app-host";
import { isAllowedAppHost, parseAllowedAppHosts } from "@/shared/lib/app-host";

function hostAllowedForOAuth(host: string): boolean {
  const allowed = parseAllowedAppHosts(process.env.ALLOWED_APP_HOSTS);
  return isAllowedAppHost(host, allowed);
}

/** Align Auth.js env (callback + base URL) with the incoming Host before OAuth handlers run. */
export function syncGoogleOAuthCallbackFromRequest(req: NextRequest | Request): void {
  if (!isMultiHostOAuthEnabled()) {
    ensureGoogleOAuthCallbackEnv();
    return;
  }
  const host = getRequestAppHostFromRequest(req);
  if (!host || !hostAllowedForOAuth(host)) {
    ensureGoogleOAuthCallbackEnv();
    return;
  }
  const origin = publicOriginFromAppHost(host);
  process.env.AUTH_URL = origin;
  process.env.NEXTAUTH_URL = origin;
  process.env.GOOGLE_OAUTH_CALLBACK_URL = googleOAuthCallbackUrlForHost(host);
}

type AuthHandler = (req: NextRequest) => Response | Promise<Response>;

export function withOAuthHostSync(handler: AuthHandler): AuthHandler {
  return (req) => {
    syncGoogleOAuthCallbackFromRequest(req);
    return handler(req);
  };
}
