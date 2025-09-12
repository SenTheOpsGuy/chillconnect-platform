import { NextRequest, NextResponse } from 'next/server';
import { createCashfreePaymentSession } from '@/lib/payments/cashfree';

export async function GET(req: NextRequest) {
  try {
    console.log('Debug endpoint called - testing Cashfree without authentication');

    // Test customer details
    const customerDetails = {
      customer_id: 'debug-test-123',
      customer_name: 'Debug Test User',
      customer_email: 'debug@test.com',
      customer_phone: '9999999999'
    };

    // Test booking details
    const bookingDetails = {
      service_type: 'consultation',
      booking_date: new Date().toISOString(),
      description: 'Debug test consultation booking'
    };

    console.log('Testing Cashfree payment session creation...');

    const result = await createCashfreePaymentSession(
      'debug-booking-123',
      25, // ₹25 test amount
      customerDetails,
      bookingDetails
    );

    console.log('Cashfree test result:', result);

    return NextResponse.json({
      success: true,
      debug: 'cashfree_payment_session_test',
      timestamp: new Date().toISOString(),
      environment: {
        hasAppId: !!process.env.CASHFREE_APP_ID,
        hasSecretKey: !!process.env.CASHFREE_SECRET_KEY,
        baseUrl: process.env.CASHFREE_BASE_URL,
        nextAuthUrl: process.env.NEXTAUTH_URL
      },
      result
    });

  } catch (error) {
    console.error('Debug Cashfree test error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      error: error
    });

    return NextResponse.json(
      {
        success: false,
        debug: 'cashfree_payment_session_test',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : 'No details available'
      },
      { status: 500 }
    );
  }
}