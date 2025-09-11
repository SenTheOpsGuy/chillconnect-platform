import Stripe from 'stripe';

// Check if we're in development mode with mock keys
const isDevelopment = process.env.NODE_ENV === 'development';
const isMockStripeKey = process.env.STRIPE_SECRET_KEY?.includes('Mock');

let stripe: Stripe | null = null;

// Only initialize Stripe if we have a real API key
if (!isMockStripeKey && process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-08-27.basil'
  });
} else if (isDevelopment) {
  console.log('⚠️ Stripe: Using mock mode for development. Real payments disabled.');
}

export async function createConnectedAccount(email: string) {
  if (!stripe) {
    // Return mock data for development
    return {
      id: `acct_mock_${Date.now()}`,
      email,
      type: 'express',
      country: 'IN',
      capabilities: {
        card_payments: { status: 'active' },
        transfers: { status: 'active' }
      }
    };
  }

  const account = await stripe.accounts.create({
    type: 'express',
    country: 'IN',
    email: email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    }
  });
  
  return account;
}

export async function createPaymentIntent(
  amount: number,
  customerEmail: string,
  metadata: any
) {
  if (!stripe) {
    // Return mock payment intent for development
    return {
      id: `pi_mock_${Date.now()}`,
      client_secret: `pi_mock_${Date.now()}_secret_mock`,
      amount: Math.round(amount * 100),
      currency: 'inr',
      status: 'requires_payment_method',
      metadata
    };
  }

  // Create or retrieve customer
  const customers = await stripe.customers.list({
    email: customerEmail,
    limit: 1
  });
  
  let customer;
  if (customers.data.length > 0) {
    customer = customers.data[0];
  } else {
    customer = await stripe.customers.create({
      email: customerEmail,
      metadata: { platform: 'chillconnect' }
    });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to paise and round
    currency: 'inr',
    customer: customer.id,
    metadata,
    capture_method: 'automatic',
    payment_method_types: ['card']
  });
  
  return paymentIntent;
}

export async function processRefund(paymentIntentId: string, amount?: number) {
  if (!stripe) {
    // Return mock refund for development
    return {
      id: `re_mock_${Date.now()}`,
      payment_intent: paymentIntentId,
      amount: amount ? amount * 100 : 0,
      currency: 'inr',
      status: 'succeeded'
    };
  }

  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount ? amount * 100 : undefined
  });
  
  return refund;
}

export async function transferToProvider(
  providerId: string,
  amount: number,
  bookingId: string
) {
  if (!stripe) {
    // Return mock transfer for development
    return {
      id: `tr_mock_${Date.now()}`,
      amount: amount * 100,
      currency: 'inr',
      destination: providerId,
      metadata: { bookingId },
      status: 'paid'
    };
  }

  const transfer = await stripe.transfers.create({
    amount: amount * 100,
    currency: 'inr',
    destination: providerId,
    metadata: { bookingId }
  });
  
  return transfer;
}