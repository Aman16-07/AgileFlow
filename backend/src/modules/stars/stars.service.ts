import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type StarrableType = 'SPACE' | 'BOARD' | 'TASK';

@Injectable()
export class StarsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStarred(userId: string) {
    const stars = await this.prisma.star.findMany({
      where: { userId },
      include: {
        space: { select: { id: true, name: true, key: true, iconUrl: true } },
        board: { select: { id: true, name: true, spaceId: true } },
        task: {
          select: {
            id: true, title: true, key: true, type: true, priority: true,
            status: { select: { name: true, color: true } },
            space: { select: { key: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return stars.map((s) => ({
      id: s.id,
      entityType: s.entityType,
      createdAt: s.createdAt,
      entity: s.space || s.board || s.task,
    }));
  }

  async toggle(userId: string, entityType: StarrableType, entityId: string) {
    const fieldMap: Record<StarrableType, string> = {
      SPACE: 'spaceId',
      BOARD: 'boardId',
      TASK: 'taskId',
    };
    const field = fieldMap[entityType];

    // Check if already starred
    const existing = await this.prisma.star.findFirst({
      where: { userId, entityType, [field]: entityId },
    });

    if (existing) {
      await this.prisma.star.delete({ where: { id: existing.id } });
      return { starred: false };
    }

    await this.prisma.star.create({
      data: { userId, entityType, [field]: entityId },
    });
    return { starred: true };
  }

  async isStarred(userId: string, entityType: StarrableType, entityId: string): Promise<boolean> {
    const fieldMap: Record<StarrableType, string> = {
      SPACE: 'spaceId',
      BOARD: 'boardId',
      TASK: 'taskId',
    };
    const existing = await this.prisma.star.findFirst({
      where: { userId, entityType, [fieldMap[entityType]]: entityId },
    });
    return !!existing;
  }
}
