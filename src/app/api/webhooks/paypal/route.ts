import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { capturePayPalOrder } from '@/lib/payments/paypal';

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

    // Send confirmation emails (simplified - in production you'd use a proper email service)
    console.log('Booking confirmed:', {
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // PayPal webhook event handling
    const eventType = body.event_type;
    
    switch (eventType) {
      case 'CHECKOUT.ORDER.APPROVED':
        return await handleOrderApproved(body);
        
      case 'PAYMENT.CAPTURE.COMPLETED':
        return await handlePaymentCompleted(body);
        
      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.FAILED':
        return await handlePaymentFailed(body);
        
      default:
        console.log(`Unhandled PayPal webhook event: ${eventType}`);
        return NextResponse.json({ received: true });
    }
  } catch (error) {
    console.error('PayPal webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handling failed' },
      { status: 500 }
    );
  }
}

async function handleOrderApproved(event: any) {
  const orderId = event.resource.id;
  
  try {
    // Capture the payment immediately after approval
    const captureResult = await capturePayPalOrder(orderId);
    
    if (captureResult.success) {
      // Find the transaction by PayPal order ID
      const transaction = await prisma.transaction.findFirst({
        where: { paypalOrderId: orderId },
        include: { booking: true }
      });
      
      if (transaction) {
        // Update transaction status
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'completed',
            paypalCaptureId: captureResult.captureId
          }
        });
        
        // Update booking status to confirmed
        await prisma.booking.update({
          where: { id: transaction.bookingId },
          data: { status: 'CONFIRMED' }
        });
        
        // Create Google Meet link and send confirmations
        await createMeetingAndSendConfirmations(transaction.bookingId);
        console.log(`Payment captured for booking ${transaction.bookingId}`);
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling PayPal order approved:', error);
    return NextResponse.json({ received: true });
  }
}

async function handlePaymentCompleted(event: any) {
  const captureId = event.resource.id;
  
  try {
    // Find transaction by capture ID
    const transaction = await prisma.transaction.findFirst({
      where: { paypalCaptureId: captureId },
      include: { booking: true }
    });
    
    if (transaction) {
      // Ensure booking is confirmed
      await prisma.booking.update({
        where: { id: transaction.bookingId },
        data: { status: 'CONFIRMED' }
      });
      
      // Create Google Meet link and send confirmation emails
      await createMeetingAndSendConfirmations(transaction.bookingId);
      console.log(`Payment completed for booking ${transaction.bookingId}`);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling PayPal payment completed:', error);
    return NextResponse.json({ received: true });
  }
}

async function handlePaymentFailed(event: any) {
  const orderId = event.resource.id;
  
  try {
    // Find the transaction by PayPal order ID
    const transaction = await prisma.transaction.findFirst({
      where: { paypalOrderId: orderId },
      include: { booking: true }
    });
    
    if (transaction) {
      // Update transaction status to failed
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'failed' }
      });
      
      // Cancel the booking
      await prisma.booking.update({
        where: { id: transaction.bookingId },
        data: { status: 'CANCELLED' }
      });
      
      console.log(`Payment failed for booking ${transaction.bookingId}`);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling PayPal payment failed:', error);
    return NextResponse.json({ received: true });
  }
}