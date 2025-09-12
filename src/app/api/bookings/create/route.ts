import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { createPaymentIntent } from '@/lib/payments/cashfree';
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
    console.log('Booking calculation:', { 
      hourlyRate: provider.hourlyRate, 
      duration, 
      calculatedAmount: amount 
    });
    
    // Validate minimum amount
    if (amount < 1) {
      console.warn('Very low booking amount detected:', amount);
    }
    
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

    // Process payment with Cashfree
    console.log('Creating Cashfree payment session:', { amount, seekerEmail: seekerUser?.email });
    let paymentIntent;
    
    try {
      console.log('Calling createPaymentIntent with:', {
        amount,
        email: seekerUser?.email,
        metadata: { 
          bookingId: booking.id,
          providerId: provider.userId,
          seekerId: session.user.id,
          customerName: `${seekerUser?.profile?.firstName} ${seekerUser?.profile?.lastName}` || 'Customer',
          customerPhone: seekerUser?.phone || '9999999999'
        }
      });
      
      paymentIntent = await createPaymentIntent(
        amount,
        seekerUser?.email || '',
        { 
          bookingId: booking.id,
          providerId: provider.userId,
          seekerId: session.user.id,
          customerName: `${seekerUser?.profile?.firstName} ${seekerUser?.profile?.lastName}` || 'Customer',
          customerPhone: seekerUser?.phone || '9999999999'
        }
      );
      console.log('Cashfree payment session result:', { 
        success: !!paymentIntent?.id, 
        orderId: paymentIntent?.id,
        paymentUrl: paymentIntent?.payment_url,
        fullResult: paymentIntent
      });
    } catch (cashfreeError) {
      console.error('Cashfree payment session failed:', cashfreeError);
      
      // If Cashfree fails, offer alternative booking flow
      console.log('Cashfree failed, offering alternative booking flow');
      
      // Update booking status to payment_pending instead of deleting
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'PAYMENT_PENDING' }
      });
      
      // Return fallback response with payment deadline
      const bookingTime = new Date(startTime);
      const paymentDeadline = new Date(bookingTime.getTime() - 60 * 60 * 1000); // 1 hour before booking
      
      return NextResponse.json({
        bookingId: booking.id,
        fallback: true,
        status: 'payment_pending',
        message: 'Booking slot reserved! Complete payment to confirm your consultation.',
        paymentDeadline: paymentDeadline.toISOString(),
        warning: 'Payment must be completed 1 hour before your scheduled consultation or the booking will be automatically cancelled.',
        amount: amount
      });
    }

    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId: session.user.id,
        bookingId: booking.id,
        amount: amount,
        type: 'BOOKING_PAYMENT',
        status: 'pending',
        paypalOrderId: paymentIntent.id  // Reusing field name for Cashfree order ID
      }
    });
    
    // Return Cashfree payment data for client-side redirection
    return NextResponse.json({
      bookingId: booking.id,
      orderId: paymentIntent.id,
      paymentUrl: paymentIntent.payment_url,
      amount,
      status: 'payment_required',
      gateway: 'cashfree'
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