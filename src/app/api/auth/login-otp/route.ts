import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendVerificationSMS } from '@/lib/sms/twilio';
import { setRateLimit } from '@/lib/redis';
import { z } from 'zod';

const loginOTPSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format')
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone } = loginOTPSchema.parse(body);

    // Rate limiting - max 3 OTP requests per phone per hour
    const rateKey = `login_otp_${phone}`;
    const attempts = await setRateLimit(rateKey, 3, 3600);
    
    if (attempts > 3) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Check if user exists with this phone number
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
        { error: 'Phone number not verified. Please verify your phone first.' },
        { status: 400 }
      );
    }

    // Send OTP via Twilio
    const result = await sendVerificationSMS(phone);
    
    if (!result.success) {
      console.error('Failed to send OTP:', result.error);
      return NextResponse.json(
        { error: 'Failed to send OTP. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully to your phone number',
      attempts: attempts
    });

  } catch (error) {
    console.error('Login OTP error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process OTP request' },
      { status: 500 }
    );
  }
}