import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';
export const DEFAULT_USER_EMAIL = 'demo@projectflow.dev';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    await this.seedDefaultUser();
  }

  private async seedDefaultUser() {
    const existing = await this.user.findUnique({ where: { id: DEFAULT_USER_ID } });
    if (!existing) {
      await this.user.create({
        data: {
          id: DEFAULT_USER_ID,
          email: DEFAULT_USER_EMAIL,
          passwordHash: 'no-auth',
          displayName: 'Demo User',
        },
      });
      this.logger.log('Default demo user created');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Clean database for testing — NEVER call in production
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }
    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$'),
    );
    return Promise.all(
      models.map((modelKey) => (this as any)[modelKey]?.deleteMany?.()),
    );
  }
}
