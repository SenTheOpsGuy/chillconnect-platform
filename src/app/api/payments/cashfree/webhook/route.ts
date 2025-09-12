import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyCashfreeWebhook } from '@/lib/payments/cashfree';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature') || '';
    const timestamp = req.headers.get('x-webhook-timestamp') || '';

    console.log('Cashfree webhook received:', { 
      signature: signature.substring(0, 20) + '...', 
      timestamp,
      bodyLength: rawBody.length 
    });

    // Verify webhook signature for security
    const isValidSignature = verifyCashfreeWebhook(rawBody, signature, timestamp);
    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const webhookData = JSON.parse(rawBody);
    const { type, data } = webhookData;

    console.log('Processing Cashfree webhook:', { type, orderId: data?.order?.order_id });

    // Handle different webhook events
    switch (type) {
      case 'PAYMENT_SUCCESS_WEBHOOK':
        await handlePaymentSuccess(data);
        break;
      
      case 'PAYMENT_FAILED_WEBHOOK':
        await handlePaymentFailure(data);
        break;
      
      case 'PAYMENT_USER_DROPPED_WEBHOOK':
        await handlePaymentDropped(data);
        break;
      
      default:
        console.log('Unhandled webhook type:', type);
    }

    return NextResponse.json({ status: 'success', message: 'Webhook processed' });

  } catch (error) {
    console.error('Cashfree webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(data: any) {
  const { order, payment } = data;
  const orderId = order.order_id;
  const cfPaymentId = payment.cf_payment_id;
  const amount = payment.payment_amount;

  console.log('Processing payment success:', { orderId, cfPaymentId, amount });

  try {
    // Find the transaction by order ID
    const transaction = await prisma.transaction.findFirst({
      where: { paypalOrderId: orderId }, // Reusing the field name for now
      include: { booking: true }
    });

    if (!transaction) {
      console.error('Transaction not found for Cashfree order:', orderId);
      return;
    }

    // Check if booking still exists and payment deadline hasn't passed
    if (!transaction.booking) {
      console.error('Booking not found for transaction:', transaction.id);
      return;
    }

    // Check payment deadline (1 hour before booking time)
    const currentTime = new Date();
    const bookingTime = new Date(transaction.booking.startTime);
    const paymentDeadline = new Date(bookingTime.getTime() - 60 * 60 * 1000);

    if (currentTime >= paymentDeadline) {
      console.log(`Payment deadline passed for booking ${transaction.booking.id}. Processing refund.`);
      
      // TODO: Process automatic refund through Cashfree API
      console.log('TODO: Process refund for expired booking');
      
      // Remove the booking and transaction
      await prisma.transaction.delete({
        where: { id: transaction.id }
      });
      
      await prisma.booking.delete({
        where: { id: transaction.booking.id }
      });
      
      return;
    }

    // Update transaction with payment details
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'completed',
        paypalCaptureId: cfPaymentId // Reusing field for Cashfree payment ID
      }
    });

    // Update booking status to confirmed
    await prisma.booking.update({
      where: { id: transaction.bookingId },
      data: { status: 'CONFIRMED' }
    });

    // Create meeting link and send confirmations
    await createMeetingAndSendConfirmations(transaction.bookingId);

    console.log('Payment success processed successfully:', { orderId, bookingId: transaction.bookingId });

  } catch (error) {
    console.error('Error processing payment success:', error);
  }
}

async function handlePaymentFailure(data: any) {
  const { order } = data;
  const orderId = order.order_id;

  console.log('Processing payment failure:', { orderId });

  try {
    // Find and update transaction
    const transaction = await prisma.transaction.findFirst({
      where: { paypalOrderId: orderId }
    });

    if (transaction) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'failed' }
      });

      // Keep booking in PAYMENT_PENDING status for retry
      console.log('Payment failed - booking remains in PAYMENT_PENDING status for retry');
    }

  } catch (error) {
    console.error('Error processing payment failure:', error);
  }
}

async function handlePaymentDropped(data: any) {
  const { order } = data;
  const orderId = order.order_id;

  console.log('Processing payment dropped (user cancelled):', { orderId });

  try {
    // Find and update transaction
    const transaction = await prisma.transaction.findFirst({
      where: { paypalOrderId: orderId }
    });

    if (transaction) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'cancelled' }
      });

      // Keep booking in PAYMENT_PENDING status
      console.log('Payment cancelled by user - booking remains in PAYMENT_PENDING status');
    }

  } catch (error) {
    console.error('Error processing payment cancellation:', error);
  }
}

// Helper function to create meeting and send confirmations
async function createMeetingAndSendConfirmations(bookingId: string) {
  try {
    // Get booking details with user information
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        seeker: {
          include: {
            profile: true
          }
        },
        provider: {
          include: {
            profile: true,
            providerProfile: true
          }
        }
      }
    });

    if (!booking) {
      console.error('Booking not found for meeting creation:', bookingId);
      return;
    }

    // Create Google Meet link (simplified - in production you'd use Google Calendar API)
    const meetingId = Math.random().toString(36).substring(2, 15);
    const meetingLink = `https://meet.google.com/${meetingId}`;
    
    // Update booking with meeting link
    await prisma.booking.update({
      where: { id: bookingId },
      data: { meetUrl: meetingLink }
    });

    // Log confirmation details (in production, send actual emails)
    console.log('Booking confirmed via Cashfree payment:', {
      bookingId,
      meetingLink,
      seekerEmail: booking.seeker.email,
      providerEmail: booking.provider.email,
      scheduledAt: booking.startTime
    });

  } catch (error) {
    console.error('Error creating meeting and sending confirmations:', error);
    // Don't throw here - we don't want to fail the payment process
  }
}