"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LinkStatus } from "@prisma/client";
import { BarChart3, Pause, Pencil, Play } from "lucide-react";
import { updateLinkAction } from "@/features/links/actions";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { IconLinkButton } from "@/shared/ui/icon-link-button";

type Props = {
  linkId: string;
  slug: string;
  status: LinkStatus;
  destinationUrl: string;
  canEdit: boolean;
};

export function LinkRowActions({ linkId, slug, status, destinationUrl, canEdit }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [destDraft, setDestDraft] = useState(destinationUrl);

  function runUpdate(input: { status?: LinkStatus; destinationUrl?: string }) {
    setError(null);
    start(async () => {
      try {
        await updateLinkAction({ id: linkId, ...input });
        setEditing(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  return (
    <div className="flex min-w-[6rem] flex-col items-end gap-2">
      <div className="flex items-center justify-end gap-0.5">
        <IconLinkButton
          href={`/analytics?slug=${encodeURIComponent(slug)}&range=30d`}
          icon={BarChart3}
          label={`Analytics for ${slug}`}
        />
        {canEdit ? (
          <>
            {status === "ACTIVE" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={pending}
                title="Pause link"
                aria-label={`Pause ${slug}`}
                onClick={() => runUpdate({ status: "PAUSED" })}
              >
                <Pause className="h-4 w-4" />
              </Button>
            ) : status === "PAUSED" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={pending}
                title="Resume link"
                aria-label={`Resume ${slug}`}
                onClick={() => runUpdate({ status: "ACTIVE" })}
              >
                <Play className="h-4 w-4" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={pending}
              title={editing ? "Cancel edit" : "Edit destination URL"}
              aria-label={editing ? "Cancel edit" : `Edit destination for ${slug}`}
              onClick={() => setEditing((v) => !v)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </>
        ) : null}
      </div>
      {editing ? (
        <form
          className="flex w-full max-w-xs flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            runUpdate({ destinationUrl: destDraft.trim() });
          }}
        >
          <Input
            value={destDraft}
            onChange={(e) => setDestDraft(e.target.value)}
            aria-label={`Destination for ${slug}`}
            required
          />
          <Button type="submit" size="sm" disabled={pending}>
            Save destination
          </Button>
        </form>
      ) : null}
      {error ? <p className="max-w-xs text-right text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
