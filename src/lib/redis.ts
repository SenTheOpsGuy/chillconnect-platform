import { Redis } from '@upstash/redis';
import { mockRedis } from './redis-mock';
import * as dbOtpStorage from './otp-storage';

// Determine which storage to use
const useRedis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = useRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : mockRedis as any;

export async function storeOTP(key: string, otp: string, expirySeconds: number = 600) {
  if (useRedis) {
    await redis.setex(key, expirySeconds, otp);
  } else if (process.env.NODE_ENV === 'production') {
    // Use database storage in production when Redis is not available
    await dbOtpStorage.storeOTP(key, otp, expirySeconds);
  } else {
    // Use mock Redis in development
    await redis.setex(key, expirySeconds, otp);
  }
}

export async function getOTP(key: string): Promise<string | null> {
  if (useRedis) {
    return await redis.get(key);
  } else if (process.env.NODE_ENV === 'production') {
    return await dbOtpStorage.getOTP(key);
  } else {
    return await redis.get(key);
  }
}

export async function deleteOTP(key: string) {
  if (useRedis) {
    await redis.del(key);
  } else if (process.env.NODE_ENV === 'production') {
    await dbOtpStorage.deleteOTP(key);
  } else {
    await redis.del(key);
  }
}

export async function setRateLimit(key: string, limit: number, windowSeconds: number) {
  if (useRedis) {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    return current;
  } else if (process.env.NODE_ENV === 'production') {
    return await dbOtpStorage.setRateLimit(key, limit, windowSeconds);
  } else {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    return current;
  }
}

export { redis };