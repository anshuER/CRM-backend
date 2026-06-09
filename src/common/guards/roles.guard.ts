import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Role } from '../constant/roles.constant';
import { REQUIRED_ROLES_KEY } from '../decorators/ roles.decorator';

export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      REQUIRED_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;

    if (!tenant?.role) {
      throw new ForbiddenException('Tenant Context missing');
    }

    const hasRoles = requiredRoles.includes(tenant.role);

    if (!hasRoles) {
      throw new ForbiddenException('You do not have permission');
    }

    return true;
  }
}
