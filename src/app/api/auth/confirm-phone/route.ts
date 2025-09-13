import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { verifyOTP } from '@/lib/sms/twilio';
import { setRateLimit } from '@/lib/redis';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const confirmPhoneSchema = z.object({
  code: z.string().length(6, 'OTP must be 6 digits'),
  email: z.string().email().optional() // For pending registration verification
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, email } = confirmPhoneSchema.parse(body);

    // Check if this is for pending registration
    if (email) {
      return await handlePendingRegistrationPhoneVerification(email, code);
    }

    // Handle existing user phone verification
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

async function handlePendingRegistrationPhoneVerification(email: string, code: string) {
  // Get pending registration
  const pendingReg = await prisma.pendingRegistration.findUnique({
    where: { email }
  });

  if (!pendingReg) {
    return NextResponse.json(
      { error: 'Pending registration not found. Please register again.' },
      { status: 404 }
    );
  }

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

  if (!pendingReg.phone) {
    return NextResponse.json(
      { error: 'No phone number found for this registration.' },
      { status: 400 }
    );
  }

  if (pendingReg.phoneVerified) {
    return NextResponse.json(
      { error: 'Phone number is already verified.' },
      { status: 400 }
    );
  }

  // Verify OTP with Twilio
  const verification = await verifyOTP(pendingReg.phone, code);
  
  if (!verification.success || verification.status !== 'approved') {
    return NextResponse.json(
      { error: 'Invalid or expired verification code.' },
      { status: 400 }
    );
  }

  // Mark phone as verified in pending registration
  const updatedPendingReg = await prisma.pendingRegistration.update({
    where: { email },
    data: { phoneVerified: true }
  });

  // Check if email is also verified to create user
  if (updatedPendingReg.emailVerified) {
    // Create the actual user account
    const userData: any = {
      email: updatedPendingReg.email,
      phone: updatedPendingReg.phone,
      password: updatedPendingReg.password,
      role: updatedPendingReg.role,
      emailVerified: true,
      phoneVerified: true,
      profile: {
        create: {
          firstName: updatedPendingReg.firstName,
          lastName: updatedPendingReg.lastName
        }
      },
      wallet: {
        create: {
          balance: 0,
          pendingAmount: 0
        }
      }
    };

    // Create provider profile if user is a provider
    if (updatedPendingReg.role === 'PROVIDER') {
      userData.providerProfile = {
        create: {
          expertise: [],
          yearsExperience: 0,
          hourlyRate: 0,
          bio: '',
          verificationStatus: 'PENDING'
        }
      };
    }

    const user = await prisma.user.create({
      data: userData
    });
    
    // Delete pending registration
    await prisma.pendingRegistration.delete({
      where: { email }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Registration completed successfully! You can now login.',
      userCreated: true,
      userId: user.id
    });
  } else {
    // Still need email verification
    return NextResponse.json({
      success: true,
      message: 'Phone verified! Please verify your email to complete registration.',
      requiresEmailVerification: true
    });
  }
}