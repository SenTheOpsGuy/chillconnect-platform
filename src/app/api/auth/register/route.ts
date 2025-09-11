import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { sendOTP } from '@/lib/email/brevo';
import { storeOTP } from '@/lib/redis';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['SEEKER', 'PROVIDER']),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, role, firstName, lastName, phone } = registerSchema.parse(body);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Check if phone is already in use
    if (phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone }
      });
      
      if (existingPhone) {
        return NextResponse.json(
          { error: 'Phone number already in use' },
          { status: 400 }
        );
      }
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create or update pending registration (expires in 1 hour)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    
    await prisma.pendingRegistration.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role,
        firstName,
        lastName,
        phone,
        emailVerified: false,
        phoneVerified: false,
        expiresAt
      },
      create: {
        email,
        password: hashedPassword,
        role,
        firstName,
        lastName,
        phone,
        expiresAt
      }
    });
    
    // Generate OTP for email
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in Redis with 10-minute expiry
    await storeOTP(`otp:${email}`, otp, 600);
    
    // Send OTP email
    await sendOTP(email, otp);
    
    return NextResponse.json({
      message: 'Verification code sent to your email. Please verify to complete registration.',
      email,
      requiresVerification: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}