import { NextRequest, NextResponse } from 'next/server';
import { verifyCashfreePayment } from '@/lib/payments/cashfree';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('order_id');
    const orderToken = searchParams.get('order_token');
    
    console.log('Cashfree payment callback received:', { orderId, orderToken });
    
    if (!orderId) {
      return NextResponse.redirect(new URL('/booking/payment?error=missing_order_id', req.url));
    }
    
    // Verify payment status with Cashfree
    const verification = await verifyCashfreePayment(orderId);
    
    if (!verification.success) {
      console.error('Cashfree payment verification failed:', verification.error);
      return NextResponse.redirect(new URL('/booking/payment?error=verification_failed', req.url));
    }
    
    console.log('Payment verification result:', {
      orderId: verification.orderId,
      status: verification.status,
      amount: verification.amount
    });
    
    // Find the transaction
    const transaction = await prisma.transaction.findFirst({
      where: { paypalOrderId: orderId }, // Reusing the field name
      include: { booking: true }
    });
    
    if (!transaction) {
      console.error('Transaction not found for Cashfree order:', orderId);
      return NextResponse.redirect(new URL('/booking/payment?error=transaction_not_found', req.url));
    }

    // Handle different payment statuses
    switch (verification.status) {
      case 'PAID':
        // Payment successful - redirect to success page
        return NextResponse.redirect(
          new URL(`/booking/success?booking_id=${transaction.bookingId}&order_id=${orderId}`, req.url)
        );
      
      case 'ACTIVE':
      case 'PARTIALLY_PAID':
        // Payment still in progress
        return NextResponse.redirect(
          new URL(`/booking/payment?order_id=${orderId}&status=processing&message=Payment is being processed. Please wait.`, req.url)
        );
      
      case 'EXPIRED':
      case 'CANCELLED':
      case 'TERMINALFAILED':
        // Payment failed or cancelled
        return NextResponse.redirect(
          new URL(`/booking/payment?order_id=${orderId}&error=payment_failed&message=Payment was cancelled or failed. Please try again.`, req.url)
        );
      
      default:
        // Unknown status
        console.warn('Unknown Cashfree payment status:', verification.status);
        return NextResponse.redirect(
          new URL(`/booking/payment?order_id=${orderId}&error=unknown_status&message=Payment status unclear. Please contact support.`, req.url)
        );
    }
    
  } catch (error) {
    console.error('Cashfree callback handler error:', error);
    return NextResponse.redirect(new URL('/booking/payment?error=processing_failed', req.url));
  }
}

export async function POST(req: NextRequest) {
  // Handle POST requests the same way as GET for Cashfree returns
  return GET(req);
}