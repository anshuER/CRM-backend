import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type AddProjectMemberDto,
  CreateProjectDto,
  UpdateProjectDto,
} from './schemas/project.schemas';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async createProject(
    userId: string,
    organizationId: string,
    dto: CreateProjectDto,
  ) {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto?.description || '',
        organizationId,
        status: 'ACTIVE',
        createdById: userId,
      },
    });
    return {
      project,
      message: 'This action adds a new project',
    };
  }

  findAll() {
    return `This action returns all projects`;
  }

  async getProjectById(organizationId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return { project };
  }

  async updateProject(
    organizationId: string,
    projectId: string,
    dto: UpdateProjectDto,
  ) {
    await this.ensureProjectBelongsToOrganization(organizationId, projectId);

    const project = await this.prisma.project.update({
      where: {
        id: projectId,
      },
      data: dto,
    });

    return {
      message: 'Project updated successfully',
      project,
    };
  }

  async archiveProject(organizationId: string, projectId: string) {
    await this.ensureProjectBelongsToOrganization(organizationId, projectId);

    const project = await this.prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        status: 'ARCHIVED',
      },
    });

    return {
      message: 'Project archived successfully',
      project,
    };
  }

  private async ensureProjectBelongsToOrganization(
    organizationId: string,
    projectId: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }

  async getProjects(organizationId: string) {
    const projects = await this.prisma.project.findMany({
      where: {
        organizationId,
        status: {
          not: 'ARCHIVED',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { projects };
  }

  async removeProjectMember(
    organizationId: string,
    projectId: string,
    userId: string,
  ) {
    await this.ensureProjectBelongsToOrganization(organizationId, projectId);
    const projectMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!projectMember || projectMember.status !== 'ACTIVE') {
      throw new BadRequestException('Project member not found');
    }

    await this.prisma.projectMember.update({
      where: {
        id: projectMember.id,
      },
      data: {
        status: 'REMOVED',
      },
    });

    return {
      message: 'Project member removed successfully',
    };
  }

  async addProjectMember(
    organizationId: string,
    projectId: string,
    dto: AddProjectMemberDto,
  ) {
    await this.ensureProjectBelongsToOrganization(organizationId, projectId);

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: dto.userId,
        organizationId,
        status: 'ACTIVE',
      },
    });

    if (!membership) {
      throw new BadRequestException(
        'User is not an active member of this organization',
      );
    }

    const projectMember = await this.prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: dto.userId,
        },
      },
      update: {
        role: dto.role || 'MEMBER',
        status: 'ACTIVE',
      },
      create: {
        projectId,
        userId: dto.userId,
        role: dto.role || 'MEMBER',
        status: 'ACTIVE',
      },
    });

    return {
      message: 'Project member added successfully',
      projectMember,
    };
  }

  async getProjectMembers(organizationId: string, projectId: string) {
    await this.ensureProjectBelongsToOrganization(organizationId, projectId);

    const members = await this.prisma.projectMember.findMany({
      where: {
        projectId,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return { members };
  }
}
