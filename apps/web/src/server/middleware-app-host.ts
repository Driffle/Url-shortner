import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { hostFromHeaderBag, isAllowedAppHost, parseAllowedAppHosts } from "@/shared/lib/app-host";

let cachedAllowed: Set<string> | null | undefined;

function allowedHosts(): Set<string> | null {
  if (cachedAllowed === undefined) {
    cachedAllowed = parseAllowedAppHosts(process.env.ALLOWED_APP_HOSTS);
  }
  return cachedAllowed;
}

/** Returns a 404 response when the Host is not on the allowlist; otherwise `null`. */
export function rejectUnknownAppHost(req: NextRequest): NextResponse | null {
  const allowed = allowedHosts();
  if (!allowed) return null;
  const host = hostFromHeaderBag((name) => req.headers.get(name));
  if (!host || !isAllowedAppHost(host, allowed)) {
    return new NextResponse("Not Found", { status: 404 });
  }
  return null;
}
