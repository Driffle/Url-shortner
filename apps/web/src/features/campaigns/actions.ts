"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAppSession } from "@/server/auth-session";
import { prisma } from "@/server/db/prisma";
import { can, Permissions } from "@/shared/lib/rbac";
import { CampaignStatus } from "@prisma/client";

const campaignSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.nativeEnum(CampaignStatus).default("DRAFT"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  tags: z.array(z.string().min(1).max(32)).max(20).optional(),
});

export async function createCampaignAction(input: unknown) {
  const session = await getAppSession();
  if (!session?.user?.id || !session.user.role) throw new Error("Unauthorized");
  if (!can(session.user.role, Permissions.manageCampaigns)) throw new Error("Forbidden");
  const data = campaignSchema.parse(input);
  const campaign = await prisma.campaign.create({
    data: {
      name: data.name,
      description: data.description,
      status: data.status,
      startDate: data.startDate,
      endDate: data.endDate,
      tags: data.tags ?? [],
      ownerId: session.user.id,
    },
  });
  revalidatePath("/campaigns");
  return { ok: true as const, campaign };
}
