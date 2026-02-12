import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { Prisma, PrismaClient } from '@prisma/client';

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new task with auto-generated key (e.g., SCRUM-3).
   * Uses a transaction to safely increment the per-space task counter.
   */
  async create(dto: CreateTaskDto, reporterId: string) {
    return this.prisma.$transaction(async (tx: TxClient) => {
      // Get or compute the next task number for this space
      const lastTask = await tx.task.findFirst({
        where: { spaceId: dto.spaceId },
        orderBy: { number: 'desc' },
        select: { number: true },
      });
      const nextNumber = (lastTask?.number ?? 0) + 1;

      // Get space key for key generation
      const space = await tx.space.findUnique({
        where: { id: dto.spaceId },
        select: { key: true },
      });
      if (!space) throw new NotFoundException('Space not found');

      const key = `${space.key}-${nextNumber}`;

      // Calculate position: append to end of status column
      const lastInColumn = await tx.task.findFirst({
        where: { spaceId: dto.spaceId, statusId: dto.statusId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const position = (lastInColumn?.position ?? 0) + 65536; // Large gaps for fractional indexing

      return tx.task.create({
        data: {
          spaceId: dto.spaceId,
          statusId: dto.statusId,
          reporterId,
          assigneeId: dto.assigneeId,
          sprintId: dto.sprintId,
          parentId: dto.parentId,
          title: dto.title,
          description: dto.description,
          type: dto.type || 'TASK',
          priority: dto.priority || 'MEDIUM',
          key,
          number: nextNumber,
          position,
          storyPoints: dto.storyPoints,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        },
        include: {
          assignee: { select: { id: true, displayName: true, avatarUrl: true } },
          reporter: { select: { id: true, displayName: true, avatarUrl: true } },
          status: true,
          taskLabels: { include: { label: true } },
        },
      });
    });
  }

  async findById(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, displayName: true, avatarUrl: true, email: true } },
        reporter: { select: { id: true, displayName: true, avatarUrl: true, email: true } },
        status: true,
        sprint: { select: { id: true, name: true, status: true } },
        space: { select: { id: true, name: true, key: true } },
        taskLabels: { include: { label: true } },
        parent: { select: { id: true, title: true, key: true } },
        children: {
          select: { id: true, title: true, key: true, type: true, priority: true },
          orderBy: { position: 'asc' },
        },
        comments: {
          include: {
            author: { select: { id: true, displayName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        activities: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        attachments: {
          include: {
            uploader: { select: { id: true, displayName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async findByKey(key: string) {
    const task = await this.prisma.task.findUnique({ where: { key } });
    if (!task) throw new NotFoundException('Task not found');
    return this.findById(task.id);
  }

  async update(id: string, dto: UpdateTaskDto, userId: string) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');

    // Build activity log entries for changed fields
    const activities: any[] = [];

    if (dto.statusId && dto.statusId !== existing.statusId) {
      activities.push({
        taskId: id,
        userId,
        action: 'STATUS_CHANGED',
        field: 'statusId',
        oldValue: existing.statusId,
        newValue: dto.statusId,
      });
    }
    if (dto.assigneeId !== undefined && dto.assigneeId !== existing.assigneeId) {
      activities.push({
        taskId: id,
        userId,
        action: 'ASSIGNED',
        field: 'assigneeId',
        oldValue: existing.assigneeId,
        newValue: dto.assigneeId,
      });
    }
    if (dto.priority && dto.priority !== existing.priority) {
      activities.push({
        taskId: id,
        userId,
        action: 'PRIORITY_CHANGED',
        field: 'priority',
        oldValue: existing.priority,
        newValue: dto.priority,
      });
    }
    if (dto.title || dto.description !== undefined || dto.storyPoints !== undefined || dto.dueDate !== undefined) {
      activities.push({
        taskId: id,
        userId,
        action: 'UPDATED',
        field: 'general',
      });
    }

    return this.prisma.$transaction(async (tx: TxClient) => {
      const task = await tx.task.update({
        where: { id },
        data: {
          ...(dto.title && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.statusId && { statusId: dto.statusId }),
          ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId || null }),
          ...(dto.priority && { priority: dto.priority }),
          ...(dto.type && { type: dto.type }),
          ...(dto.sprintId !== undefined && { sprintId: dto.sprintId || null }),
          ...(dto.storyPoints !== undefined && { storyPoints: dto.storyPoints }),
          ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        },
        include: {
          assignee: { select: { id: true, displayName: true, avatarUrl: true } },
          status: true,
          taskLabels: { include: { label: true } },
        },
      });

      // Log activities
      if (activities.length > 0) {
        await tx.activity.createMany({ data: activities });
      }

      return task;
    });
  }

  /**
   * Move task across columns or reorder within a column.
   * Uses fractional indexing for O(1) position updates.
   */
  async moveTask(dto: MoveTaskDto, userId: string) {
    const { taskId, targetStatusId, targetPosition } = dto;

    return this.prisma.$transaction(async (tx: TxClient) => {
      const task = await tx.task.findUnique({ where: { id: taskId } });
      if (!task) throw new NotFoundException('Task not found');

      const oldStatusId = task.statusId;

      // Calculate new position using fractional indexing
      let newPosition: number;

      if (targetPosition !== undefined) {
        // Get tasks in target column
        const tasksInColumn = await tx.task.findMany({
          where: { statusId: targetStatusId, spaceId: task.spaceId, id: { not: taskId } },
          orderBy: { position: 'asc' },
          select: { id: true, position: true },
        });

        if (tasksInColumn.length === 0) {
          newPosition = 65536;
        } else if (targetPosition === 0) {
          newPosition = tasksInColumn[0].position / 2;
        } else if (targetPosition >= tasksInColumn.length) {
          newPosition = tasksInColumn[tasksInColumn.length - 1].position + 65536;
        } else {
          const before = tasksInColumn[targetPosition - 1].position;
          const after = tasksInColumn[targetPosition].position;
          newPosition = (before + after) / 2;
        }
      } else {
        // Append to end
        const lastInColumn = await tx.task.findFirst({
          where: { statusId: targetStatusId, spaceId: task.spaceId },
          orderBy: { position: 'desc' },
          select: { position: true },
        });
        newPosition = (lastInColumn?.position ?? 0) + 65536;
      }

      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          statusId: targetStatusId,
          position: newPosition,
        },
        include: {
          assignee: { select: { id: true, displayName: true, avatarUrl: true } },
          status: true,
          taskLabels: { include: { label: true } },
        },
      });

      // Log activity if status changed
      if (oldStatusId !== targetStatusId) {
        await tx.activity.create({
          data: {
            taskId,
            userId,
            action: 'STATUS_CHANGED',
            field: 'statusId',
            oldValue: oldStatusId,
            newValue: targetStatusId,
          },
        });
      } else {
        await tx.activity.create({
          data: {
            taskId,
            userId,
            action: 'MOVED',
            field: 'position',
          },
        });
      }

      return updated;
    });
  }

  /**
   * List tasks with cursor-based pagination.
   */
  async listTasks(params: {
    spaceId: string;
    sprintId?: string;
    statusId?: string;
    assigneeId?: string;
    type?: string;
    priority?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }) {
    const { spaceId, sprintId, statusId, assigneeId, type, priority, search, cursor, limit = 50 } = params;

    const where: Prisma.TaskWhereInput = { spaceId };
    if (sprintId) where.sprintId = sprintId;
    if (statusId) where.statusId = statusId;
    if (assigneeId) where.assigneeId = assigneeId;
    if (type) where.type = type as any;
    if (priority) where.priority = priority as any;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { key: { contains: search } },
      ];
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, displayName: true, avatarUrl: true } },
        status: { select: { id: true, name: true, slug: true, color: true } },
        taskLabels: { include: { label: true } },
      },
      orderBy: { position: 'asc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = tasks.length > limit;
    const items = hasMore ? tasks.slice(0, limit) : tasks;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
  }

  async delete(id: string) {
    return this.prisma.task.delete({ where: { id } });
  }

  async addLabel(taskId: string, labelId: string) {
    return this.prisma.taskLabel.upsert({
      where: { taskId_labelId: { taskId, labelId } },
      create: { taskId, labelId },
      update: {},
    });
  }

  async removeLabel(taskId: string, labelId: string) {
    return this.prisma.taskLabel.delete({
      where: { taskId_labelId: { taskId, labelId } },
    });
  }
}
