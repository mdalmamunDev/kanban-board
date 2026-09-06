import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { comparePassword, hashPassword } from "../lib/password";
import { signToken } from "../lib/jwt";
import { blacklistToken } from "../lib/cache";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/HttpError";
import { toUserDTO } from "../utils/dto";
import { initialsFor } from "../utils/misc";

const AVATAR_COLORS = ["#5750F1", "#3B82C4", "#2F9E5B", "#C97B1D", "#D64545", "#8B5CF6"];

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body as { name: string; email: string; password: string };
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw new HttpError(409, "An account with that email already exists.");

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      initials: initialsFor(name),
      color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      passwordHash: await hashPassword(password),
    },
  });

  const token = signToken(user.id);
  res.status(201).json({ token, user: toUserDTO(user) });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw new HttpError(401, "Invalid email or password.");
  }

  const token = signToken(user.id);
  res.json({ token, user: toUserDTO(user) });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  // Blacklist the current token in Redis until it naturally expires.
  const header = req.headers.authorization;
  const token = header && header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
  if (token) {
    try {
      // Fall back to a generous TTL; the middleware re-checks signature anyway.
      blacklistToken(token, 7 * 24 * 60 * 60).catch(() => undefined);
    } catch {
      /* ignore */
    }
  }
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: toUserDTO(req.user!) });
});