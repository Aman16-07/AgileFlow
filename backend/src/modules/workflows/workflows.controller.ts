import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkflowsService } from './workflows.service';

@ApiTags('Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('spaces/:spaceId/workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: 'Get workflows for a space' })
  async list(@Param('spaceId') spaceId: string) {
    return this.workflowsService.getBySpace(spaceId);
  }

  @Get('statuses')
  @ApiOperation({ summary: 'Get default workflow statuses' })
  async statuses(@Param('spaceId') spaceId: string) {
    return this.workflowsService.getStatuses(spaceId);
  }

  @Post(':workflowId/statuses')
  @ApiOperation({ summary: 'Add a status to a workflow' })
  async addStatus(
    @Param('workflowId') workflowId: string,
    @Body() data: { name: string; slug?: string; color?: string; category?: string },
  ) {
    return this.workflowsService.addStatus(workflowId, data);
  }

  @Patch(':workflowId/statuses/reorder')
  @ApiOperation({ summary: 'Reorder workflow statuses' })
  async reorder(
    @Param('workflowId') workflowId: string,
    @Body('statusIds') statusIds: string[],
  ) {
    return this.workflowsService.reorderStatuses(workflowId, statusIds);
  }

  @Patch('statuses/:statusId')
  @ApiOperation({ summary: 'Update a workflow status' })
  async updateStatus(
    @Param('statusId') statusId: string,
    @Body() data: { name?: string; color?: string; category?: string },
  ) {
    return this.workflowsService.updateStatus(statusId, data);
  }

  @Delete('statuses/:statusId')
  @ApiOperation({ summary: 'Delete a workflow status' })
  async deleteStatus(@Param('statusId') statusId: string) {
    return this.workflowsService.deleteStatus(statusId);
  }
}
