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
    console.log('Verifying OTP with Twilio:', { phone, code: code.substring(0, 3) + '***' });
    const verification = await verifyOTP(phone, code);
    
    console.log('Twilio verification result:', {
      success: verification.success,
      status: verification.status,
      error: verification.error
    });
    
    if (!verification.success || verification.status !== 'approved') {
      console.log('OTP verification failed:', verification);
      return NextResponse.json(
        { error: 'Invalid or expired OTP code.' },
        { status: 400 }
      );
    }
    
    console.log('OTP verification successful, proceeding with login');

    // Create session response with user data for frontend to use with NextAuth
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

    console.log('OTP login successful, returning user data for NextAuth integration');
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