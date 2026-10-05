"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LinkStatus } from "@prisma/client";
import { updateLinkAction } from "@/features/links/actions";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

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

  if (!canEdit) return null;

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
    <div className="flex min-w-[12rem] flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-1">
        {status === "ACTIVE" ? (
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => runUpdate({ status: "PAUSED" })}>
            Pause
          </Button>
        ) : status === "PAUSED" ? (
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => runUpdate({ status: "ACTIVE" })}>
            Resume
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setEditing((v) => !v)}>
          {editing ? "Cancel" : "Edit URL"}
        </Button>
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
