import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis | null | undefined };

function createRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 1500,
      commandTimeout: 1500,
      retryStrategy: (times) => (times > 2 ? null : Math.min(times * 200, 800)),
    });
    client.on("error", () => {
      /* swallow — fallback to memory */
    });
    return client;
  } catch {
    return null;
  }
}

export function getRedis(): Redis | null {
  if (globalForRedis.redis === undefined) {
    globalForRedis.redis = createRedis();
  }
  return globalForRedis.redis;
}

const memoryCache = new Map<string, { value: string; expires: number }>();

export async function cacheGet(key: string): Promise<string | null> {
  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status !== "ready") await redis.connect().catch(() => null);
      const v = await redis.get(key);
      if (v) return v;
    } catch {
      /* fall through */
    }
  }
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet(key: string, value: string, ttlSeconds = 10): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status !== "ready") await redis.connect().catch(() => null);
      await redis.set(key, value, "EX", ttlSeconds);
      return;
    } catch {
      /* fall through */
    }
  }
  memoryCache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
}

export async function cacheDel(pattern: string): Promise<void> {
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern) || key.startsWith(pattern)) memoryCache.delete(key);
  }
  const redis = getRedis();
  if (!redis) return;
  try {
    if (redis.status !== "ready") await redis.connect().catch(() => null);
    const keys = await redis.keys(`*${pattern}*`);
    if (keys.length) await redis.del(...keys);
  } catch {
    /* ignore */
  }
}
