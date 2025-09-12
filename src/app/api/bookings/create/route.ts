import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { createPaymentIntent } from '@/lib/payments/paypal';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const bookingSchema = z.object({
  providerId: z.string(),
  startTime: z.string().datetime(),
  duration: z.number().min(30).max(120)
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { providerId, startTime, duration } = bookingSchema.parse(body);
    
    // Get provider details
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: { user: { include: { profile: true } } }
    });
    
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }
    
    // Calculate amount
    const amount = (provider.hourlyRate * duration) / 60;
    
    // Create booking with PENDING status initially
    const booking = await prisma.booking.create({
      data: {
        seekerId: session.user.id,
        providerId: provider.userId,
        startTime: new Date(startTime),
        endTime: new Date(new Date(startTime).getTime() + duration * 60000),
        amount,
        status: 'PENDING'
      }
    });

    // Get seeker user details
    const seekerUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { profile: true }
    });

    try {
      // Process payment
      const paymentIntent = await createPaymentIntent(
        amount,
        seekerUser?.email || '',
        { 
          bookingId: booking.id,
          providerId: provider.userId,
          seekerId: session.user.id
        }
      );

      // Create transaction record
      await prisma.transaction.create({
        data: {
          userId: session.user.id,
          bookingId: booking.id,
          amount: amount,
          type: 'BOOKING_PAYMENT',
          status: 'pending',
          paypalOrderId: paymentIntent.id
        }
      });
      
      // Return PayPal order data for client-side confirmation
      return NextResponse.json({
        bookingId: booking.id,
        paypalOrderId: paymentIntent.id,
        approvalUrl: paymentIntent.approval_url,
        amount,
        status: 'payment_required'
      });
    } catch (paymentError) {
      console.error('Payment processing error:', paymentError);
      
      // Fallback: Mark booking as PENDING payment and let user handle payment later
      // Create a simple transaction record without PayPal integration
      await prisma.transaction.create({
        data: {
          userId: session.user.id,
          bookingId: booking.id,
          amount: amount,
          type: 'BOOKING_PAYMENT',
          status: 'pending'
        }
      });
      
      return NextResponse.json({
        bookingId: booking.id,
        amount,
        status: 'payment_pending',
        message: 'Booking created successfully. Payment integration is currently unavailable. Please contact support to complete payment.',
        fallback: true
      });
    }
  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json(
      { error: 'Booking failed' },
      { status: 500 }
    );
  }
}