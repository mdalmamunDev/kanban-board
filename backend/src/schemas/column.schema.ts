import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value");

export const createColumnSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(80),
});

export const updateColumnSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    color: hexColor.optional(),
    wipLimit: z.number().int().min(0).nullable().optional(),
  })
  .partial();