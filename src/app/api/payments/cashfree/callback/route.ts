import { NextRequest, NextResponse } from 'next/server';
import { verifyCashfreePayment } from '@/lib/payments/cashfree';
import { prisma } from '@/lib/db';
import { sendBookingConfirmationEmails } from '@/lib/email/templates';

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
        // Payment successful - ensure booking is confirmed and emails sent
        await processSuccessfulPayment(transaction, orderId);
        return NextResponse.redirect(
          new URL(`/booking/success?booking=${transaction.bookingId}`, req.url)
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

// Helper function to process successful payment and ensure booking confirmation
async function processSuccessfulPayment(transaction: any, orderId: string) {
  try {
    console.log('Processing successful payment callback:', { orderId, bookingId: transaction.bookingId });

    // Check if booking is already confirmed (to avoid duplicate processing)
    const currentBooking = await prisma.booking.findUnique({
      where: { id: transaction.bookingId },
      include: {
        seeker: { include: { profile: true } },
        provider: { include: { profile: true } }
      }
    });

    if (!currentBooking) {
      console.error('Booking not found during payment processing:', transaction.bookingId);
      return;
    }

    // Check if already confirmed (webhook might have processed it already)
    if (currentBooking.status === 'CONFIRMED') {
      console.log('Booking already confirmed - likely processed by webhook');
      return;
    }

    // Check payment deadline (1 hour before booking time)
    const currentTime = new Date();
    const bookingTime = new Date(currentBooking.startTime);
    const paymentDeadline = new Date(bookingTime.getTime() - 60 * 60 * 1000);

    if (currentTime >= paymentDeadline) {
      console.log(`Payment deadline passed for booking ${currentBooking.id}. Cannot confirm booking.`);
      // TODO: Process automatic refund through Cashfree API
      return;
    }

    // Update transaction status
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'completed',
        paypalCaptureId: orderId // Store Cashfree order ID
      }
    });

    // Create meeting link and update booking status
    const meetingId = Math.random().toString(36).substring(2, 15);
    const meetingLink = `https://meet.google.com/${meetingId}`;
    
    await prisma.booking.update({
      where: { id: transaction.bookingId },
      data: { 
        status: 'CONFIRMED',
        meetUrl: meetingLink
      }
    });

    // Prepare and send confirmation emails
    const emailData = {
      id: currentBooking.id,
      startTime: currentBooking.startTime.toISOString(),
      endTime: currentBooking.endTime.toISOString(),
      amount: currentBooking.amount,
      meetUrl: meetingLink,
      seeker: {
        name: `${currentBooking.seeker.profile?.firstName || ''} ${currentBooking.seeker.profile?.lastName || ''}`.trim() || 'Customer',
        email: currentBooking.seeker.email || ''
      },
      provider: {
        name: `${currentBooking.provider.profile?.firstName || ''} ${currentBooking.provider.profile?.lastName || ''}`.trim() || 'Provider',
        email: currentBooking.provider.email || ''
      }
    };

    console.log('Sending booking confirmation emails from callback...');
    const emailResults = await sendBookingConfirmationEmails(emailData);
    
    console.log('Payment callback processing completed:', {
      orderId,
      bookingId: transaction.bookingId,
      meetingLink,
      emailResults
    });

  } catch (error) {
    console.error('Error processing successful payment in callback:', error);
    // Don't throw error - we don't want to break the redirect flow
  }
}