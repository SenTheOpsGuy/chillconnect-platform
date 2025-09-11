import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token'); // PayPal order ID
    
    if (token) {
      // Find and update the transaction
      const transaction = await prisma.transaction.findFirst({
        where: { paypalOrderId: token }
      });
      
      if (transaction) {
        // Update transaction status to cancelled
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: 'cancelled' }
        });
        
        // Cancel the booking
        await prisma.booking.update({
          where: { id: transaction.bookingId },
          data: { status: 'CANCELLED' }
        });
        
        console.log(`Payment cancelled for booking ${transaction.bookingId}`);
      }
    }
    
    // Redirect back to booking page with cancellation message
    return NextResponse.redirect(new URL('/booking/payment?cancelled=true', req.url));
    
  } catch (error) {
    console.error('PayPal cancel handler error:', error);
    return NextResponse.redirect(new URL('/booking/payment?error=cancellation_failed', req.url));
  }
}

export async function POST(req: NextRequest) {
  // Handle POST requests the same way as GET
  return GET(req);
}