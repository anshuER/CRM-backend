import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentAuthUser } from '../auth/types/auth.types';
import {
  type CreateOrganizationDto,
  createOrganizationSchema,
  type UpdateOrganizationDto,
  updateOrganizationSchema,
} from './schema/organisations.schema';
import { ZodValidationPipes } from 'src/auth/pipes/zod-validation.pipe';
import { TenantGuard } from 'src/common/guards/tenant.guard';
import { CurrentTenant } from 'src/common/decorators/current-tenant.decorator';
import { type TenantContext } from 'src/common/types/tenant-context.type';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { RequiredRoles } from 'src/common/decorators/ roles.decorator';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new organization',
    description: 'Creates a new organization for the authenticated user',
  })
  @ApiBody({
    description: 'Organization creation data',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          example: 'Acme Corp',
          description: 'Organization name (2-100 characters)',
        },
      },
      required: ['name'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Organization ID' },
        name: { type: 'string', description: 'Organization name' },
        slug: { type: 'string', description: 'URL-friendly slug' },
        status: { type: 'string', example: 'ACTIVE' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  createOrganization(
    @CurrentUser() user: CurrentAuthUser,
    @Body(new ZodValidationPipes(createOrganizationSchema))
    dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.createOrganization(user.userId, dto);
  }

  @Get('my')
  @ApiOperation({
    summary: 'Get user organizations',
    description: 'Retrieves all organizations owned by the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user organizations',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          status: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  getMyOrganizations(@CurrentUser() user: CurrentAuthUser) {
    return this.organizationsService.getMyOrganization(user.userId);
  }

  @Get(':organizationId')
  @ApiOperation({
    summary: 'Get organization by ID',
    description: 'Retrieves organization details by ID (user must be a member)',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    example: 'org_123456',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        status: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have access to this organization',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  getOrganizationById(
    @CurrentUser() user: CurrentAuthUser,
    @Param('organizationId') organizationId: string,
  ) {
    return this.organizationsService.getOrganizationById(
      user.userId,
      organizationId,
    );
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('current/context')
  @ApiOperation({
    summary: 'Get current tenant context',
    description:
      'Returns current authenticated user and tenant context for the active organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Current tenant context data',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          description: 'Authenticated user details',
        },
        tenant: {
          type: 'object',
          description: 'Active tenant context data',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  getCurrentTenantContext(
    @CurrentUser() user: CurrentAuthUser,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return {
      user,
      tenant,
    };
  }

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @RequiredRoles('ORG_ADMIN')
  @Get('admin-only')
  @ApiOperation({
    summary: 'Admin-only access check',
    description:
      'Verifies that the authenticated user has ORG_ADMIN permissions',
  })
  @ApiResponse({
    status: 200,
    description: 'User is authorized as organization admin',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Only ORG_ADMIN can access this route',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have ORG_ADMIN role',
  })
  adminOnlyRoute() {
    return {
      message: 'Only ORG_ADMIN can access this route',
    };
  }

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @RequiredRoles('ORG_ADMIN')
  @Post('update-name')
  @ApiOperation({
    summary: 'Update organization name',
    description: 'Updates the current organization name for the active tenant',
  })
  @ApiBody({
    description: 'Organization name update payload',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          example: 'Acme Corp Updated',
          description: 'New organization name',
        },
      },
      required: ['name'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Organization name updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        status: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have ORG_ADMIN role',
  })
  updateOrganizationName(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipes(updateOrganizationSchema))
    dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.updateOrganizationName(
      tenant.organizationId,
      dto,
    );
  }
}
