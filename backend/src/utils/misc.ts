import { Prisma } from "@prisma/client";
import { HttpError } from "./HttpError";

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Derives a task-key prefix from a board name, e.g.
 *   "Billing & Payments" -> "BIL"   (first 3 letters)
 *   "Design System"      -> "DS"    (initials)
 */
export function deriveKeyPrefix(name: string): string {
  const words = name
    .trim()
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "TASK";
  const initials = words.map((w) => w[0]).join("");
  if (initials.length >= 2) return initials.slice(0, 3).toUpperCase();
  return words[0].slice(0, 3).toUpperCase();
}

/** Convert a Prisma error into a friendlier HttpError when practical. */
export function toHttpError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return new HttpError(409, "That record already exists.");
    if (err.code === "P2003") return new HttpError(400, "Referenced record does not exist.");
    if (err.code === "P2025") return new HttpError(404, "Record not found.");
  }
  return new HttpError(500, "Internal server error.");
}