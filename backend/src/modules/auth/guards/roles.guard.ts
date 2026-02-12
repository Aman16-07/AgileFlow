import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

/**
 * RolesGuard — Bypassed for demo mode. Always allows access.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}
