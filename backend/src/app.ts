import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { config, isProd } from "./config";
import { apiLimiter } from "./lib/rateLimit";
import prisma from "./lib/prisma";
import { redis } from "./lib/redis";
import { asyncHandler } from "./utils/asyncHandler";
import { logTimestamp } from "./utils/time";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import boardRoutes from "./routes/board.routes";
import columnRoutes from "./routes/column.routes";
import taskRoutes from "./routes/task.routes";

export function createApp(): express.Express {
  const app = express();

  // Security headers + CORS for the Next.js frontend.
  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN.split(",").map((o) => o.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  if (!isProd) {
    // Same info as morgan("dev"), but with a GMT+6 timestamp prefix.
    morgan.token("tztime", () => logTimestamp());
    app.use(morgan("[:tztime GMT+6] :method :url :status :response-time ms - :res[content-length]"));
  }

  // Redis-backed global rate limit (100 req/min/IP).
  app.use("/api", apiLimiter);

  // Liveness/readiness - reports DB + Redis connectivity (also the Docker healthcheck).
  app.get(
    "/api/health",
    asyncHandler(async (_req, res) => {
      const [db, cache] = await Promise.all([
        prisma
          .$queryRaw`SELECT 1`
          .then(() => true)
          .catch(() => false),
        redis
          .ping()
          .then(() => true)
          .catch(() => false),
      ]);
      res.status(db ? 200 : 503).json({
        status: db ? "ok" : "degraded",
        services: { db, cache },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    })
  );

  app.use("/api/auth", authRoutes);
  app.use("/api/boards", boardRoutes);
  app.use("/api/columns", columnRoutes);
  app.use("/api/tasks", taskRoutes);

  // JSON 404 for unknown routes (before the error handler).
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found." });
  });

  app.use(errorHandler);
  return app;
}