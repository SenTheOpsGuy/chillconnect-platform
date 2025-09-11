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

    // In a real implementation, you would:
    // 1. Use Google Calendar API to create actual meeting
    // 2. Send HTML emails using a service like SendGrid, Mailgun, or AWS SES
    // 3. Create calendar events for both parties
    // 4. Send SMS notifications if phone numbers are available

  } catch (error) {
    console.error('Error creating meeting and sending confirmations:', error);
    // Don't throw here - we don't want to fail the payment process
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token'); // PayPal order ID
    
    if (!token) {
      return NextResponse.redirect(new URL('/booking/payment?error=missing_token', req.url));
    }
    
    // Capture the payment
    const captureResult = await capturePayPalOrder(token);
    
    if (!captureResult.success) {
      console.error('PayPal capture failed:', captureResult.error);
      return NextResponse.redirect(new URL('/booking/payment?error=capture_failed', req.url));
    }
    
    // Find and update the transaction
    const transaction = await prisma.transaction.findFirst({
      where: { paypalOrderId: token },
      include: { booking: true }
    });
    
    if (!transaction) {
      console.error('Transaction not found for PayPal order:', token);
      return NextResponse.redirect(new URL('/booking/payment?error=transaction_not_found', req.url));
    }
    
    // Update transaction with capture details
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'completed',
        paypalCaptureId: captureResult.captureId
      }
    });
    
    // Update booking status
    await prisma.booking.update({
      where: { id: transaction.bookingId },
      data: { status: 'CONFIRMED' }
    });
    
    // Create Google Meet link and send confirmation emails
    await createMeetingAndSendConfirmations(transaction.bookingId);
    
    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/booking/success?booking_id=${transaction.bookingId}`, req.url)
    );
    
  } catch (error) {
    console.error('PayPal success handler error:', error);
    return NextResponse.redirect(new URL('/booking/payment?error=processing_failed', req.url));
  }
}

export async function POST(req: NextRequest) {
  // Handle POST requests the same way as GET for PayPal returns
  return GET(req);
}