import type { Link, Prisma, UserRole } from "@prisma/client";
import { createLinkSchema, updateLinkSchema } from "@/shared/validations/link";
import { assertSafeDestination } from "@/server/services/url-safety";
import { randomSlug } from "@/server/services/slug-generator";
import { linkRepository } from "@/server/repositories/link-repository";
import { slugCacheService } from "@/server/services/slug-cache.service";
import { prisma } from "@/server/db/prisma";
import { can, Permissions } from "@/shared/lib/rbac";

export class LinkService {
  async createLink(actorId: string, role: UserRole, raw: unknown): Promise<Link> {
    if (!can(role, Permissions.editLinks)) {
      throw new Error(
        "Your role is Viewer, which cannot create links. Ask an admin to change your account to Editor or Admin in the database (User.role).",
      );
    }
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

    await slugCacheService.invalidateOrRefresh(slug, {
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
    if (!can(role, Permissions.deleteLinks)) {
      throw new Error("Only Admin accounts can delete links.");
    }
    const link = await linkRepository.findById(linkId);
    if (!link) throw new Error("Not found");
    await linkRepository.delete(linkId);
    await slugCacheService.invalidateOrRefresh(link.slug, null);
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

  async updateLink(actorId: string, role: UserRole, raw: unknown): Promise<Link> {
    if (!can(role, Permissions.editLinks)) {
      throw new Error("Your role cannot edit links.");
    }
    const input = updateLinkSchema.parse(raw);
    const existing = await linkRepository.findById(input.id);
    if (!existing) throw new Error("Not found");

    if (input.destinationUrl !== undefined) {
      assertSafeDestination(input.destinationUrl);
    }

    const data: Prisma.LinkUpdateInput = {};
    if (input.destinationUrl !== undefined) data.destinationUrl = input.destinationUrl;
    if (input.campaignId !== undefined) data.campaign = { connect: { id: input.campaignId } };
    if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.tags !== undefined) data.tags = input.tags;
    if (input.status !== undefined) data.status = input.status;

    const link = await linkRepository.update(input.id, data);

    await slugCacheService.invalidateOrRefresh(link.slug, {
      destinationUrl: link.destinationUrl,
      linkId: link.id,
      status: link.status,
      expiresAt: link.expiresAt?.toISOString() ?? null,
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: "LINK_UPDATE",
        entityType: "Link",
        entityId: link.id,
        metadata: { slug: link.slug },
      },
    });

    return link;
  }
}

export const linkService = new LinkService();
