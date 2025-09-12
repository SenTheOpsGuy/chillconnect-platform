import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/config';

export async function GET(
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
    if (booking.seekerId !== session.user.id && booking.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If booking is payment pending, check if payment deadline has passed
    if (booking.status === 'PAYMENT_PENDING') {
      const currentTime = new Date();
      const bookingTime = new Date(booking.startTime);
      const paymentDeadline = new Date(bookingTime.getTime() - 60 * 60 * 1000); // 1 hour before

      if (currentTime >= paymentDeadline) {
        console.log(`Payment deadline passed for booking ${booking.id}. Removing booking.`);
        
        // Remove the booking and any associated transactions
        await prisma.transaction.deleteMany({
          where: { bookingId: booking.id }
        });
        
        await prisma.booking.delete({
          where: { id: booking.id }
        });
        
        return NextResponse.json({
          error: 'deadline_exceeded',
          message: 'The payment deadline has passed. Please make a new booking.',
          expired: true
        }, { status: 410 }); // 410 Gone status code
      }
      
      // Add payment deadline info to response for pending bookings
      const timeLeft = paymentDeadline.getTime() - currentTime.getTime();
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      
      return NextResponse.json({
        id: booking.id,
        status: booking.status,
        startTime: booking.startTime,
        endTime: booking.endTime,
        amount: booking.amount,
        seeker: {
          name: `${booking.seeker.profile?.firstName} ${booking.seeker.profile?.lastName}`,
          email: booking.seeker.email
        },
        provider: {
          name: `${booking.provider.profile?.firstName} ${booking.provider.profile?.lastName}`,
          email: booking.provider.email
        },
        paymentStatus: booking.transactions?.[0]?.status || 'pending',
        paymentDeadline: paymentDeadline.toISOString(),
        timeRemaining: {
          hours: hoursLeft,
          minutes: minutesLeft,
          total: timeLeft
        }
      });
    }

    return NextResponse.json({
      id: booking.id,
      status: booking.status,
      startTime: booking.startTime,
      endTime: booking.endTime,
      amount: booking.amount,
      meetUrl: booking.meetUrl,
      seeker: {
        name: `${booking.seeker.profile?.firstName} ${booking.seeker.profile?.lastName}`,
        email: booking.seeker.email
      },
      provider: {
        name: `${booking.provider.profile?.firstName} ${booking.provider.profile?.lastName}`,
        email: booking.provider.email
      },
      paymentStatus: booking.transactions?.[0]?.status || 'pending'
    });
  } catch (error) {
    console.error('Booking status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking status' },
      { status: 500 }
    );
  }
}