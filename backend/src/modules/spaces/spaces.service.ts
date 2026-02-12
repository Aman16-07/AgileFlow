import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class SpacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSpaceDto, userId: string) {
    // Check key uniqueness
    const existing = await this.prisma.space.findUnique({ where: { key: dto.key } });
    if (existing) throw new ConflictException(`Space key "${dto.key}" already exists`);

    const slug = this.generateSlug(dto.name);

    return this.prisma.$transaction(async (tx: TxClient) => {
      // Create space
      const space = await tx.space.create({
        data: {
          name: dto.name,
          key: dto.key.toUpperCase(),
          slug,
          description: dto.description,
          visibility: dto.visibility || 'TEAM',
          iconUrl: dto.iconUrl,
        },
      });

      // Add creator as ADMIN member
      await tx.spaceMember.create({
        data: {
          userId,
          spaceId: space.id,
          role: 'ADMIN',
        },
      });

      // Create default workflow with standard statuses
      const workflow = await tx.workflow.create({
        data: {
          spaceId: space.id,
          name: 'Default Workflow',
          isDefault: true,
        },
      });

      const defaultStatuses = [
        { name: 'Backlog', slug: 'backlog', color: '#6B7280', position: 0, category: 'TODO' },
        { name: 'To Do', slug: 'to-do', color: '#3B82F6', position: 1, category: 'TODO' },
        { name: 'In Progress', slug: 'in-progress', color: '#F59E0B', position: 2, category: 'IN_PROGRESS' },
        { name: 'In Review', slug: 'in-review', color: '#8B5CF6', position: 3, category: 'IN_PROGRESS' },
        { name: 'Done', slug: 'done', color: '#10B981', position: 4, category: 'DONE' },
      ];

      await tx.workflowStatus.createMany({
        data: defaultStatuses.map((s) => ({ ...s, workflowId: workflow.id })),
      });

      // Create default board
      await tx.board.create({
        data: {
          name: `${dto.name} Board`,
          spaceId: space.id,
          isDefault: true,
        },
      });

      return space;
    });
  }

  async findByKey(key: string) {
    const space = await this.prisma.space.findUnique({
      where: { key: key.toUpperCase() },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, displayName: true, avatarUrl: true, email: true },
            },
          },
        },
        boards: { orderBy: { createdAt: 'asc' } },
        workflows: {
          where: { isDefault: true },
          include: { statuses: { orderBy: { position: 'asc' } } },
        },
      },
    });
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }

  async findById(id: string) {
    const space = await this.prisma.space.findUnique({ where: { id } });
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }

  async update(id: string, dto: UpdateSpaceDto) {
    return this.prisma.space.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.visibility && { visibility: dto.visibility }),
        ...(dto.iconUrl !== undefined && { iconUrl: dto.iconUrl }),
      },
    });
  }

  async delete(id: string) {
    return this.prisma.space.delete({ where: { id } });
  }

  async getMembers(spaceId: string) {
    return this.prisma.spaceMember.findMany({
      where: { spaceId },
      include: {
        user: {
          select: { id: true, email: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }

  async addMember(spaceId: string, userId: string, role: 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER' = 'DEVELOPER') {
    return this.prisma.spaceMember.upsert({
      where: { userId_spaceId: { userId, spaceId } },
      create: { userId, spaceId, role },
      update: { role },
    });
  }

  async removeMember(spaceId: string, userId: string) {
    return this.prisma.spaceMember.delete({
      where: { userId_spaceId: { userId, spaceId } },
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
