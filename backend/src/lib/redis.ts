import Redis from "ioredis";
import { config } from "../config";

/**
 * Shared Redis connection.
 * - Offline queue stays enabled (default): commands issued while the socket is
 *   still connecting (e.g. the rate-limit store loading its scripts at boot)
 *   are buffered and replayed once connected, instead of throwing.
 * - Reconnect forever with capped backoff - the API must survive a Redis
 *   restart, and every consumer treats Redis failures as best-effort.
 */
const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 2,
  retryStrategy: (times) => Math.min(times * 200, 5000),
});
redis.on("error", (err) => {
  // Log but never crash - cache ops and the rate limiter degrade gracefully.
  console.warn(`[redis] connection error: ${err.message}`);
});
redis.on("connect", () => console.log("[redis] connected"));

export { redis };
export default redis;