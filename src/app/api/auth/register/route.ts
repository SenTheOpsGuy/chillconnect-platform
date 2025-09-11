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
  lastName: z.string().min(1)
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, role, firstName, lastName } = registerSchema.parse(body);
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user with profile
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        profile: {
          create: {
            firstName,
            lastName
          }
        }
      }
    });
    
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in Redis with 10-minute expiry
    await storeOTP(`otp:${email}`, otp, 600);
    
    // Send OTP email
    await sendOTP(email, otp);
    
    return NextResponse.json({
      message: 'Registration successful. Check your email for verification code.',
      userId: user.id
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}