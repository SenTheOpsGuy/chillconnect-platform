import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/config';
import { createMeetingRoom } from '@/lib/meeting/google-meet';
import { sendEmail } from '@/lib/email/brevo';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        seeker: { include: { profile: true } },
        provider: { include: { profile: true } },
        transactions: true
      }
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this booking
    if (booking.seekerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if already completed
    if (booking.status === 'CONFIRMED') {
      return NextResponse.json({
        message: 'Booking already confirmed',
        booking: {
          id: booking.id,
          status: booking.status,
          meetUrl: booking.meetUrl
        }
      });
    }

    // Verify payment is completed
    const completedTransaction = booking.transactions.find(
      t => t.status === 'completed'
    );

    if (!completedTransaction) {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Create Google Meet room if not exists
    let meetUrl = booking.meetUrl;
    if (!meetUrl) {
      const meeting = await createMeetingRoom(
        'Consultation Session',
        booking.startTime,
        booking.endTime,
        [booking.seeker.email, booking.provider.email]
      );
      meetUrl = meeting.meetUrl;
    }

    // Update booking status and add meet URL
    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        status: 'CONFIRMED',
        meetUrl: meetUrl
      }
    });

    // Create session record if not exists
    const existingSession = await prisma.session.findUnique({
      where: { bookingId: params.id }
    });

    if (!existingSession) {
      await prisma.session.create({
        data: {
          bookingId: params.id,
          chatExpiresAt: new Date(booking.endTime.getTime() + 24 * 60 * 60 * 1000) // 24 hours after session
        }
      });
    }

    // Send confirmation emails
    const startTime = booking.startTime.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'short'
    });

    await Promise.all([
      sendEmail(
        booking.seeker.email,
        'Booking Confirmed - ChillConnect',
        `Your consultation with ${booking.provider.profile?.firstName} is confirmed for ${startTime}. Meet URL: ${meetUrl}`
      ),
      sendEmail(
        booking.provider.email,
        'New Booking Confirmed - ChillConnect',
        `You have a new consultation with ${booking.seeker.profile?.firstName} scheduled for ${startTime}. Meet URL: ${meetUrl}`
      )
    ]);

    // Update provider's total sessions count
    await prisma.provider.update({
      where: { userId: booking.provider.id },
      data: {
        totalSessions: { increment: 1 }
      }
    });

    return NextResponse.json({
      message: 'Booking confirmed successfully',
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        meetUrl: updatedBooking.meetUrl,
        startTime: updatedBooking.startTime,
        endTime: updatedBooking.endTime
      }
    });
  } catch (error) {
    console.error('Booking completion error:', error);
    return NextResponse.json(
      { error: 'Failed to complete booking' },
      { status: 500 }
    );
  }
}