import { NextResponse, type NextRequest } from "next/server";
import {
  redirectMetaFromHeaders,
  resolveSlugForRedirect,
} from "@/server/services/redirect-resolve.service";
import { scheduleClickIngest } from "@/server/services/click-ingest-schedule";
import { recordRedirect } from "@/server/observability/metrics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const started = performance.now();
  const { slug: raw } = await ctx.params;
  const meta = redirectMetaFromHeaders(req.headers);
  const resolved = await resolveSlugForRedirect(raw, meta);
  const durationMs = Math.round(performance.now() - started);

  if (resolved.kind === "rate_limited") {
    return new NextResponse("Too Many Requests", { status: 429 });
  }
  if (resolved.kind === "not_found") {
    return new NextResponse("Not Found", { status: 404 });
  }
  if (resolved.kind === "gone") {
    return new NextResponse("Gone", { status: 410 });
  }

  recordRedirect(durationMs, resolved.cacheHit);
  console.log(
    JSON.stringify({
      event: "redirect",
      slug: resolved.slug,
      linkId: resolved.link.linkId,
      cacheHit: resolved.cacheHit,
      durationMs,
    }),
  );

  scheduleClickIngest(resolved.link.linkId, resolved.meta);

  return NextResponse.redirect(resolved.link.destinationUrl, { status: 302 });
}
