"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center font-sans">
        <h1 className="text-lg font-semibold text-slate-900">Application error</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The app shell failed to load. Inspect server logs for the stack trace that matches this digest.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground">
            Digest: <span className="text-slate-800">{error.digest}</span>
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
