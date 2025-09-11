import { Redis } from '@upstash/redis';
import { mockRedis } from './redis-mock';

const redis = process.env.NODE_ENV === 'development' && (!process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL === 'local://mock')
  ? mockRedis as any
  : process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : mockRedis as any;

export async function storeOTP(key: string, otp: string, expirySeconds: number = 600) {
  await redis.setex(key, expirySeconds, otp);
}

export async function getOTP(key: string): Promise<string | null> {
  return await redis.get(key);
}

export async function deleteOTP(key: string) {
  await redis.del(key);
}

export async function setRateLimit(key: string, _limit: number, windowSeconds: number) {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }
  return current;
}

export { redis };