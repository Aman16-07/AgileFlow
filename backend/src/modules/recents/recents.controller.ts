import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RecentsService } from './recents.service';

type RecentItemType = 'SPACE' | 'BOARD' | 'TASK';

@ApiTags('Recents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recents')
export class RecentsController {
  constructor(private readonly recentsService: RecentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get recent items for current user' })
  async getRecent(
    @CurrentUser('id') userId: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
  ) {
    return this.recentsService.getRecent(userId, search, limit);
  }

  @Post('track')
  @ApiOperation({ summary: 'Track a viewed item' })
  async track(
    @CurrentUser('id') userId: string,
    @Body('entityType') entityType: RecentItemType,
    @Body('entityId') entityId: string,
  ) {
    return this.recentsService.trackAccess(userId, entityType, entityId);
  }
}
