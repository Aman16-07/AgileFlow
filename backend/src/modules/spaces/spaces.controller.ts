import {
  Controller, Get, Post, Patch, Delete, Param,
  Body, UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

@ApiTags('Spaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new space' })
  async create(@Body() dto: CreateSpaceDto, @CurrentUser('id') userId: string) {
    return this.spacesService.create(dto, userId);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get space by key' })
  async findByKey(@Param('key') key: string) {
    return this.spacesService.findByKey(key);
  }

  @Patch(':spaceId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Update space settings' })
  async update(@Param('spaceId') spaceId: string, @Body() dto: UpdateSpaceDto) {
    return this.spacesService.update(spaceId, dto);
  }

  @Delete(':spaceId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a space' })
  async delete(@Param('spaceId') spaceId: string) {
    return this.spacesService.delete(spaceId);
  }

  @Get(':spaceId/members')
  @ApiOperation({ summary: 'Get space members' })
  async getMembers(@Param('spaceId') spaceId: string) {
    return this.spacesService.getMembers(spaceId);
  }

  @Post(':spaceId/members')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Add member to space' })
  async addMember(
    @Param('spaceId') spaceId: string,
    @Body('userId') userId: string,
    @Body('role') role?: 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER',
  ) {
    return this.spacesService.addMember(spaceId, userId, role);
  }

  @Delete(':spaceId/members/:userId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remove member from space' })
  async removeMember(@Param('spaceId') spaceId: string, @Param('userId') userId: string) {
    return this.spacesService.removeMember(spaceId, userId);
  }
}
