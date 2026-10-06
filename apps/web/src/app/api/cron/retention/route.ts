import { NextResponse } from "next/server";
import { getEnv } from "@/shared/validations/env";
import { purgeOldClickEvents } from "@/server/services/click-retention.service";

/** Scheduled raw click cleanup — rollups retained. Bearer `CRON_SECRET`. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "CRON_SECRET not set" }, { status: 501 });
  const authz = req.headers.get("authorization");
  if (authz !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const env = getEnv();
  const retentionDays = env.CLICK_EVENT_RETENTION_DAYS;

  const result = await purgeOldClickEvents({ retentionDays });

  return NextResponse.json({ ok: true, ...result, retentionDays });
}
