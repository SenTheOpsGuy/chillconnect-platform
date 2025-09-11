import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { processRefund } from '@/lib/payments/stripe';
import { authOptions } from '@/lib/auth/config';

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
        transactions: true,
        seeker: true,
        provider: { include: { user: true } }
      }
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized to cancel (seeker or provider)
    if (booking.seekerId !== session.user.id && booking.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if booking can be cancelled
    if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Booking cannot be cancelled' },
        { status: 400 }
      );
    }

    // Calculate refund amount based on cancellation policy
    const now = new Date();
    const timeDiff = booking.startTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    let refundPercentage = 0;
    if (hoursDiff > 24) {
      refundPercentage = 1.0; // Full refund
    } else if (hoursDiff > 2) {
      refundPercentage = 0.5; // 50% refund
    }
    // No refund for cancellations within 2 hours

    const refundAmount = booking.amount * refundPercentage;

    // Process refund if applicable
    if (refundAmount > 0 && booking.transactions.length > 0) {
      const transaction = booking.transactions.find(t => t.type === 'BOOKING_PAYMENT');
      if (transaction?.stripeId) {
        await processRefund(transaction.stripeId, refundAmount);
      }
    }

    // Update booking status
    await prisma.booking.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' }
    });

    return NextResponse.json({
      message: 'Booking cancelled successfully',
      refundAmount
    });
  } catch (error) {
    console.error('Booking cancellation error:', error);
    return NextResponse.json(
      { error: 'Cancellation failed' },
      { status: 500 }
    );
  }
}