import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { RequiredRoles } from 'src/common/decorators/ roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { type CurrentAuthUser } from 'src/auth/types/auth.types';
import { CurrentTenant } from 'src/common/decorators/current-tenant.decorator';
import { type TenantContext } from 'src/common/types/tenant-context.type';
import { ZodValidationPipes } from 'src/auth/pipes/zod-validation.pipe';
import { type CreateTaskDto, createTaskSchema } from './schemas/task.schemas';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @UseGuards(RolesGuard)
  @RequiredRoles('ORG_ADMIN', 'MANAGER')
  @Post()
  createTask(
    @CurrentUser() user: CurrentAuthUser,
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipes(createTaskSchema)) dto: CreateTaskDto,
  ) {
    return this.tasksService.create(dto);
  }

  @Get()
  findAll() {
    return this.tasksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaskDto) {
    return this.tasksService.update(+id, updateTaskDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(+id);
  }
}
