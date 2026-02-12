import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BoardsService } from './boards.service';

@ApiTags('Boards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('spaces/:spaceId/boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get()
  @ApiOperation({ summary: 'List boards in a space' })
  async list(@Param('spaceId') spaceId: string) {
    return this.boardsService.findBySpace(spaceId);
  }

  @Get('view')
  @ApiOperation({ summary: 'Get Kanban board view with columns and tasks' })
  async boardView(
    @Param('spaceId') spaceId: string,
    @Query('sprintId') sprintId?: string,
  ) {
    return this.boardsService.getBoardView(spaceId, sprintId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new board' })
  async create(@Param('spaceId') spaceId: string, @Body('name') name: string) {
    return this.boardsService.create(spaceId, name);
  }

  @Patch(':boardId')
  @ApiOperation({ summary: 'Update board name' })
  async update(@Param('boardId') boardId: string, @Body('name') name: string) {
    return this.boardsService.update(boardId, name);
  }

  @Delete(':boardId')
  @ApiOperation({ summary: 'Delete a board' })
  async delete(@Param('boardId') boardId: string) {
    return this.boardsService.delete(boardId);
  }
}
