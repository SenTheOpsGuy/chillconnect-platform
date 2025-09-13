import { NextRequest, NextResponse } from 'next/server';
import { sendBookingConfirmationEmails } from '@/lib/email/templates';

export async function GET(req: NextRequest) {
  try {
    // Create test booking data
    const testBooking = {
      id: 'test-booking-123',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
      amount: 1500,
      meetUrl: 'https://meet.google.com/abc-def-ghi',
      seeker: {
        name: 'John Doe',
        email: 'test.seeker@example.com'
      },
      provider: {
        name: 'Dr. Jane Smith',
        email: 'test.provider@example.com'
      }
    };

    console.log('Testing email templates with test data:', testBooking);

    // Test sending emails
    const emailResults = await sendBookingConfirmationEmails(testBooking);

    return NextResponse.json({
      success: true,
      message: 'Email template test completed',
      testData: testBooking,
      emailResults,
      environment: process.env.NODE_ENV
    });

  } catch (error) {
    console.error('Email template test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}