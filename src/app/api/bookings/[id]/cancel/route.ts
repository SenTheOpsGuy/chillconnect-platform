import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/config';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Booking cancellation request:', { bookingId: params.id });
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('Cancellation failed: No session');
      return NextResponse.json({ error: 'Unauthorized. Please log in again.' }, { status: 401 });
    }

    console.log('Session user:', { userId: session.user.id, role: session.user.role });

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { 
        transactions: true,
        seeker: true,
        provider: { include: { user: true } }
      }
    });

    if (!booking) {
      console.log('Cancellation failed: Booking not found', params.id);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    console.log('Booking found:', { 
      bookingId: booking.id, 
      status: booking.status, 
      seekerId: booking.seekerId, 
      providerId: booking.providerId 
    });

    // Check if user is authorized to cancel (seeker or provider)
    if (booking.seekerId !== session.user.id && booking.providerId !== session.user.id) {
      console.log('Cancellation failed: User not authorized', {
        sessionUserId: session.user.id,
        bookingSeekerId: booking.seekerId,
        bookingProviderId: booking.providerId
      });
      return NextResponse.json({ error: 'You are not authorized to cancel this booking' }, { status: 403 });
    }

    // Check if booking can be cancelled
    if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
      console.log('Cancellation failed: Invalid status', { status: booking.status });
      return NextResponse.json(
        { error: `Booking cannot be cancelled. Current status: ${booking.status}` },
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
      if (transaction?.paypalOrderId) {
        // TODO: Implement PayPal refund functionality when needed
        console.log(`Refund required: $${refundAmount} for PayPal order: ${transaction.paypalOrderId}`);
      }
    }

    console.log('Proceeding with cancellation:', { 
      refundAmount, 
      refundPercentage, 
      hoursDiff: hoursDiff.toFixed(2) 
    });

    // Update booking status
    await prisma.booking.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' }
    });

    console.log('Booking cancelled successfully:', params.id);

    return NextResponse.json({
      message: 'Booking cancelled successfully',
      refundAmount
    });
  } catch (error) {
    console.error('Booking cancellation error:', error);
    
    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Cancellation failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}