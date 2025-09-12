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
    console.log('Booking request body:', body);
    const { providerId, startTime, duration } = bookingSchema.parse(body);
    console.log('Parsed booking data:', { providerId, startTime, duration });
    
    // Get provider details - providerId could be either Provider.id or User.id
    let provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: { user: { include: { profile: true } } }
    });
    
    // If not found by Provider.id, try finding by User.id (userId)
    if (!provider) {
      provider = await prisma.provider.findUnique({
        where: { userId: providerId },
        include: { user: { include: { profile: true } } }
      });
    }
    
    if (!provider) {
      console.log('Provider not found with providerId:', providerId);
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }
    
    console.log('Found provider:', { id: provider.id, userId: provider.userId, hourlyRate: provider.hourlyRate });
    
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

    // Process payment with PayPal
    console.log('Creating PayPal payment intent:', { amount, seekerEmail: seekerUser?.email });
    const paymentIntent = await createPaymentIntent(
      amount,
      seekerUser?.email || '',
      { 
        bookingId: booking.id,
        providerId: provider.userId,
        seekerId: session.user.id
      }
    );
    console.log('PayPal payment intent result:', { success: !!paymentIntent.id, orderId: paymentIntent.id });

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
  } catch (error) {
    console.error('Booking creation error:', error);
    
    // Provide more specific error messages for debugging
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid booking data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Booking failed' },
      { status: 500 }
    );
  }
}