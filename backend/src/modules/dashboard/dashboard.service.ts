import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * "For You" dashboard — aggregates multiple data sources.
   * 
   * Queries:
   * 1. Recent spaces the user is a member of
   * 2. Tasks assigned to user
   * 3. Tasks recently worked on by user
   * 4. Summary metrics
   * 5. Status distribution
   * 6. Priority breakdown
   * 7. Activity feed
   */
  async getForYou(userId: string) {
    const [
      recentSpaces,
      assignedToMe,
      workedOn,
      viewedRecently,
      metrics,
      activityFeed,
    ] = await Promise.all([
      this.getRecentSpaces(userId),
      this.getAssignedToMe(userId),
      this.getWorkedOn(userId),
      this.getViewedRecently(userId),
      this.getMetrics(userId),
      this.getActivityFeed(userId),
    ]);

    return {
      recentSpaces,
      assignedToMe,
      workedOn,
      viewedRecently,
      metrics,
      activityFeed,
    };
  }

  private async getRecentSpaces(userId: string) {
    const memberships = await this.prisma.spaceMember.findMany({
      where: { userId },
      include: {
        space: {
          select: {
            id: true, name: true, key: true, slug: true, iconUrl: true,
            _count: { select: { tasks: true, members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
      take: 6,
    });
    return memberships.map((m) => ({ ...m.space, role: m.role }));
  }

  private async getAssignedToMe(userId: string) {
    return this.prisma.task.findMany({
      where: { assigneeId: userId },
      select: {
        id: true, title: true, key: true, type: true, priority: true,
        createdAt: true, updatedAt: true,
        status: { select: { name: true, color: true, slug: true } },
        space: { select: { key: true, name: true } },
        assignee: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  }

  private async getWorkedOn(userId: string) {
    // Tasks with recent user activity
    const recentActivities = await this.prisma.activity.findMany({
      where: { userId },
      distinct: ['taskId'],
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { taskId: true },
    });

    const taskIds = recentActivities.map((a) => a.taskId);

    return this.prisma.task.findMany({
      where: { id: { in: taskIds } },
      select: {
        id: true, title: true, key: true, type: true, priority: true,
        createdAt: true, updatedAt: true,
        status: { select: { name: true, color: true, slug: true } },
        space: { select: { key: true, name: true } },
        assignee: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  private async getViewedRecently(userId: string) {
    const recentItems = await this.prisma.recentItem.findMany({
      where: { userId, entityType: 'TASK' },
      include: {
        task: {
          select: {
            id: true, title: true, key: true, type: true, priority: true,
            updatedAt: true,
            status: { select: { name: true, color: true } },
            space: { select: { key: true, name: true } },
            assignee: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { accessedAt: 'desc' },
      take: 10,
    });

    return recentItems.filter((r) => r.task).map((r) => ({
      ...r.task,
      accessedAt: r.accessedAt,
    }));
  }

  private async getMetrics(userId: string) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all user spaces
    const spaceIds = (
      await this.prisma.spaceMember.findMany({
        where: { userId },
        select: { spaceId: true },
      })
    ).map((m) => m.spaceId);

    const [completed, updated, created, dueSoon, statusDistribution, priorityBreakdown, typeBreakdown] =
      await Promise.all([
        // Completed this week
        this.prisma.task.count({
          where: {
            spaceId: { in: spaceIds },
            status: { category: 'DONE' },
            updatedAt: { gte: weekAgo },
          },
        }),
        // Updated this week
        this.prisma.task.count({
          where: {
            spaceId: { in: spaceIds },
            updatedAt: { gte: weekAgo },
          },
        }),
        // Created this week
        this.prisma.task.count({
          where: {
            spaceId: { in: spaceIds },
            createdAt: { gte: weekAgo },
          },
        }),
        // Due soon (next 3 days)
        this.prisma.task.count({
          where: {
            spaceId: { in: spaceIds },
            dueDate: {
              gte: now,
              lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
            },
            status: { category: { not: 'DONE' } },
          },
        }),
        // Status distribution (aggregate by category)
        this.prisma.task.groupBy({
          by: ['statusId'],
          where: { spaceId: { in: spaceIds } },
          _count: true,
        }),
        // Priority breakdown
        this.prisma.task.groupBy({
          by: ['priority'],
          where: { spaceId: { in: spaceIds } },
          _count: true,
        }),
        // Type breakdown
        this.prisma.task.groupBy({
          by: ['type'],
          where: { spaceId: { in: spaceIds } },
          _count: true,
        }),
      ]);

    return {
      completed,
      updated,
      created,
      dueSoon,
      statusDistribution,
      priorityBreakdown: priorityBreakdown.map((p) => ({ priority: p.priority, count: p._count })),
      typeBreakdown: typeBreakdown.map((t) => ({ type: t.type, count: t._count })),
    };
  }

  private async getActivityFeed(userId: string) {
    // Get all spaces the user belongs to
    const spaceIds = (
      await this.prisma.spaceMember.findMany({
        where: { userId },
        select: { spaceId: true },
      })
    ).map((m) => m.spaceId);

    return this.prisma.activity.findMany({
      where: { task: { spaceId: { in: spaceIds } } },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
        task: { select: { id: true, title: true, key: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
