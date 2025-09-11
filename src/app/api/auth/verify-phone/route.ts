import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyOTP } from '@/lib/sms/twilio';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const verifyPhoneSchema = z.object({
  phone: z.string().min(10),
  otp: z.string().length(6)
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
    const { phone, otp } = verifyPhoneSchema.parse(body);
    
    // Verify OTP with Twilio
    const verification = await verifyOTP(phone, otp);
    
    if (!verification.success) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }
    
    // Update user phone verification
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        phone,
        phoneVerified: true
      }
    });
    
    return NextResponse.json({
      message: 'Phone verified successfully'
    });
  } catch (error) {
    console.error('Phone verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}