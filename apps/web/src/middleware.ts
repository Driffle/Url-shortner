import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAuthBypassed } from "@/shared/lib/auth-bypass";
import { getEnv } from "@/shared/validations/env";
import { rejectUnknownAppHost } from "@/server/middleware-app-host";

const protectedPrefixes = ["/dashboard", "/links", "/campaigns", "/analytics", "/utm", "/settings"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Internal probes (Docker healthcheck, k8s) hit 127.0.0.1 without a public Host.
  if (pathname === "/api/health" || pathname.startsWith("/api/health/")) {
    return NextResponse.next();
  }

  const hostReject = rejectUnknownAppHost(req);
  if (hostReject) return hostReject;
  const isProtected = protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  if (isAuthBypassed()) return NextResponse.next();

  const token = await getToken({
    req,
    secret: getEnv().NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!token?.sub) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
