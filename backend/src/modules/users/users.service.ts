import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
      },
    });
  }

  async searchUsers(query: string, limit = 10) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { displayName: { contains: query } },
          { email: { contains: query } },
        ],
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
      },
      take: limit,
    });
  }

  async getSpacesForUser(userId: string) {
    const memberships = await this.prisma.spaceMember.findMany({
      where: { userId },
      include: {
        space: {
          select: {
            id: true,
            name: true,
            key: true,
            slug: true,
            iconUrl: true,
            visibility: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m: typeof memberships[number]) => ({ ...m.space, role: m.role }));
  }
}
