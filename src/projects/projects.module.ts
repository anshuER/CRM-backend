import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TenantGuard } from 'src/common/guards/tenant.guard';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, TenantGuard, RolesGuard],
})
export class ProjectsModule {}
