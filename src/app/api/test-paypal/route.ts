import { NextRequest, NextResponse } from 'next/server';
import { createPayPalOrder } from '@/lib/payments/paypal';

export async function GET() {
  try {
    console.log('Testing PayPal configuration...');
    
    // Test creating a simple PayPal order
    const testOrder = await createPayPalOrder(100, 'test-booking-123');
    
    return NextResponse.json({
      success: testOrder.success,
      message: testOrder.success ? 'PayPal integration working' : 'PayPal integration failed',
      error: testOrder.error || null,
      orderId: testOrder.orderId || null
    });
  } catch (error) {
    console.error('PayPal test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}