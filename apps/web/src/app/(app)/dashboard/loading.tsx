export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-8 w-40 rounded bg-muted" />
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-72 rounded-lg bg-muted" />
    </div>
  );
}
