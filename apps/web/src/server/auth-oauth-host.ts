import type { NextRequest } from "next/server";
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

/** Set `GOOGLE_OAUTH_CALLBACK_URL` from the incoming Host before Auth.js handles OAuth. */
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
  process.env.GOOGLE_OAUTH_CALLBACK_URL = googleOAuthCallbackUrlForHost(host);
}

type AuthHandler = (req: NextRequest) => Response | Promise<Response>;

export function withOAuthHostSync(handler: AuthHandler): AuthHandler {
  return (req) => {
    syncGoogleOAuthCallbackFromRequest(req);
    return handler(req);
  };
}
