import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  async findBySpace(spaceId: string) {
    return this.prisma.board.findMany({
      where: { spaceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    const board = await this.prisma.board.findUnique({
      where: { id },
      include: { space: { select: { id: true, name: true, key: true } } },
    });
    if (!board) throw new NotFoundException('Board not found');
    return board;
  }

  /**
   * Get full board data with columns (workflow statuses) and tasks.
   * This is the main query for the Kanban view.
   *
   * Board logic:
   * - If sprintId is provided, show only tasks in that sprint
   * - If no sprintId, find the ACTIVE sprint and show its tasks
   * - If no active sprint, show all tasks (regardless of sprint)
   *
   * This ensures the board always has something to display.
   */
  async getBoardView(spaceId: string, sprintId?: string) {
    // Get workflow statuses as columns
    const workflow = await this.prisma.workflow.findFirst({
      where: { spaceId, isDefault: true },
      include: {
        statuses: { orderBy: { position: 'asc' } },
      },
    });

    if (!workflow) throw new NotFoundException('No workflow found for this space');

    // Determine which tasks to show
    const taskWhere: any = { spaceId };

    if (sprintId) {
      // Explicit sprint filter
      taskWhere.sprintId = sprintId;
    } else {
      // Auto-detect: try active sprint first
      const activeSprint = await this.prisma.sprint.findFirst({
        where: { spaceId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (activeSprint) {
        taskWhere.sprintId = activeSprint.id;
      }
      // If no active sprint, show all tasks (no sprintId filter)
    }

    const tasks = await this.prisma.task.findMany({
      where: taskWhere,
      include: {
        assignee: { select: { id: true, displayName: true, avatarUrl: true } },
        taskLabels: { include: { label: true } },
        status: { select: { id: true, name: true, slug: true, color: true, category: true } },
      },
      orderBy: { position: 'asc' },
    });

    // Group tasks by statusId
    const columns = workflow.statuses.map((status: typeof workflow.statuses[number]) => ({
      id: status.id,
      name: status.name,
      slug: status.slug,
      color: status.color,
      position: status.position,
      category: status.category,
      tasks: tasks.filter((t: typeof tasks[number]) => t.statusId === status.id),
    }));

    return { workflow, columns };
  }

  async create(spaceId: string, name: string) {
    return this.prisma.board.create({
      data: { name, spaceId },
    });
  }

  async update(id: string, name: string) {
    return this.prisma.board.update({
      where: { id },
      data: { name },
    });
  }

  async delete(id: string) {
    return this.prisma.board.delete({ where: { id } });
  }
}
