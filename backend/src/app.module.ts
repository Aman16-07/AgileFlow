import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SpacesModule } from './modules/spaces/spaces.module';
import { BoardsModule } from './modules/boards/boards.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { SprintsModule } from './modules/sprints/sprints.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { CommentsModule } from './modules/comments/comments.module';
import { StarsModule } from './modules/stars/stars.module';
import { RecentsModule } from './modules/recents/recents.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { AiModule } from './modules/ai/ai.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    SpacesModule,
    BoardsModule,
    TasksModule,
    SprintsModule,
    WorkflowsModule,
    CommentsModule,
    StarsModule,
    RecentsModule,
    ActivitiesModule,
    DashboardModule,
    RealtimeModule,
    AiModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
