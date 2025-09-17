import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/config';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    // Get booking with provider info
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        seeker: { include: { profile: true } },
        provider: { 
          include: { 
            profile: true,
            providerProfile: true
          }
        },
        transactions: {
          where: { status: 'completed' }
        },
        earnings: true
      }
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check authorization - provider or seeker can mark as complete
    if (booking.seekerId !== session.user.id && booking.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if booking is in valid state
    if (booking.status !== 'CONFIRMED') {
      return NextResponse.json({ 
        error: 'Booking must be confirmed to complete session' 
      }, { status: 400 });
    }

    // Check if session time has passed
    const now = new Date();
    if (now < booking.endTime) {
      return NextResponse.json({ 
        error: 'Session has not ended yet' 
      }, { status: 400 });
    }

    // Check if earnings already created
    if (booking.earnings) {
      return NextResponse.json({
        message: 'Session already completed',
        earnings: {
          id: booking.earnings.id,
          amount: booking.earnings.amount,
          status: booking.earnings.status
        }
      });
    }

    // Find completed transaction
    const completedTransaction = booking.transactions.find(t => t.status === 'completed');
    if (!completedTransaction) {
      return NextResponse.json({ 
        error: 'No completed payment found for this booking' 
      }, { status: 400 });
    }

    // Calculate earnings (50% commission by default)
    const totalAmount = booking.amount;
    const commissionRate = 0.5; // TODO: Get from platform settings or provider-specific rate
    const platformCommission = totalAmount * commissionRate;
    const providerAmount = totalAmount - platformCommission;

    // Create earnings record within transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update booking status to completed
      await tx.booking.update({
        where: { id },
        data: { status: 'COMPLETED' }
      });

      // Create provider earnings
      const earnings = await tx.providerEarnings.create({
        data: {
          providerId: booking.provider.providerProfile!.id,
          bookingId: booking.id,
          amount: providerAmount,
          platformCommission: platformCommission,
          totalAmount: totalAmount,
          status: 'PENDING',
          disputeDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        }
      });

      return earnings;
    });

    console.log(`Session completed for booking ${id}. Created earnings ${result.id} for ₹${providerAmount}`);

    return NextResponse.json({
      success: true,
      message: 'Session completed successfully',
      booking: {
        id: booking.id,
        status: 'COMPLETED'
      },
      earnings: {
        id: result.id,
        amount: result.amount,
        platformCommission: result.platformCommission,
        totalAmount: result.totalAmount,
        status: result.status,
        disputeDeadline: result.disputeDeadline
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