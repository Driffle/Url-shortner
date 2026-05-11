"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCampaignAction } from "@/features/campaigns/actions";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export function CreateCampaignForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>New campaign</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
          action={(fd) => {
            setError(null);
            start(async () => {
              try {
                await createCampaignAction({
                  name: fd.get("name")?.toString(),
                  description: fd.get("description")?.toString() || undefined,
                });
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not create");
              }
            });
          }}
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Q2 retention — CRM" />
          </div>
          <div className="flex-[2] space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" name="description" placeholder="Internal notes" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Create"}
          </Button>
          {error && <p className="w-full text-sm text-destructive sm:order-last">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
