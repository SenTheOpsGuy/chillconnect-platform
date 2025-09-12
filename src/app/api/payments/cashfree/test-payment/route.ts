import { NextRequest, NextResponse } from 'next/server';
import { createCashfreePaymentSession } from '@/lib/payments/cashfree';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount = 100, bookingId = 'test-booking-123' } = body;

    console.log('Testing Cashfree payment session creation...');

    // Test customer details
    const customerDetails = {
      customer_id: 'test-customer-123',
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      customer_phone: '9999999999'
    };

    // Test booking details
    const bookingDetails = {
      service_type: 'consultation',
      booking_date: new Date().toISOString(),
      description: 'Test consultation booking'
    };

    console.log('Creating payment session with:', {
      bookingId,
      amount,
      customerDetails,
      bookingDetails
    });

    const result = await createCashfreePaymentSession(
      bookingId,
      amount,
      customerDetails,
      bookingDetails
    );

    console.log('Payment session result:', result);

    return NextResponse.json({
      success: true,
      test: 'payment_session_creation',
      input: {
        bookingId,
        amount,
        customerDetails,
        bookingDetails
      },
      result
    });

  } catch (error) {
    console.error('Test payment session error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        test: 'payment_session_creation'
      },
      { status: 500 }
    );
  }
}