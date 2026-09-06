import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "./redis";

// rate-limit-redis needs a low-level command forwarder; ioredis exposes .call().
// Reply values pass through untouched, so the cast only satisfies its narrow typing.
const sendCommand = (...args: string[]) =>
  redis.call(args[0], ...args.slice(1)) as unknown as Promise<boolean | number | string>;

const makeStore = () => new RedisStore({ sendCommand });

/**
 * Global API limiter: 100 requests / minute / IP, counters kept in Redis so
 * limits are shared across instances and survive restarts.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: makeStore(),
  passOnStoreError: true, // never let a Redis outage take the API down
  message: { error: "Too many requests. Please slow down." },
});

/** Stricter limiter for credential endpoints: 20 attempts / 15 minutes / IP. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: makeStore(),
  passOnStoreError: true,
  message: { error: "Too many attempts. Try again in a few minutes." },
});