import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOTP, deleteOTP } from '@/lib/redis';
import { z } from 'zod';

const verifyEmailSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6)
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp } = verifyEmailSchema.parse(body);
    
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
    
    // Get OTP from Redis
    const storedOTP = await getOTP(`otp:${email}`);
    
    if (!storedOTP || storedOTP !== otp) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }
    
    // Update user as verified
    await prisma.user.update({
      where: { email },
      data: {
        emailVerified: true
      }
    });
    
    // Delete OTP from Redis
    await deleteOTP(`otp:${email}`);
    
    return NextResponse.json({
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}