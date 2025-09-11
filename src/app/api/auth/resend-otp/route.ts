import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendOTP } from '@/lib/email/brevo';
import { storeOTP, setRateLimit } from '@/lib/redis';
import { z } from 'zod';

const resendOTPSchema = z.object({
  email: z.string().email()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = resendOTPSchema.parse(body);
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      );
    }
    
    // Rate limiting: max 3 attempts per email per hour
    const rateLimitKey = `otp_resend_limit:${email}`;
    const attempts = await setRateLimit(rateLimitKey, 3, 3600);
    
    if (attempts > 3) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }
    
    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in Redis with 10-minute expiry
    await storeOTP(`otp:${email}`, otp, 600);
    
    // Send OTP email
    await sendOTP(email, otp);
    
    return NextResponse.json({
      message: 'Verification code sent successfully'
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}