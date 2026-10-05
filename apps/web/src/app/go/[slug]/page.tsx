import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { redirectMetaFromHeaders, resolveSlugForRedirect } from "@/server/services/redirect-resolve.service";
import { scheduleClickIngest } from "@/server/services/click-ingest-schedule";
import { getEnv } from "@/shared/validations/env";
import { createVisitToken } from "@/shared/lib/visit-token";
import { VisitBridge } from "./visit-bridge";

export const dynamic = "force-dynamic";

export default async function GoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const h = await headers();
  const meta = redirectMetaFromHeaders(h);
  const resolved = await resolveSlugForRedirect(raw, meta);

  if (resolved.kind === "rate_limited") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-slate-200">
        <p className="max-w-sm text-sm">Too many requests. Please try again in a minute.</p>
      </div>
    );
  }
  if (resolved.kind === "not_found") {
    notFound();
  }
  if (resolved.kind === "gone") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-slate-200">
        <p className="max-w-sm text-sm">This short link is not available.</p>
      </div>
    );
  }

  scheduleClickIngest(resolved.link.linkId, resolved.meta);

  const holdSeconds = getEnv().VISIT_HOLD_SECONDS;
  const visitToken = createVisitToken(resolved.slug);

  return (
    <VisitBridge
      slug={resolved.slug}
      destinationUrl={resolved.link.destinationUrl}
      visitToken={visitToken}
      holdSeconds={holdSeconds}
    />
  );
}
