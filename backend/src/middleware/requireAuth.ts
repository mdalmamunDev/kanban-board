import { RequestHandler } from "express";
import prisma from "../lib/prisma";
import { verifyToken } from "../lib/jwt";
import { isTokenBlacklisted } from "../lib/cache";
import { HttpError } from "../utils/HttpError";

/**
 * Verifies a Bearer JWT, checks the Redis token-blacklist, loads the user,
 * and attaches it to req.user. Every protected route sits behind this.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new HttpError(401, "Missing or invalid Authorization header.");
    }
    const token = header.slice("Bearer ".length).trim();
    const payload = verifyToken(token);
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      throw new HttpError(401, "Session has been revoked. Please sign in again.");
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new HttpError(401, "User no longer exists.");
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof HttpError) {
      next(err);
      return;
    }
    next(new HttpError(401, "Invalid or expired token."));
  }
};

export const currentUserId = (req: { user?: { id: string } }): string => {
  if (!req.user) throw new HttpError(401, "Not authenticated.");
  return req.user.id;
};