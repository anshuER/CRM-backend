import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiHeader,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TenantGuard } from 'src/common/guards/tenant.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { RequiredRoles } from 'src/common/decorators/ roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { type CurrentAuthUser } from 'src/auth/types/auth.types';
import { CurrentTenant } from 'src/common/decorators/current-tenant.decorator';
import { type TenantContext } from 'src/common/types/tenant-context.type';
import {
  type AddProjectMemberDto,
  addProjectMemberSchema,
  createProjectSchema,
  updateProjectSchema,
} from './schemas/project.schemas';
import { ZodValidationPipes } from 'src/auth/pipes/zod-validation.pipe';

@ApiTags('projects')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-organization-id',
  description: 'Active organization ID for tenant-scoped project routes',
  required: true,
})
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @UseGuards(RolesGuard)
  @RequiredRoles('ORG_ADMIN', 'MANAGER')
  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiBody({
    description: 'Project creation data',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          example: 'Website redesign',
          description: 'Project name (2-100 characters)',
        },
        description: {
          type: 'string',
          example: 'Redesign the marketing website and launch pages',
          description: 'Optional project description (max 500 characters)',
        },
      },
      required: ['name'],
    },
  })
  createProject(
    @CurrentUser() user: CurrentAuthUser,
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipes(createProjectSchema)) dto: CreateProjectDto,
  ) {
    return this.projectsService.createProject(
      user.userId,
      tenant.organizationId,
      dto,
    );
  }

  @Get()
  getProjects(@CurrentTenant() tenant: TenantContext) {
    return this.projectsService.getProjects(tenant.organizationId);
  }

  @Get(':projectId')
  getProjectById(
    @CurrentTenant() tenant: TenantContext,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.getProjectById(
      tenant.organizationId,
      projectId,
    );
  }

  @UseGuards(RolesGuard)
  @RequiredRoles('ORG_ADMIN', 'MANAGER')
  @Patch(':projectId')
  @ApiOperation({ summary: 'Update a project' })
  @ApiBody({
    description: 'Project update data',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          example: 'Website redesign',
          description: 'Project name (2-100 characters)',
        },
        description: {
          type: 'string',
          example: 'Updated project scope',
          description: 'Optional project description (max 500 characters)',
        },
        status: {
          type: 'string',
          enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED'],
          example: 'ACTIVE',
        },
      },
    },
  })
  updateProject(
    @CurrentTenant() tenant: TenantContext,
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipes(updateProjectSchema)) dto: UpdateProjectDto,
  ) {
    return this.projectsService.updateProject(
      tenant.organizationId,
      projectId,
      dto,
    );
  }

  @UseGuards(RolesGuard)
  @RequiredRoles('ORG_ADMIN')
  @Patch(':projectId/archive')
  archiveProject(
    @CurrentTenant() tenant: TenantContext,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.archiveProject(
      tenant.organizationId,
      projectId,
    );
  }

  @Get(':projectId/members')
  getProjectMember(
    @CurrentTenant() tenant: TenantContext,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.getProjectMembers(
      tenant.organizationId,
      projectId,
    );
  }

  @UseGuards(RolesGuard)
  @RequiredRoles('ORG_ADMIN', 'MANAGER')
  @Post(':projectId/members')
  @ApiOperation({ summary: 'Add a member to a project' })
  @ApiBody({
    description: 'Project member data',
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          format: 'uuid',
          example: '4a2d06ce-9111-4c34-82f1-42ec588f0019',
        },
        role: {
          type: 'string',
          enum: ['LEAD', 'MEMBER'],
          example: 'MEMBER',
        },
      },
      required: ['userId'],
    },
  })
  addProjectMember(
    @CurrentTenant() tenant: TenantContext,
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipes(addProjectMemberSchema))
    dto: AddProjectMemberDto,
  ) {
    return this.projectsService.addProjectMember(
      tenant.organizationId,
      projectId,
      dto,
    );
  }

  @UseGuards(RolesGuard)
  @RequiredRoles('ORG_ADMIN', 'MANAGER')
  @Patch(':projectId/members/:userId/remove')
  removeProjectMember(
    @CurrentTenant() tenant: TenantContext,
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ) {
    return this.projectsService.removeProjectMember(
      tenant.organizationId,
      projectId,
      userId,
    );
  }
}
