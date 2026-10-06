"use client";

import { useCallback, useState } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/shared/ui/button";

type Props = {
  shareUrl: string;
};

export function ShareAnalyticsViewButton({ shareUrl }: Props) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setState("copied");
      window.setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 2500);
    }
  }, [shareUrl]);

  return (
    <div className="space-y-1">
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void copy()}>
        <Link2 className="h-4 w-4" />
        {state === "copied" ? "Link copied" : state === "error" ? "Copy failed" : "Copy public link"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Anyone with the link can view analytics for this slug and date range (read-only, no app navigation).
      </p>
    </div>
  );
}
