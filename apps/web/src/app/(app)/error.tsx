"use client";

import { useEffect } from "react";

export default function AppShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app shell error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-semibold">This screen failed to load</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Often a database or Prisma issue (missing columns after a deploy). See container logs for details.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          Digest: <span className="text-foreground">{error.digest}</span>
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted"
      >
        Try again
      </button>
    </div>
  );
}
