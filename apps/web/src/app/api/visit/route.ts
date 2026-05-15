import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { RedisKeys } from "@/server/redis/client";
import { rateLimitAllow } from "@/server/services/rate-limit";
import { verifyVisitToken } from "@/shared/lib/visit-token";

export const dynamic = "force-dynamic";

function clientIp(req: Request): string | null {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

export async function POST(req: Request) {
  let body: { slug?: string; token?: string };
  try {
    body = (await req.json()) as { slug?: string; token?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const token = typeof body.token === "string" ? body.token : "";
  if (!slug || !token || !verifyVisitToken(token, slug)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const ip = clientIp(req) ?? "unknown";
  const window = Math.floor(Date.now() / 60_000).toString();
  const ok = await rateLimitAllow(RedisKeys.rateLimitVisitPost(ip, window), 120, 60);
  if (!ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const res = await prisma.link.updateMany({
    where: { slug, status: "ACTIVE" },
    data: { visitCount: { increment: 1 } },
  });
  if (res.count === 0) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
