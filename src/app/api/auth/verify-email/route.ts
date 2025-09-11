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
    
    // First check if this is a pending registration
    const pendingReg = await prisma.pendingRegistration.findUnique({
      where: { email }
    });
    
    if (pendingReg) {
      // Handle pending registration verification
      return await handlePendingRegistrationVerification(email, otp, pendingReg);
    }
    
    // Handle existing user email verification
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

async function handlePendingRegistrationVerification(email: string, otp: string, pendingReg: any) {
  // Check if registration has expired
  if (new Date() > pendingReg.expiresAt) {
    await prisma.pendingRegistration.delete({
      where: { email }
    });
    return NextResponse.json(
      { error: 'Registration expired. Please register again.' },
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
  
  // Mark email as verified in pending registration
  await prisma.pendingRegistration.update({
    where: { email },
    data: { emailVerified: true }
  });
  
  // Check if phone verification is also required
  const shouldCreateUser = !pendingReg.phone || pendingReg.phoneVerified;
  
  if (shouldCreateUser) {
    // Create the actual user account
    const user = await prisma.user.create({
      data: {
        email: pendingReg.email,
        phone: pendingReg.phone,
        password: pendingReg.password,
        role: pendingReg.role,
        emailVerified: true,
        phoneVerified: pendingReg.phoneVerified || false,
        profile: {
          create: {
            firstName: pendingReg.firstName,
            lastName: pendingReg.lastName
          }
        }
      }
    });
    
    // Delete pending registration
    await prisma.pendingRegistration.delete({
      where: { email }
    });
    
    // Delete OTP from Redis
    await deleteOTP(`otp:${email}`);
    
    return NextResponse.json({
      message: 'Registration completed successfully! You can now login.',
      userCreated: true,
      userId: user.id
    });
  } else {
    // Still need phone verification
    await deleteOTP(`otp:${email}`);
    
    return NextResponse.json({
      message: 'Email verified! Please verify your phone number to complete registration.',
      requiresPhoneVerification: true
    });
  }
}