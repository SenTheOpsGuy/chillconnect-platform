import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { sendVerificationSMS } from '@/lib/sms/twilio';
import { setRateLimit } from '@/lib/redis';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const phoneVerificationSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format')
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
    const { phone } = phoneVerificationSchema.parse(body);

    // Rate limiting - max 3 verification requests per user per hour
    const rateKey = `phone_verify_${session.user.id}`;
    const attempts = await setRateLimit(rateKey, 3, 3600);
    
    if (attempts > 3) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Check if phone number is already verified by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        phone,
        phoneVerified: true,
        id: { not: session.user.id } // Exclude current user
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'This phone number is already verified by another account.' },
        { status: 400 }
      );
    }

    // Update user's phone number
    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        phone,
        phoneVerified: false // Reset verification status
      }
    });

    // Send OTP via Twilio
    const result = await sendVerificationSMS(phone);
    
    if (!result.success) {
      console.error('Failed to send verification SMS:', result.error);
      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your phone number',
      attempts: attempts
    });

  } catch (error) {
    console.error('Phone verification error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Please use international format (e.g., +1234567890)' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}