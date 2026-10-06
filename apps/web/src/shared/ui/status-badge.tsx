import type { LinkStatus } from "@prisma/client";
import { cn } from "@/shared/lib/utils";

const styles: Record<LinkStatus, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100",
  PAUSED: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100",
  EXPIRED: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
};

export function LinkStatusBadge({ status }: { status: LinkStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide",
        styles[status] ?? styles.ACTIVE,
      )}
    >
      {status}
    </span>
  );
}
