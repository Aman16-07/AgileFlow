import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('sprint-summary/:sprintId')
  @ApiOperation({ summary: 'Generate AI-powered sprint summary' })
  async sprintSummary(@Param('sprintId') sprintId: string) {
    return this.aiService.generateSprintSummary(sprintId);
  }
}
