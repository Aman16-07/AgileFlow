import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class SprintsService {
  constructor(private readonly prisma: PrismaService) {}

  async findBySpace(spaceId: string) {
    return this.prisma.sprint.findMany({
      where: { spaceId },
      include: {
        tasks: {
          include: {
            assignee: { select: { id: true, displayName: true, avatarUrl: true } },
            status: { select: { id: true, name: true, slug: true, color: true, category: true } },
            taskLabels: { include: { label: true } },
          },
          orderBy: { position: 'asc' },
        },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(spaceId: string, data: { name: string; goal?: string; startDate?: string; endDate?: string }) {
    return this.prisma.sprint.create({
      data: {
        spaceId,
        name: data.name,
        goal: data.goal,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async startSprint(sprintId: string) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint) throw new NotFoundException('Sprint not found');
    if (sprint.status !== 'PLANNED') throw new BadRequestException('Sprint must be in PLANNED state');

    // Check no other active sprint exists
    const activeSprint = await this.prisma.sprint.findFirst({
      where: { spaceId: sprint.spaceId, status: 'ACTIVE' },
    });
    if (activeSprint) throw new BadRequestException('Another sprint is already active');

    return this.prisma.sprint.update({
      where: { id: sprintId },
      data: {
        status: 'ACTIVE',
        startDate: sprint.startDate || new Date(),
      },
    });
  }

  async completeSprint(sprintId: string, moveIncompleteToSprintId?: string) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint) throw new NotFoundException('Sprint not found');
    if (sprint.status !== 'ACTIVE') throw new BadRequestException('Sprint must be ACTIVE to complete');

    return this.prisma.$transaction(async (tx: TxClient) => {
      // Find incomplete tasks (not in DONE category)
      const incompleteTasks = await tx.task.findMany({
        where: {
          sprintId,
          status: { category: { not: 'DONE' } },
        },
        select: { id: true },
      });

      // Move incomplete tasks to next sprint or backlog
      if (incompleteTasks.length > 0) {
        await tx.task.updateMany({
          where: { id: { in: incompleteTasks.map((t) => t.id) } },
          data: { sprintId: moveIncompleteToSprintId || null },
        });
      }

      // Complete the sprint
      return tx.sprint.update({
        where: { id: sprintId },
        data: {
          status: 'COMPLETED',
          endDate: sprint.endDate || new Date(),
        },
      });
    });
  }

  async getSprintMetrics(sprintId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { sprintId },
      include: { status: { select: { category: true } } },
    });

    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedPoints = tasks
      .filter((t) => t.status.category === 'DONE')
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status.category === 'DONE').length,
      inProgressTasks: tasks.filter((t) => t.status.category === 'IN_PROGRESS').length,
      todoTasks: tasks.filter((t) => t.status.category === 'TODO').length,
      totalPoints,
      completedPoints,
      velocity: completedPoints,
    };
  }

  async update(id: string, data: { name?: string; goal?: string; startDate?: string; endDate?: string }) {
    return this.prisma.sprint.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.goal !== undefined && { goal: data.goal }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
      },
    });
  }

  async delete(id: string) {
    // Move sprint tasks back to backlog (sprintId = null)
    await this.prisma.task.updateMany({
      where: { sprintId: id },
      data: { sprintId: null },
    });
    return this.prisma.sprint.delete({ where: { id } });
  }
}
