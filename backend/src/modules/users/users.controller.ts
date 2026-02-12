import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/spaces')
  @ApiOperation({ summary: 'Get all spaces for the current user' })
  async mySpaces(@CurrentUser('id') userId: string) {
    return this.usersService.getSpacesForUser(userId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users by name or email' })
  async search(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.usersService.searchUsers(query, limit);
  }
}
