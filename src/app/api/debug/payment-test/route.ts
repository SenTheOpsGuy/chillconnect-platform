import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createCashfreePaymentSession } from '@/lib/payments/cashfree';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get('booking');
    
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }

    console.log('Debug payment test for booking:', bookingId);
    
    // Get booking details without authentication for testing
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        seeker: { include: { profile: true } },
        provider: { include: { profile: true } },
        transactions: true
      }
    });

    if (!booking) {
      return NextResponse.json({ 
        error: 'Booking not found',
        bookingId 
      }, { status: 404 });
    }

    console.log('Found booking:', {
      id: booking.id,
      status: booking.status,
      amount: booking.amount,
      seekerId: booking.seekerId,
      providerId: booking.providerId
    });

    // Check if booking is in payment pending status
    if (booking.status !== 'PAYMENT_PENDING') {
      return NextResponse.json({ 
        error: 'Booking is not pending payment',
        currentStatus: booking.status,
        bookingId: booking.id
      }, { status: 400 });
    }

    // Check if payment deadline has passed
    const currentTime = new Date();
    const bookingTime = new Date(booking.startTime);
    const paymentDeadline = new Date(bookingTime.getTime() - 60 * 60 * 1000);

    if (currentTime >= paymentDeadline) {
      return NextResponse.json({
        error: 'Payment deadline exceeded',
        message: 'The payment deadline has passed. Please make a new booking.',
        expired: true,
        currentTime: currentTime.toISOString(),
        paymentDeadline: paymentDeadline.toISOString()
      }, { status: 410 });
    }

    // Test payment session creation
    const customerDetails = {
      customer_id: booking.seekerId,
      customer_name: `${booking.seeker.profile?.firstName} ${booking.seeker.profile?.lastName}` || 'Customer',
      customer_email: booking.seeker.email || '',
      customer_phone: booking.seeker.phone || '9999999999'
    };

    const bookingDetails = {
      service_type: 'consultation',
      booking_date: booking.startTime.toISOString(),
      description: `ChillConnect consultation with ${booking.provider.profile?.firstName} ${booking.provider.profile?.lastName}`
    };

    console.log('Creating payment session with:', { customerDetails, bookingDetails });

    const paymentSession = await createCashfreePaymentSession(
      booking.id,
      booking.amount,
      customerDetails,
      bookingDetails
    );

    return NextResponse.json({
      success: true,
      debug: 'payment_session_test_with_real_booking',
      booking: {
        id: booking.id,
        status: booking.status,
        amount: booking.amount,
        startTime: booking.startTime,
        endTime: booking.endTime,
        seeker: customerDetails,
        provider: {
          name: `${booking.provider.profile?.firstName} ${booking.provider.profile?.lastName}`
        }
      },
      paymentDeadline: paymentDeadline.toISOString(),
      timeRemaining: paymentDeadline.getTime() - currentTime.getTime(),
      paymentSession
    });

  } catch (error) {
    console.error('Debug payment test error:', error);
    return NextResponse.json({
      error: 'Payment test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 });
  }
}