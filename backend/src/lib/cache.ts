import { redis } from "./redis";

/**
 * Best-effort cache helpers. Every call is wrapped in try/catch so a Redis
 * outage never breaks the API - it degrades to a cache-miss + DB read.
 */

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    /* ignore */
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    /* ignore */
  }
}

/**
 * Invalidate everything that references a board:
 *  - the board payload itself
 *  - the owner's "my boards" list
 *  - every member's "shared boards" list
 */
export async function invalidateBoard(boardId: string, userIds: string[]): Promise<void> {
  const keys = [`board:${boardId}`];
  for (const uid of [...new Set(userIds)]) {
    keys.push(`boards:mine:${uid}`, `boards:shared:${uid}`);
  }
  await cacheDel(...keys);
}

export async function blacklistToken(token: string, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(`auth:blacklist:${token}`, "1", "EX", ttlSeconds);
  } catch {
    /* ignore */
  }
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    return Boolean(await redis.get(`auth:blacklist:${token}`));
  } catch {
    return false;
  }
}