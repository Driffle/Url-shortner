"use client";

import { useEffect, useState } from "react";

type Props = {
  slug: string;
  destinationUrl: string;
  visitToken: string;
  holdSeconds: number;
};

export function VisitBridge({ slug, destinationUrl, visitToken, holdSeconds }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(holdSeconds);

  useEffect(() => {
    const holdMs = Math.max(1, holdSeconds) * 1000;
    const tick = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    const done = setTimeout(async () => {
      clearInterval(tick);
      try {
        await fetch("/api/visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, token: visitToken }),
        });
      } catch {
        // still send the user onward
      }
      window.location.replace(destinationUrl);
    }, holdMs);

    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [slug, destinationUrl, visitToken, holdSeconds]);

  function skip() {
    window.location.replace(destinationUrl);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-4 text-center text-slate-100">
      <div className="max-w-md space-y-2">
        <p className="text-sm uppercase tracking-wide text-slate-400">Driffle short link</p>
        <h1 className="text-xl font-semibold">Taking you to the destination</h1>
        <p className="text-sm text-slate-400">
          Visits are counted after you stay on this page for {holdSeconds} second{holdSeconds === 1 ? "" : "s"}.{" "}
          <span className="font-mono text-slate-200">{secondsLeft}</span>s remaining.
        </p>
      </div>
      <button
        type="button"
        onClick={skip}
        className="text-sm text-slate-400 underline underline-offset-2 hover:text-slate-200"
      >
        Skip (visit will not be counted)
      </button>
    </div>
  );
}
