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

// Log Redis configuration status
console.log('Redis Configuration:', {
  useRedis,
  hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
  hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
  hasRedisUrl: !!process.env.REDIS_URL,
  nodeEnv: process.env.NODE_ENV,
  willUseDatabase: !useRedis && process.env.NODE_ENV === 'production'
});

export async function storeOTP(key: string, otp: string, expirySeconds: number = 600) {
  try {
    if (useRedis) {
      console.log('Storing OTP in Redis:', { key: key.substring(0, 10) + '...', expirySeconds });
      await redis.setex(key, expirySeconds, otp);
    } else if (process.env.NODE_ENV === 'production') {
      // Use database storage in production when Redis is not available
      console.log('Storing OTP in database:', { key: key.substring(0, 10) + '...', expirySeconds });
      await dbOtpStorage.storeOTP(key, otp, expirySeconds);
    } else {
      // Use mock Redis in development
      console.log('Storing OTP in mock Redis:', { key: key.substring(0, 10) + '...', expirySeconds });
      await redis.setex(key, expirySeconds, otp);
    }
    console.log('OTP stored successfully');
  } catch (error) {
    console.error('Error storing OTP:', error);
    throw error;
  }
}

export async function getOTP(key: string): Promise<string | null> {
  try {
    let result: string | null = null;
    
    if (useRedis) {
      console.log('Getting OTP from Redis:', { key: key.substring(0, 10) + '...' });
      result = await redis.get(key);
    } else if (process.env.NODE_ENV === 'production') {
      console.log('Getting OTP from database:', { key: key.substring(0, 10) + '...' });
      result = await dbOtpStorage.getOTP(key);
    } else {
      console.log('Getting OTP from mock Redis:', { key: key.substring(0, 10) + '...' });
      result = await redis.get(key);
    }
    
    console.log('OTP retrieved:', { found: !!result });
    return result;
  } catch (error) {
    console.error('Error getting OTP:', error);
    return null;
  }
}

export async function deleteOTP(key: string) {
  try {
    if (useRedis) {
      console.log('Deleting OTP from Redis:', { key: key.substring(0, 10) + '...' });
      await redis.del(key);
    } else if (process.env.NODE_ENV === 'production') {
      console.log('Deleting OTP from database:', { key: key.substring(0, 10) + '...' });
      await dbOtpStorage.deleteOTP(key);
    } else {
      console.log('Deleting OTP from mock Redis:', { key: key.substring(0, 10) + '...' });
      await redis.del(key);
    }
    console.log('OTP deleted successfully');
  } catch (error) {
    console.error('Error deleting OTP:', error);
  }
}

export async function setRateLimit(key: string, limit: number, windowSeconds: number) {
  try {
    let current: number;
    
    if (useRedis) {
      console.log('Setting rate limit in Redis:', { key: key.substring(0, 15) + '...', limit, windowSeconds });
      current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.log('Setting rate limit in database:', { key: key.substring(0, 15) + '...', limit, windowSeconds });
      current = await dbOtpStorage.setRateLimit(key, limit, windowSeconds);
    } else {
      console.log('Setting rate limit in mock Redis:', { key: key.substring(0, 15) + '...', limit, windowSeconds });
      current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }
    }
    
    console.log('Rate limit set:', { current, limit, exceeded: current > limit });
    return current;
  } catch (error) {
    console.error('Error setting rate limit:', error);
    return 1; // Return 1 to allow the request
  }
}

export { redis };