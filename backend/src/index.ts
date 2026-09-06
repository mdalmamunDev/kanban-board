import { createApp } from "./app";
import { config } from "./config";
import prisma from "./lib/prisma";
import { redis } from "./lib/redis";

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`[api] listening on http://localhost:${config.PORT} (${config.NODE_ENV})`);
});

// Graceful shutdown - stop accepting connections, then close DB/Redis pools.
const shutdown = (signal: string) => {
  console.log(`\n[api] ${signal} received - shutting down...`);
  server.close(() => {
    void prisma.$disconnect().finally(() => {
      redis.disconnect();
      process.exit(0);
    });
  });
  // Hard exit if something hangs.
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));