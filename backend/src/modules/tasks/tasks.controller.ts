import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  async create(@Body() dto: CreateTaskDto, @CurrentUser('id') userId: string) {
    return this.tasksService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks with filters and pagination' })
  async list(
    @Query('spaceId') spaceId: string,
    @Query('sprintId') sprintId?: string,
    @Query('statusId') statusId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.tasksService.listTasks({
      spaceId, sprintId, statusId, assigneeId,
      type, priority, search, cursor, limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  async findById(@Param('id') id: string) {
    return this.tasksService.findById(id);
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Get task by key (e.g., SCRUM-3)' })
  async findByKey(@Param('key') key: string) {
    return this.tasksService.findByKey(key);
  }

  @Patch('move')
  @ApiOperation({ summary: 'Move task across columns or reorder' })
  async move(@Body() dto: MoveTaskDto, @CurrentUser('id') userId: string) {
    return this.tasksService.moveTask(dto, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task fields' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  async delete(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }

  @Post(':taskId/labels/:labelId')
  @ApiOperation({ summary: 'Add label to task' })
  async addLabel(@Param('taskId') taskId: string, @Param('labelId') labelId: string) {
    return this.tasksService.addLabel(taskId, labelId);
  }

  @Delete(':taskId/labels/:labelId')
  @ApiOperation({ summary: 'Remove label from task' })
  async removeLabel(@Param('taskId') taskId: string, @Param('labelId') labelId: string) {
    return this.tasksService.removeLabel(taskId, labelId);
  }
}
