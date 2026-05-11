import type { Link, UserRole } from "@prisma/client";
import { createLinkSchema } from "@/shared/validations/link";
import { assertSafeDestination } from "@/server/services/url-safety";
import { randomSlug } from "@/server/services/slug-generator";
import { linkRepository } from "@/server/repositories/link-repository";
import { slugCacheService } from "@/server/services/slug-cache.service";
import { prisma } from "@/server/db/prisma";
import { can, Permissions } from "@/shared/lib/rbac";

export class LinkService {
  async createLink(actorId: string, role: UserRole, raw: unknown): Promise<Link> {
    if (!can(role, Permissions.editLinks)) throw new Error("Forbidden");
    const input = createLinkSchema.parse(raw);
    assertSafeDestination(input.destinationUrl);

    let slug = input.customSlug?.toLowerCase() ?? "";
    if (!slug) {
      for (let i = 0; i < 12; i++) {
        const candidate = randomSlug(7);
        const exists = await linkRepository.findBySlug(candidate);
        if (!exists) {
          slug = candidate;
          break;
        }
      }
      if (!slug) throw new Error("Could not allocate slug");
    } else {
      const exists = await linkRepository.findBySlug(slug);
      if (exists) throw new Error("Slug already in use");
    }

    const link = await linkRepository.create({
      slug,
      destinationUrl: input.destinationUrl,
      campaign: input.campaignId ? { connect: { id: input.campaignId } } : undefined,
      expiresAt: input.expiresAt,
      notes: input.notes,
      tags: input.tags ?? [],
      status: input.status,
      createdBy: { connect: { id: actorId } },
    });

    await slugCacheService.set(slug, {
      destinationUrl: link.destinationUrl,
      linkId: link.id,
      status: link.status,
      expiresAt: link.expiresAt?.toISOString() ?? null,
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: "LINK_CREATE",
        entityType: "Link",
        entityId: link.id,
        metadata: { slug: link.slug },
      },
    });

    return link;
  }

  async deleteLink(actorId: string, role: UserRole, linkId: string): Promise<void> {
    if (!can(role, Permissions.deleteLinks)) throw new Error("Forbidden");
    const link = await linkRepository.findById(linkId);
    if (!link) throw new Error("Not found");
    await linkRepository.delete(linkId);
    await slugCacheService.invalidate(link.slug);
    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: "LINK_DELETE",
        entityType: "Link",
        entityId: linkId,
        metadata: { slug: link.slug },
      },
    });
  }
}

export const linkService = new LinkService();
