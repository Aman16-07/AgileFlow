import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SprintSummaryResult {
  sprintId: string;
  sprintName: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  totalPoints: number;
  completedPoints: number;
  completionRate: number;
  tasksByStatus: { status: string; category: string; count: number }[];
  blockers: string[];
  remainingTasks: { key: string; title: string; status: string; priority: string; assignee: string | null }[];
  summary: string;
}

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a sprint summary with task analytics.
   * 
   * Architecture: This service generates the data and a template-based summary.
   * To plug in OpenAI/Claude, replace the `generateNaturalLanguageSummary` method
   * with an API call passing the structured data as context.
   */
  async generateSprintSummary(sprintId: string): Promise<SprintSummaryResult> {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        space: { select: { name: true, key: true } },
      },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');

    // Fetch all tasks in this sprint with their statuses
    const tasks = await this.prisma.task.findMany({
      where: { sprintId },
      include: {
        status: { select: { id: true, name: true, category: true } },
        assignee: { select: { id: true, displayName: true } },
      },
      orderBy: { position: 'asc' },
    });

    // Categorize tasks
    const completedTasks = tasks.filter((t) => t.status.category === 'DONE');
    const inProgressTasks = tasks.filter((t) => t.status.category === 'IN_PROGRESS');
    const todoTasks = tasks.filter((t) => t.status.category === 'TODO');

    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedPoints = completedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    // Group by status name for detailed breakdown
    const statusMap = new Map<string, { category: string; count: number }>();
    for (const task of tasks) {
      const key = task.status.name;
      const existing = statusMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        statusMap.set(key, { category: task.status.category, count: 1 });
      }
    }
    const tasksByStatus = Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      category: data.category,
      count: data.count,
    }));

    // Identify blockers: high/critical priority tasks that are not done
    const blockers = tasks
      .filter((t) => t.status.category !== 'DONE' && (t.priority === 'CRITICAL' || t.priority === 'HIGH'))
      .map((t) => `${t.key}: ${t.title} (${t.priority})`);

    // Remaining tasks (not done)
    const remainingTasks = tasks
      .filter((t) => t.status.category !== 'DONE')
      .map((t) => ({
        key: t.key,
        title: t.title,
        status: t.status.name,
        priority: t.priority,
        assignee: t.assignee?.displayName || null,
      }));

    const completionRate = tasks.length > 0
      ? Math.round((completedTasks.length / tasks.length) * 100)
      : 0;

    // Generate human-readable summary
    const summary = this.generateNaturalLanguageSummary({
      sprintName: sprint.name,
      spaceName: sprint.space.name,
      totalTasks: tasks.length,
      completedCount: completedTasks.length,
      inProgressCount: inProgressTasks.length,
      todoCount: todoTasks.length,
      completionRate,
      totalPoints,
      completedPoints,
      blockers,
      remainingTasks,
    });

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      status: sprint.status,
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      todoTasks: todoTasks.length,
      totalPoints,
      completedPoints,
      completionRate,
      tasksByStatus,
      blockers,
      remainingTasks,
      summary,
    };
  }

  /**
   * Template-based natural language summary.
   * 
   * TO INTEGRATE AI (OpenAI/Claude):
   * Replace this method body with:
   * 
   * ```typescript
   * const prompt = `Generate a sprint retrospective summary from this data: ${JSON.stringify(data)}`;
   * const response = await openai.chat.completions.create({
   *   model: 'gpt-4',
   *   messages: [{ role: 'user', content: prompt }],
   * });
   * return response.choices[0].message.content;
   * ```
   */
  private generateNaturalLanguageSummary(data: {
    sprintName: string;
    spaceName: string;
    totalTasks: number;
    completedCount: number;
    inProgressCount: number;
    todoCount: number;
    completionRate: number;
    totalPoints: number;
    completedPoints: number;
    blockers: string[];
    remainingTasks: { key: string; title: string; status: string; priority: string; assignee: string | null }[];
  }): string {
    const parts: string[] = [];

    // Opening
    parts.push(
      `${data.sprintName} completed ${data.completedCount}/${data.totalTasks} tasks (${data.completionRate}% completion rate).`,
    );

    // Points
    if (data.totalPoints > 0) {
      parts.push(
        `${data.completedPoints}/${data.totalPoints} story points were delivered.`,
      );
    }

    // In-progress
    if (data.inProgressCount > 0) {
      parts.push(
        `${data.inProgressCount} task${data.inProgressCount > 1 ? 's are' : ' is'} still in progress.`,
      );
    }

    // Blockers
    if (data.blockers.length > 0) {
      parts.push(
        `Main blockers: ${data.blockers.slice(0, 3).join('; ')}.`,
      );
    }

    // Remaining
    if (data.remainingTasks.length > 0) {
      const remainingNames = data.remainingTasks
        .slice(0, 3)
        .map((t) => t.title)
        .join(', ');
      parts.push(
        `Remaining tasks include: ${remainingNames}${data.remainingTasks.length > 3 ? ` and ${data.remainingTasks.length - 3} more` : ''}.`,
      );
    }

    return parts.join(' ');
  }
}
