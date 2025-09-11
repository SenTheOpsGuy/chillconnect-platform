import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { createMeetingRoom } from '@/lib/meeting/google-meet';
import { sendEmail } from '@/lib/email/brevo';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil'
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: unknown) {
    console.error(`Webhook signature verification failed:`, err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  const providerId = paymentIntent.metadata.providerId;
  const seekerId = paymentIntent.metadata.seekerId;

  if (!bookingId || !providerId || !seekerId) {
    console.error('Missing metadata in payment intent:', paymentIntent.id);
    return;
  }

  // Update transaction status
  await prisma.transaction.update({
    where: { stripeId: paymentIntent.id },
    data: { status: 'completed' }
  });

  // Get booking details
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      seeker: { include: { profile: true } },
      provider: { include: { profile: true } }
    }
  });

  if (!booking) {
    console.error('Booking not found:', bookingId);
    return;
  }

  // Create Google Meet room
  const meeting = await createMeetingRoom(
    'Consultation Session',
    booking.startTime,
    booking.endTime,
    [booking.seeker.email, booking.provider.email]
  );

  // Update booking status and add meet URL
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CONFIRMED',
      meetUrl: meeting.meetUrl
    }
  });

  // Create session record
  await prisma.session.create({
    data: {
      bookingId: bookingId,
      chatExpiresAt: new Date(booking.endTime.getTime() + 24 * 60 * 60 * 1000) // 24 hours after session
    }
  });

  // Send confirmation emails
  const startTime = booking.startTime.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'short'
  });

  await Promise.all([
    sendEmail(
      booking.seeker.email,
      'Booking Confirmed - ChillConnect',
      `Your consultation with ${booking.provider.profile?.firstName} is confirmed for ${startTime}. Meet URL: ${meeting.meetUrl}`
    ),
    sendEmail(
      booking.provider.email,
      'New Booking Confirmed - ChillConnect',
      `You have a new consultation with ${booking.seeker.profile?.firstName} scheduled for ${startTime}. Meet URL: ${meeting.meetUrl}`
    )
  ]);

  // Update provider's total sessions count
  await prisma.provider.update({
    where: { userId: providerId },
    data: {
      totalSessions: { increment: 1 }
    }
  });

  console.log('Payment succeeded and booking confirmed:', bookingId);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;

  if (!bookingId) {
    console.error('Missing bookingId in failed payment:', paymentIntent.id);
    return;
  }

  // Update transaction status
  await prisma.transaction.update({
    where: { stripeId: paymentIntent.id },
    data: { status: 'failed' }
  });

  // Cancel the booking
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' }
  });

  console.log('Payment failed and booking cancelled:', bookingId);
}