import { NextResponse } from "next/server";
import { runAnalyticsRollup } from "@/server/services/rollup.service";

/** Deployer / cron should POST on a schedule with `Authorization: Bearer ${CRON_SECRET}`. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "CRON_SECRET not set" }, { status: 501 });
  const authz = req.headers.get("authorization");
  if (authz !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const url = new URL(req.url);
  const lookbackDays = Number(url.searchParams.get("lookbackDays") ?? "14");

  const result = await runAnalyticsRollup({
    lookbackDays: Number.isFinite(lookbackDays) && lookbackDays > 0 ? lookbackDays : 14,
  });

  return NextResponse.json({
    ok: true,
    linkBucketsUpdated: result.linkBucketsUpdated,
    campaignBucketsUpdated: result.campaignBucketsUpdated,
    worker: result.worker,
    daysProcessed: result.daysProcessed,
  });
}
