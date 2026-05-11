import { NextResponse } from "next/server";

/** Used by Docker / Deployer healthchecks (no auth). */
export async function GET() {
  return NextResponse.json({ ok: true, service: "driffle-links-web" });
}
