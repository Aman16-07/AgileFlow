import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBySpace(spaceId: string) {
    return this.prisma.workflow.findMany({
      where: { spaceId },
      include: { statuses: { orderBy: { position: 'asc' } } },
    });
  }

  async getStatuses(spaceId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { spaceId, isDefault: true },
      include: { statuses: { orderBy: { position: 'asc' } } },
    });
    if (!workflow) throw new NotFoundException('No default workflow found');
    return workflow.statuses;
  }

  async addStatus(workflowId: string, data: { name: string; slug: string; color: string; category: string }) {
    // Get max position
    const maxPos = await this.prisma.workflowStatus.findFirst({
      where: { workflowId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = (maxPos?.position ?? -1) + 1;

    return this.prisma.workflowStatus.create({
      data: { ...data, workflowId, position },
    });
  }

  async reorderStatuses(workflowId: string, statusIds: string[]) {
    const updates = statusIds.map((id, index) =>
      this.prisma.workflowStatus.update({
        where: { id },
        data: { position: index },
      }),
    );
    return this.prisma.$transaction(updates);
  }

  async updateStatus(statusId: string, data: { name?: string; color?: string; category?: string }) {
    return this.prisma.workflowStatus.update({
      where: { id: statusId },
      data,
    });
  }

  async deleteStatus(statusId: string) {
    return this.prisma.workflowStatus.delete({ where: { id: statusId } });
  }
}
