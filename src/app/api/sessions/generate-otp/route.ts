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
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Get the booking and verify user access
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        seeker: true,
        provider: true,
        session: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Only seekers can generate OTPs for their sessions
    if (booking.seekerId !== session.user.id) {
      return NextResponse.json({ error: 'Only the session participant (seeker) can generate completion OTP' }, { status: 403 });
    }

    // Check if session is in a valid state for completion
    if (!['CONFIRMED'].includes(booking.status)) {
      return NextResponse.json({ error: 'Session must be confirmed to generate completion OTP' }, { status: 400 });
    }

    // Check if session has already been completed
    if (booking.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Session is already completed' }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 15-minute expiration
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const otpKey = `session_completion_${bookingId}`;

    await prisma.oTPStorage.upsert({
      where: { key: otpKey },
      update: {
        value: otp,
        expiresAt
      },
      create: {
        key: otpKey,
        value: otp,
        expiresAt
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Session completion OTP generated successfully',
      otp,
      expiresAt,
      bookingId
    });

  } catch (error) {
    console.error('Error generating session completion OTP:', error);
    return NextResponse.json(
      { error: 'Failed to generate OTP' },
      { status: 500 }
    );
  }
}