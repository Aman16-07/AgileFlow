import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CommentsService } from './comments.service';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks/:taskId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiOperation({ summary: 'List comments for a task' })
  async list(
    @Param('taskId') taskId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.commentsService.findByTask(taskId, cursor, limit);
  }

  @Post()
  @ApiOperation({ summary: 'Add comment to task' })
  async create(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
    @Body('content') content: string,
    @Body('parentId') parentId?: string,
  ) {
    return this.commentsService.create(taskId, userId, content, parentId);
  }

  @Patch(':commentId')
  @ApiOperation({ summary: 'Edit a comment' })
  async update(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
    @Body('content') content: string,
  ) {
    return this.commentsService.update(commentId, userId, content);
  }

  @Delete(':commentId')
  @ApiOperation({ summary: 'Delete a comment' })
  async delete(@Param('commentId') commentId: string, @CurrentUser('id') userId: string) {
    return this.commentsService.delete(commentId, userId);
  }
}
