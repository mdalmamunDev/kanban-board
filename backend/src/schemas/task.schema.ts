import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().max(5000).nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid date" })
    .nullable()
    .optional(),
  labelIds: z.array(z.string().min(1)).optional(),
  assigneeIds: z.array(z.string().min(1)).optional(),
  subtasksDone: z.number().int().min(0).optional(),
  subtasksTotal: z.number().int().min(0).optional(),
  commentCount: z.number().int().min(0).optional(),
});

export const moveTaskSchema = z.object({
  toColumnId: z.string().min(1, "toColumnId is required"),
  toIndex: z.number().int().min(0).default(0),
});