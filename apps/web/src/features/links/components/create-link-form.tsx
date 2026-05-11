"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLinkAction } from "@/features/links/actions";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type CampaignOpt = { id: string; name: string };

export function CreateLinkForm({
  campaigns,
  shortLinkHost,
  defaultDestination,
}: {
  campaigns: CampaignOpt[];
  shortLinkHost: string;
  defaultDestination?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const host = shortLinkHost;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          action={(fd) => {
            setError(null);
            start(async () => {
              try {
                const tagsRaw = fd.get("tags")?.toString() ?? "";
                const tags = tagsRaw
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);
                const res = await createLinkAction({
                  destinationUrl: fd.get("destinationUrl")?.toString(),
                  customSlug: fd.get("customSlug")?.toString() || undefined,
                  campaignId: fd.get("campaignId")?.toString() || undefined,
                  notes: fd.get("notes")?.toString() || undefined,
                  tags: tags.length ? tags : undefined,
                });
                router.push("/links");
                router.refresh();
                void res;
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not create link");
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="destinationUrl">Destination URL</Label>
            <Input
              id="destinationUrl"
              name="destinationUrl"
              required
              placeholder="https://driffle.com/..."
              defaultValue={defaultDestination ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customSlug">Custom slug (optional)</Label>
            <Input id="customSlug" name="customSlug" placeholder="spring-sale" />
            <p className="text-xs text-muted-foreground">Leave blank for an auto-generated slug. Live URL: {host}/…</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaignId">Campaign</Label>
            <select
              id="campaignId"
              name="campaignId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="">None</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" placeholder="Internal context" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input id="tags" name="tags" placeholder="crm, paid-social" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create link"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
