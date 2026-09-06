import { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/HttpError";
import { toHttpError } from "../utils/misc";
import { Prisma } from "@prisma/client";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if ((err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON body." });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const http = toHttpError(err);
    res.status(http.status).json({ error: http.message });
    return;
  }
  console.error("[error]", err);
  res.status(500).json({ error: "Internal server error." });
}