import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyOTP } from '@/lib/sms/twilio';
import { setRateLimit } from '@/lib/redis';
import { signToken } from '@/lib/auth';
import { z } from 'zod';

const verifyOTPSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format'),
  code: z.string().length(6, 'OTP must be 6 digits')
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, code } = verifyOTPSchema.parse(body);

    // Rate limiting for OTP verification - max 5 attempts per phone per hour
    const rateKey = `verify_login_otp_${phone}`;
    const attempts = await setRateLimit(rateKey, 5, 3600);
    
    if (attempts > 5) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Find user with phone number
    const user = await prisma.user.findUnique({
      where: { phone },
      include: { profile: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this phone number.' },
        { status: 404 }
      );
    }

    if (!user.phoneVerified) {
      return NextResponse.json(
        { error: 'Phone number not verified.' },
        { status: 400 }
      );
    }

    // Verify OTP with Twilio
    const verification = await verifyOTP(phone, code);
    
    if (!verification.success || verification.status !== 'approved') {
      return NextResponse.json(
        { error: 'Invalid or expired OTP code.' },
        { status: 400 }
      );
    }

    // Generate JWT token for the session
    const token = signToken({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role
    });

    // Create session response
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        profile: user.profile
      }
    });

    // Set HTTP-only cookie for session
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('OTP verification error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}