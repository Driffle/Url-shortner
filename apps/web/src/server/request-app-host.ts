import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { hostFromHeaderBag } from "@/shared/lib/app-host";

/** Current request hostname for server components and route handlers. */
export async function getRequestAppHost(): Promise<string> {
  const h = await headers();
  return hostFromHeaderBag((name) => h.get(name));
}

export function getRequestAppHostFromRequest(req: NextRequest | Request): string {
  return hostFromHeaderBag((name) => req.headers.get(name));
}
