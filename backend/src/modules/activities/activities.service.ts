import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async getByTask(taskId: string, cursor?: string, limit = 20) {
    const activities = await this.prisma.activity.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = activities.length > limit;
    const items = hasMore ? activities.slice(0, limit) : activities;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null, hasMore };
  }

  async getByUser(userId: string, limit = 20) {
    return this.prisma.activity.findMany({
      where: { userId },
      include: {
        task: { select: { id: true, title: true, key: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getBySpace(spaceId: string, limit = 30) {
    return this.prisma.activity.findMany({
      where: { task: { spaceId } },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
        task: { select: { id: true, title: true, key: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
