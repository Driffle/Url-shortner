import type { NextRequest } from "next/server";
import { handlers } from "@/auth";

/**
 * Google OAuth redirect target: `/api/auth/google/callback`
 * Auth.js expects `/api/auth/callback/google` — rewrite internally so PKCE/state cookies still work.
 */
function forwardToAuthCallback(req: NextRequest): NextRequest {
  const url = new URL(req.url);
  url.pathname = "/api/auth/callback/google";
  return new NextRequest(url, req);
}

export async function GET(req: NextRequest) {
  return handlers.GET(forwardToAuthCallback(req));
}

export async function POST(req: NextRequest) {
  return handlers.POST(forwardToAuthCallback(req));
}
