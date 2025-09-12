import { prisma } from '@/lib/db';

// Database-based OTP storage for production use when Redis is not available
export async function storeOTP(key: string, otp: string, expirySeconds: number = 600) {
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);
  
  console.log('DB OTP Storage: Storing OTP', { 
    key: key.substring(0, 15) + '...', 
    expiresAt: expiresAt.toISOString(),
    expirySeconds 
  });
  
  try {
    // Use upsert to handle key conflicts
    const result = await prisma.$executeRaw`
      INSERT INTO "OTPStorage" (key, value, expires_at, created_at, updated_at)
      VALUES (${key}, ${otp}, ${expiresAt}, NOW(), NOW())
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = ${otp},
        expires_at = ${expiresAt},
        updated_at = NOW()
    `;
    
    console.log('DB OTP Storage: OTP stored successfully', { result });
  } catch (error) {
    console.error('DB OTP Storage: Error storing OTP', error);
    throw error;
  }
}

export async function getOTP(key: string): Promise<string | null> {
  console.log('DB OTP Storage: Getting OTP', { key: key.substring(0, 15) + '...' });
  
  try {
    const result = await prisma.$queryRaw<Array<{ value: string; expires_at: Date }>>`
      SELECT value, expires_at 
      FROM "OTPStorage" 
      WHERE key = ${key} 
      AND expires_at > NOW()
      LIMIT 1
    `;
    
    console.log('DB OTP Storage: Query result', { 
      found: result.length > 0,
      resultCount: result.length 
    });
    
    if (result.length === 0) {
      // Clean up expired entries
      await deleteOTP(key);
      return null;
    }
    
    const otp = result[0].value;
    console.log('DB OTP Storage: OTP retrieved successfully');
    return otp;
  } catch (error) {
    console.error('DB OTP Storage: Error retrieving OTP', error);
    return null;
  }
}

export async function deleteOTP(key: string) {
  try {
    await prisma.$executeRaw`
      DELETE FROM "OTPStorage" 
      WHERE key = ${key}
    `;
  } catch (error) {
    console.error('Error deleting OTP:', error);
  }
}

export async function setRateLimit(key: string, limit: number, windowSeconds: number): Promise<number> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000);
  
  try {
    // Clean up old rate limit entries
    await prisma.$executeRaw`
      DELETE FROM "OTPStorage" 
      WHERE key LIKE ${key + '%'} 
      AND created_at < ${windowStart}
    `;
    
    // Count current attempts
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count 
      FROM "OTPStorage" 
      WHERE key LIKE ${key + '%'} 
      AND created_at > ${windowStart}
    `;
    
    const currentCount = Number(result[0]?.count || 0);
    
    // Add new attempt record
    const attemptKey = `${key}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + windowSeconds * 1000);
    
    await prisma.$executeRaw`
      INSERT INTO "OTPStorage" (key, value, expires_at, created_at, updated_at)
      VALUES (${attemptKey}, '1', ${expiresAt}, NOW(), NOW())
    `;
    
    return currentCount + 1;
  } catch (error) {
    console.error('Error setting rate limit:', error);
    return 1; // Return 1 to allow the request
  }
}

// Clean up expired OTP entries (can be called periodically)
export async function cleanupExpiredOTPs() {
  try {
    const result = await prisma.$executeRaw`
      DELETE FROM "OTPStorage" 
      WHERE expires_at < NOW()
    `;
    console.log('Cleaned up expired OTPs:', result);
  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
  }
}