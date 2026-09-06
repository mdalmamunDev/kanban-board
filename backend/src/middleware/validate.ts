import { RequestHandler } from "express";
import { ZodTypeAny } from "zod";
import { HttpError } from "../utils/HttpError";

/**
 * Validates req[source] against a zod schema. On success the parsed value
 * replaces req[source], so downstream handlers see typed, sanitised data.
 */
export function validate(schema: ZodTypeAny, source: "body" | "query" | "params" = "body"): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = result.error.issues
        .map((i) => `${i.path.join(".") || source}: ${i.message}`)
        .join("; ");
      next(new HttpError(400, message));
      return;
    }
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
}