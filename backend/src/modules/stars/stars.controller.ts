import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StarsService } from './stars.service';

type StarrableType = 'SPACE' | 'BOARD' | 'TASK';

@ApiTags('Stars')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stars')
export class StarsController {
  constructor(private readonly starsService: StarsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all starred items for current user' })
  async getStarred(@CurrentUser('id') userId: string) {
    return this.starsService.getStarred(userId);
  }

  @Post('toggle')
  @ApiOperation({ summary: 'Star or unstar an item' })
  async toggle(
    @CurrentUser('id') userId: string,
    @Body('entityType') entityType: StarrableType,
    @Body('entityId') entityId: string,
  ) {
    return this.starsService.toggle(userId, entityType, entityId);
  }
}
