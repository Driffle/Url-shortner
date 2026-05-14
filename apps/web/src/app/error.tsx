"use client";

import { useEffect } from "react";

/**
 * Catches errors in this route segment’s Server Components (not the root `layout.tsx`).
 * The digest matches server logs / container output for support.
 */
export default function AppRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        This page failed to render. Common causes: database unreachable, schema out of date (run{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">prisma db push</code> or migrate), or
        invalid environment variables. Check the web container logs for the full stack trace.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          Error digest: <span className="text-slate-700">{error.digest}</span>
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
