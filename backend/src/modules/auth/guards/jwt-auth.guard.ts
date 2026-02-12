import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { DEFAULT_USER_ID, DEFAULT_USER_EMAIL } from '../../../prisma/prisma.service';

/**
 * Auth bypass: every request is treated as the default demo user.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: DEFAULT_USER_ID,
      email: DEFAULT_USER_EMAIL,
      displayName: 'Demo User',
    };
    return true;
  }
}
