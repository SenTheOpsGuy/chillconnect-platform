import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { createCashfreePaymentSession } from '@/lib/payments/cashfree';
import { authOptions } from '@/lib/auth/config';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('Payment endpoint called for booking:', { params });
    
    const session = await getServerSession(authOptions);
    console.log('Session check result:', { hasSession: !!session, userId: session?.user?.id });
    
    if (!session?.user?.id) {
      console.log('Authentication failed - no session or user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    console.log('Processing payment for booking ID:', id);
    
    // Get booking with provider and seeker details
    console.log('Fetching booking from database...');
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        seeker: { include: { profile: true } },
        provider: { include: { profile: true } },
        transactions: true
      }
    });

    if (!booking) {
      console.log('Booking not found:', id);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    console.log('Booking found:', { 
      id: booking.id, 
      status: booking.status, 
      amount: booking.amount,
      seekerId: booking.seekerId 
    });

    // Check if user has access to this booking
    if (booking.seekerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if booking is in payment pending status
    if (booking.status !== 'PAYMENT_PENDING') {
      return NextResponse.json({ 
        error: 'Booking is not pending payment',
        status: booking.status 
      }, { status: 400 });
    }

    // Check if payment deadline has passed
    const currentTime = new Date();
    const bookingTime = new Date(booking.startTime);
    const paymentDeadline = new Date(bookingTime.getTime() - 60 * 60 * 1000); // 1 hour before

    if (currentTime >= paymentDeadline) {
      // Remove expired booking
      await prisma.transaction.deleteMany({
        where: { bookingId: booking.id }
      });
      
      await prisma.booking.delete({
        where: { id: booking.id }
      });
      
      return NextResponse.json({
        error: 'deadline_exceeded',
        message: 'The payment deadline has passed. Please make a new booking.',
        expired: true
      }, { status: 410 });
    }

    // Create or update payment session
    console.log('Creating payment session for booking:', {
      bookingId: booking.id,
      amount: booking.amount,
      seekerEmail: booking.seeker.email
    });

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

    const paymentSession = await createCashfreePaymentSession(
      booking.id,
      booking.amount,
      customerDetails,
      bookingDetails
    );

    if (!paymentSession.success) {
      console.error('Payment session creation failed:', paymentSession.error);
      return NextResponse.json({
        error: paymentSession.error || 'Failed to create payment session'
      }, { status: 500 });
    }

    // Update or create transaction record
    const existingTransaction = booking.transactions?.[0];
    
    if (existingTransaction) {
      await prisma.transaction.update({
        where: { id: existingTransaction.id },
        data: {
          paypalOrderId: paymentSession.orderId, // Using existing field for Cashfree order ID
          status: 'pending'
        }
      });
    } else {
      await prisma.transaction.create({
        data: {
          userId: session.user.id,
          bookingId: booking.id,
          amount: booking.amount,
          type: 'BOOKING_PAYMENT',
          status: 'pending',
          paypalOrderId: paymentSession.orderId
        }
      });
    }

    return NextResponse.json({
      success: true,
      paymentUrl: paymentSession.paymentUrl,
      orderId: paymentSession.orderId,
      amount: booking.amount
    });

  } catch (error) {
    console.error('Payment session creation error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      error: error
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to create payment session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}