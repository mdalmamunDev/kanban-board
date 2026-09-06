import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value");

export const idParamSchema = z.object({ id: z.string().min(1) });
export const boardIdParamSchema = z.object({ id: z.string().min(1) });
export const columnIdParamSchema = z.object({ columnId: z.string().min(1) });
export const boardMemberParamsSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
});

export const createBoardSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(500).optional(),
  color: hexColor.optional(),
});

export const updateBoardSchema = createBoardSchema.partial();

export const addMemberSchema = z
  .object({
    email: z.string().trim().email("Invalid email").optional(),
    userId: z.string().min(1).optional(),
    role: z.enum(["editor", "viewer"]).default("editor"),
  })
  .refine((v) => Boolean(v.email || v.userId), {
    message: "Provide either email or userId",
    path: ["email"],
  });

export const updateMemberSchema = z.object({
  role: z.enum(["owner", "editor", "viewer"]),
});

export const reorderSchema = z.object({
  columnIds: z.array(z.string().min(1)).min(1, "columnIds must not be empty"),
});