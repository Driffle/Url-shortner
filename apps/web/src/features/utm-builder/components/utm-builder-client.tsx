"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { utmParamsSchema, buildUtmUrl } from "@/shared/validations/utm";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export function UtmBuilderClient() {
  const [baseUrl, setBaseUrl] = useState("https://driffle.com/");
  const [utm_source, setSource] = useState("newsletter");
  const [utm_medium, setMedium] = useState("email");
  const [utm_campaign, setCampaign] = useState("q2-launch");
  const [utm_term, setTerm] = useState("");
  const [utm_content, setContent] = useState("");

  const { preview, error } = useMemo(() => {
    const parsed = utmParamsSchema.safeParse({
      baseUrl,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term: utm_term || undefined,
      utm_content: utm_content || undefined,
    });
    if (!parsed.success) {
      return { preview: "", error: parsed.error.errors[0]?.message ?? "Invalid" };
    }
    try {
      return { preview: buildUtmUrl(parsed.data), error: null as string | null };
    } catch {
      return { preview: "", error: "Could not build URL" };
    }
  }, [baseUrl, utm_source, utm_medium, utm_campaign, utm_term, utm_content]);

  const createHref = preview ? `/links/new?destinationUrl=${encodeURIComponent(preview)}` : "#";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compose</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Base URL</Label>
          <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>utm_source</Label>
            <Input value={utm_source} onChange={(e) => setSource(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>utm_medium</Label>
            <Input value={utm_medium} onChange={(e) => setMedium(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>utm_campaign</Label>
            <Input value={utm_campaign} onChange={(e) => setCampaign(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>utm_term (optional)</Label>
            <Input value={utm_term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>utm_content (optional)</Label>
            <Input value={utm_content} onChange={(e) => setContent(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="space-y-2 rounded-md border bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground">Preview</p>
          <p className="break-all font-mono text-xs">{preview || "—"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!preview}
            onClick={() => {
              if (!preview) return;
              void navigator.clipboard.writeText(preview);
            }}
          >
            Copy URL
          </Button>
          {preview ? (
            <Button type="button" variant="outline" asChild>
              <Link href={createHref}>Open in Create link</Link>
            </Button>
          ) : (
            <Button type="button" variant="outline" disabled>
              Open in Create link
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
