import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SprintsService } from './sprints.service';

@ApiTags('Sprints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('spaces/:spaceId/sprints')
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Get()
  @ApiOperation({ summary: 'List sprints for a space' })
  async list(@Param('spaceId') spaceId: string) {
    return this.sprintsService.findBySpace(spaceId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new sprint' })
  async create(
    @Param('spaceId') spaceId: string,
    @Body() data: { name: string; goal?: string; startDate?: string; endDate?: string },
  ) {
    return this.sprintsService.create(spaceId, data);
  }

  @Post(':sprintId/start')
  @ApiOperation({ summary: 'Start a sprint' })
  async start(@Param('sprintId') sprintId: string) {
    return this.sprintsService.startSprint(sprintId);
  }

  @Post(':sprintId/complete')
  @ApiOperation({ summary: 'Complete a sprint' })
  async complete(
    @Param('sprintId') sprintId: string,
    @Body('moveIncompleteToSprintId') moveToSprintId?: string,
  ) {
    return this.sprintsService.completeSprint(sprintId, moveToSprintId);
  }

  @Get(':sprintId/metrics')
  @ApiOperation({ summary: 'Get sprint metrics (story points, velocity)' })
  async metrics(@Param('sprintId') sprintId: string) {
    return this.sprintsService.getSprintMetrics(sprintId);
  }

  @Patch(':sprintId')
  @ApiOperation({ summary: 'Update sprint details' })
  async update(
    @Param('sprintId') sprintId: string,
    @Body() data: { name?: string; goal?: string; startDate?: string; endDate?: string },
  ) {
    return this.sprintsService.update(sprintId, data);
  }

  @Delete(':sprintId')
  @ApiOperation({ summary: 'Delete sprint (tasks move to backlog)' })
  async delete(@Param('sprintId') sprintId: string) {
    return this.sprintsService.delete(sprintId);
  }
}
