import { Router } from "express";
import { register, login, logout, me } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import { registerSchema, loginSchema } from "../schemas/auth.schema";
import { authLimiter } from "../lib/rateLimit";

const router = Router();

// POST /api/auth/register - { name, email, password } -> { token, user }
router.post("/register", authLimiter, validate(registerSchema), register);

// POST /api/auth/login - { email, password } -> { token, user }
router.post("/login", authLimiter, validate(loginSchema), login);

// POST /api/auth/logout - blacklists the bearer token in Redis until it expires
router.post("/logout", requireAuth, logout);

// GET /api/auth/me -> { user }
router.get("/me", requireAuth, me);

export default router;