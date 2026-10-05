import { NextResponse } from "next/server";
import { getReadinessReport } from "@/server/health/dependencies";

/** Readiness: Postgres, Redis, and production config guardrails. */
export async function GET() {
  const report = await getReadinessReport();
  if (!report.ok) {
    return NextResponse.json(report, { status: 503 });
  }
  return NextResponse.json({ ...report, service: "driffle-links-web" });
}
