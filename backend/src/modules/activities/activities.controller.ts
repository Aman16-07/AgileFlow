import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ActivitiesService } from './activities.service';

@ApiTags('Activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my recent activity' })
  async myActivity(@CurrentUser('id') userId: string, @Query('limit') limit?: number) {
    return this.activitiesService.getByUser(userId, limit);
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'Get activity for a task' })
  async taskActivity(
    @Param('taskId') taskId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.activitiesService.getByTask(taskId, cursor, limit);
  }

  @Get('space/:spaceId')
  @ApiOperation({ summary: 'Get activity for a space' })
  async spaceActivity(@Param('spaceId') spaceId: string, @Query('limit') limit?: number) {
    return this.activitiesService.getBySpace(spaceId, limit);
  }
}
