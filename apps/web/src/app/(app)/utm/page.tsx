import { UtmBuilderClient } from "@/features/utm-builder/components/utm-builder-client";

export default function UtmPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">UTM builder</h1>
        <p className="text-muted-foreground">Normalized parameters, encoding-safe preview, one-click shorten (coming from Links).</p>
      </div>
      <UtmBuilderClient />
    </div>
  );
}
