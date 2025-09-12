import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { verifyCashfreePayment } from '@/lib/payments/cashfree';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.orderId;
    console.log('Checking Cashfree payment status for order:', orderId);

    // Find the transaction to verify user access
    const transaction = await prisma.transaction.findFirst({
      where: { paypalOrderId: orderId }, // Reusing field name
      include: { 
        booking: {
          include: {
            seeker: { include: { profile: true } },
            provider: { include: { profile: true } }
          }
        }
      }
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this transaction
    if (transaction.booking.seekerId !== session.user.id && 
        transaction.booking.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get payment status from Cashfree
    const verification = await verifyCashfreePayment(orderId);
    
    if (!verification.success) {
      return NextResponse.json({
        error: 'Payment verification failed',
        details: verification.error
      }, { status: 500 });
    }

    return NextResponse.json({
      orderId: verification.orderId,
      cfOrderId: verification.cfOrderId,
      status: verification.status,
      amount: verification.amount,
      currency: verification.currency,
      bookingId: transaction.bookingId,
      bookingStatus: transaction.booking.status,
      paymentDetails: verification.paymentDetails,
      customerDetails: verification.customerDetails,
      transactionStatus: transaction.status
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}