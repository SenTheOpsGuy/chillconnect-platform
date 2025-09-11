import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationSMS } from '@/lib/sms/twilio';
import { setRateLimit } from '@/lib/redis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const sendPhoneOTPSchema = z.object({
  phone: z.string().min(10)
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { phone } = sendPhoneOTPSchema.parse(body);
    
    // Rate limiting: max 3 attempts per phone per hour
    const rateLimitKey = `phone_otp_limit:${phone}`;
    const attempts = await setRateLimit(rateLimitKey, 3, 3600);
    
    if (attempts > 3) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }
    
    // Send SMS verification
    const result = await sendVerificationSMS(phone);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send SMS' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Verification code sent to your phone'
    });
  } catch (error) {
    console.error('Send phone OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}