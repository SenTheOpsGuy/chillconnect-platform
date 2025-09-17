import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, otp } = body;

    if (!bookingId || !otp) {
      return NextResponse.json({ error: 'Booking ID and OTP are required' }, { status: 400 });
    }

    // Get the booking and verify user access
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        seeker: { include: { profile: true } },
        provider: { include: { profile: true } },
        session: true,
        earnings: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Only providers can complete sessions
    if (booking.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Only the service provider can complete sessions' }, { status: 403 });
    }

    // Check if session is in a valid state for completion
    if (!['CONFIRMED'].includes(booking.status)) {
      return NextResponse.json({ error: 'Session must be confirmed to be completed' }, { status: 400 });
    }

    // Check if session has already been completed
    if (booking.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Session is already completed' }, { status: 400 });
    }

    // Verify OTP
    const otpKey = `session_completion_${bookingId}`;
    const storedOTP = await prisma.oTPStorage.findUnique({
      where: { key: otpKey }
    });

    if (!storedOTP) {
      return NextResponse.json({ error: 'OTP not found or expired. Please ask the seeker to generate a new OTP.' }, { status: 400 });
    }

    if (storedOTP.expiresAt < new Date()) {
      await prisma.oTPStorage.delete({ where: { key: otpKey } });
      return NextResponse.json({ error: 'OTP has expired. Please ask the seeker to generate a new OTP.' }, { status: 400 });
    }

    if (storedOTP.value !== otp) {
      return NextResponse.json({ error: 'Invalid OTP. Please check the code and try again.' }, { status: 400 });
    }

    // Complete the session within a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update booking status to completed
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'COMPLETED' }
      });

      // Update or create session record
      const sessionRecord = await tx.session.upsert({
        where: { bookingId },
        update: { 
          endedAt: new Date(),
          startedAt: booking.session?.startedAt || booking.startTime
        },
        create: {
          bookingId,
          startedAt: booking.startTime,
          endedAt: new Date()
        }
      });

      // Create provider earnings if not already exists
      if (!booking.earnings) {
        const platformCommission = booking.amount * 0.15; // 15% platform commission
        const providerAmount = booking.amount - platformCommission;

        await tx.providerEarnings.create({
          data: {
            bookingId,
            providerId: booking.providerId,
            amount: providerAmount,
            platformCommission,
            status: 'PENDING' // Will be auto-approved after 24 hours
          }
        });
      }

      // Delete the used OTP
      await tx.oTPStorage.delete({ where: { key: otpKey } });

      return { updatedBooking, sessionRecord };
    });

    return NextResponse.json({
      success: true,
      message: 'Session completed successfully',
      booking: {
        id: result.updatedBooking.id,
        status: result.updatedBooking.status,
        completedAt: result.sessionRecord.endedAt
      }
    });

  } catch (error) {
    console.error('Error completing session:', error);
    return NextResponse.json(
      { error: 'Failed to complete session' },
      { status: 500 }
    );
  }
}