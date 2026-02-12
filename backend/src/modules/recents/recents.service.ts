import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type RecentItemType = 'SPACE' | 'BOARD' | 'TASK';

@Injectable()
export class RecentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get recent items for a user, ordered by last accessed time.
   * Limits to 20 results, includes search support.
   */
  async getRecent(userId: string, search?: string, limit = 20) {
    const items = await this.prisma.recentItem.findMany({
      where: { userId },
      include: {
        space: { select: { id: true, name: true, key: true, iconUrl: true } },
        board: {
          select: {
            id: true, name: true, spaceId: true,
            space: { select: { key: true, name: true } },
          },
        },
        task: {
          select: {
            id: true, title: true, key: true, type: true,
            status: { select: { name: true, color: true } },
            space: { select: { key: true, name: true } },
          },
        },
      },
      orderBy: { accessedAt: 'desc' },
      take: limit,
    });

    const results = items.map((item) => ({
      id: item.id,
      entityType: item.entityType,
      accessedAt: item.accessedAt,
      entity: item.space || item.board || item.task,
    }));

    // Client-side search filter (on name/title/key)
    if (search) {
      const q = search.toLowerCase();
      return results.filter((r) => {
        const entity = r.entity as any;
        return (
          entity?.name?.toLowerCase().includes(q) ||
          entity?.title?.toLowerCase().includes(q) ||
          entity?.key?.toLowerCase().includes(q)
        );
      });
    }

    return results;
  }

  /**
   * Record a recent access. Uses upsert to update the timestamp
   * if the item was already in recents.
   */
  async trackAccess(userId: string, entityType: RecentItemType, entityId: string) {
    const fieldMap: Record<RecentItemType, string> = {
      SPACE: 'spaceId',
      BOARD: 'boardId',
      TASK: 'taskId',
    };
    const field = fieldMap[entityType];

    // Use raw query for upsert since composite unique varies by entity type
    const existing = await this.prisma.recentItem.findFirst({
      where: { userId, entityType, [field]: entityId },
    });

    if (existing) {
      return this.prisma.recentItem.update({
        where: { id: existing.id },
        data: { accessedAt: new Date() },
      });
    }

    return this.prisma.recentItem.create({
      data: { userId, entityType, [field]: entityId },
    });
  }
}
