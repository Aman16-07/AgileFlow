import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async findByTask(taskId: string, cursor?: string, limit: any = 20) {
    const take = typeof limit === 'string' ? parseInt(limit, 10) : (limit || 20);
    const comments = await this.prisma.comment.findMany({
      where: { taskId, parentId: null }, // Top-level comments only
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        replies: {
          include: {
            author: { select: { id: true, displayName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = comments.length > take;
    const items = hasMore ? comments.slice(0, take) : comments;

    return { items, nextCursor: hasMore ? items[items.length - 1].id : null, hasMore };
  }

  async create(taskId: string, authorId: string, content: string, parentId?: string) {
    const comment = await this.prisma.comment.create({
      data: { taskId, authorId, content, parentId },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        taskId,
        userId: authorId,
        action: 'COMMENTED',
        metadata: JSON.stringify({ commentId: comment.id }),
      },
    });

    // Broadcast via WebSocket
    this.realtime.emitCommentAdded(taskId, comment);

    return comment;
  }

  async update(id: string, userId: string, content: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('Cannot edit others\' comments');

    return this.prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async delete(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('Cannot delete others\' comments');

    return this.prisma.comment.delete({ where: { id } });
  }
}
