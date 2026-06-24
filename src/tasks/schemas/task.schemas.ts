import { z } from 'zod';

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(2).max(150),
  description: z.string().max(1000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  description: z.string().max(1000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']),
});

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  projectId: z.string().uuid().optional(),
  status: z
    .enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'])
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().uuid().optional(),
  search: z.string().min(1).max(100).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateTaskDto = z.infer<typeof createTaskSchema>;
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusSchema = z.infer<typeof updateTaskStatusSchema>;
export type ListTasksQuerySchema = z.infer<typeof listTasksQuerySchema>;
