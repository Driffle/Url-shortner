import { cn } from "@/shared/lib/utils";

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function DashboardPageSkeleton() {
  return (
    <div className="space-y-8" aria-busy aria-label="Loading dashboard">
      <div className="space-y-2">
        <Bone className="h-8 w-56" />
        <Bone className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Bone key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Bone className="h-72 rounded-lg lg:col-span-2" />
        <Bone className="h-72 rounded-lg" />
      </div>
      <Bone className="h-48 rounded-lg" />
    </div>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-8" aria-busy aria-label="Loading analytics">
      <div className="flex items-start gap-2">
        <Bone className="h-8 w-40" />
        <Bone className="h-7 w-7 rounded-md" />
      </div>
      <div className="flex flex-col-reverse gap-3 lg:flex-row lg:justify-between">
        <Bone className="h-10 w-full max-w-md" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Bone key={i} className="h-9 w-16" />
          ))}
        </div>
      </div>
      <Bone className="h-28 rounded-lg" />
      <Bone className="h-80 rounded-lg" />
      <div className="grid gap-6 md:grid-cols-2">
        <Bone className="h-56 rounded-lg" />
        <Bone className="h-56 rounded-lg" />
      </div>
    </div>
  );
}

export function LinksPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading links">
      <div className="flex justify-between gap-4">
        <Bone className="h-8 w-32" />
        <Bone className="h-10 w-28" />
      </div>
      <div className="flex gap-2">
        <Bone className="h-10 w-56" />
        <Bone className="h-10 w-32" />
        <Bone className="h-10 w-20" />
      </div>
      <Bone className="h-[28rem] rounded-lg" />
    </div>
  );
}

export function CampaignsPageSkeleton() {
  return (
    <div className="space-y-8" aria-busy aria-label="Loading campaigns">
      <Bone className="h-8 w-40" />
      <Bone className="h-36 rounded-lg" />
      <Bone className="h-80 rounded-lg" />
    </div>
  );
}

export function ShareAnalyticsPageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:py-10" aria-busy aria-label="Loading shared analytics">
      <div className="space-y-2 border-b border-border pb-6">
        <Bone className="h-3 w-40" />
        <Bone className="h-8 w-64" />
        <Bone className="h-4 w-full max-w-lg" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Bone key={i} className="h-9 w-16" />
        ))}
      </div>
      <Bone className="h-28 rounded-lg" />
      <Bone className="h-80 rounded-lg" />
      <div className="grid gap-6 md:grid-cols-2">
        <Bone className="h-56 rounded-lg" />
        <Bone className="h-56 rounded-lg" />
      </div>
    </div>
  );
}
