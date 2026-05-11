import type { Link, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export class LinkRepository {
  findBySlug(slug: string): Promise<Link | null> {
    return prisma.link.findUnique({ where: { slug: slug.toLowerCase() } });
  }

  findById(id: string): Promise<Link | null> {
    return prisma.link.findUnique({ where: { id } });
  }

  list(params: { take: number; skip: number; q?: string; campaignId?: string }): Promise<Link[]> {
    const where: Prisma.LinkWhereInput = {};
    if (params.q) {
      where.OR = [
        { slug: { contains: params.q, mode: "insensitive" } },
        { destinationUrl: { contains: params.q, mode: "insensitive" } },
        { notes: { contains: params.q, mode: "insensitive" } },
      ];
    }
    if (params.campaignId) where.campaignId = params.campaignId;
    return prisma.link.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params.take,
      skip: params.skip,
      include: { campaign: { select: { id: true, name: true } } },
    });
  }

  create(data: Prisma.LinkCreateInput): Promise<Link> {
    return prisma.link.create({ data });
  }

  update(id: string, data: Prisma.LinkUpdateInput): Promise<Link> {
    return prisma.link.update({ where: { id }, data });
  }

  delete(id: string): Promise<Link> {
    return prisma.link.delete({ where: { id } });
  }
}

export const linkRepository = new LinkRepository();
