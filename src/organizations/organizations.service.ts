import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './schema/organisations.schema';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  private generateSlug(name: string) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async generateUniqueSlug(baseslug: string) {
    let slug = baseslug;
    let counter = 1;

    while (true) {
      const existingSlug = await this.prisma.organization.findUnique({
        where: {
          slug,
        },
      });

      if (!existingSlug) {
        return slug;
      }

      slug = `${baseslug}-${counter}`;
      counter++;
    }
  }

  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    const baseslug = this.generateSlug(dto.name);
    const slug = await this.generateUniqueSlug(baseslug);

    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          slug,
          status: 'ACTIVE',
        },
      });

      const membership = await tx.membership.create({
        data: {
          userId,
          organizationId: organization.id,
          role: 'ORG_ADMIN',
          status: 'ACTIVE',
        },
      });

      return {
        organization,
        membership,
      };
    });

    return {
      message: 'Organization created successfully',
      organization: result.organization,
      membership: result.membership,
    };
  }

  async getMyOrganization(userId: string) {
    const organization = await this.prisma.membership.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        organization: {
          status: 'ACTIVE',
        },
      },
      include: {
        organization: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      organizations: organization.map((memberships) => {
        return {
          membershipId: memberships.id,
          role: memberships.role,
          organization: memberships.organization,
        };
      }),
    };
  }

  async getOrganizationById(userId: string, organizationId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        organizationId,
        status: 'ACTIVE',
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You dont have accesss');
    }

    if (
      !membership.organization ||
      membership.organization.status !== 'ACTIVE'
    ) {
      throw new NotFoundException('Organization not found');
    }

    return {
      organization: membership.organization,
      role: membership.role,
    };
  }

  async updateOrganizationName(
    organizationId: string,
    dto: UpdateOrganizationDto,
  ) {
    const upatedOrganization = await this.prisma.organization.update({
      where: {
        id: organizationId,
      },
      data: {
        name: dto.name,
      },
    });

    return {
      message: 'Organization updated successfully',
      upatedOrganization,
    };
  }
}
