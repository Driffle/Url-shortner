import { NextResponse } from "next/server";

/**
 * Deployer / cron should POST on a schedule.
 * V2: recompute uniqueVisitors per bucket, campaign-level rollups, backfill from the Redis click queue.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "CRON_SECRET not set" }, { status: 501 });
  const authz = req.headers.get("authorization");
  if (authz !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    message: "Rollup job acknowledged. Wire worker to recompute AnalyticsRollup.uniqueClicks from ClickEvent.",
  });
}
