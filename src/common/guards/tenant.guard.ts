import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.userId) {
      throw new ForbiddenException('User not authorised');
    }

    const organizationId = request.headers['x-organization-id'];

    if (!organizationId || typeof organizationId !== 'string') {
      throw new BadRequestException('x-organization-id header is required');
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: user.userId,
        organizationId,
        status: 'ACTIVE',
        organization: {
          status: 'ACTIVE',
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You do not have access to this organization',
      );
    }

    request.tenant = {
      organizationId,
      membershipId: membership.id,
      role: membership.role,
    };

    return true;
  }
}
