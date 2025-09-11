import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { verifyOTP } from '@/lib/sms/twilio';
import { setRateLimit } from '@/lib/redis';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const confirmPhoneSchema = z.object({
  code: z.string().length(6, 'OTP must be 6 digits')
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
    const { code } = confirmPhoneSchema.parse(body);

    // Rate limiting for OTP confirmation - max 5 attempts per user per hour
    const rateKey = `phone_confirm_${session.user.id}`;
    const attempts = await setRateLimit(rateKey, 5, 3600);
    
    if (attempts > 5) {
      return NextResponse.json(
        { error: 'Too many confirmation attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Get user's current phone number
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true, phoneVerified: true }
    });

    if (!user?.phone) {
      return NextResponse.json(
        { error: 'No phone number found. Please add a phone number first.' },
        { status: 400 }
      );
    }

    if (user.phoneVerified) {
      return NextResponse.json(
        { error: 'Phone number is already verified.' },
        { status: 400 }
      );
    }

    // Verify OTP with Twilio
    const verification = await verifyOTP(user.phone, code);
    
    if (!verification.success || verification.status !== 'approved') {
      return NextResponse.json(
        { error: 'Invalid or expired verification code.' },
        { status: 400 }
      );
    }

    // Mark phone as verified
    await prisma.user.update({
      where: { id: session.user.id },
      data: { phoneVerified: true }
    });

    return NextResponse.json({
      success: true,
      message: 'Phone number verified successfully!',
      phoneVerified: true
    });

  } catch (error) {
    console.error('Phone confirmation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid verification code format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to verify phone number' },
      { status: 500 }
    );
  }
}