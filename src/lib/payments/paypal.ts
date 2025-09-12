import paypal from '@paypal/checkout-server-sdk';

// PayPal credentials from environment variables only
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

// Check if PayPal is properly configured
const isPayPalConfigured = () => {
  const configured = !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET);
  console.log('PayPal configuration check:', { 
    hasClientId: !!PAYPAL_CLIENT_ID, 
    hasClientSecret: !!PAYPAL_CLIENT_SECRET,
    configured 
  });
  return configured;
};

// PayPal environment setup - using live environment
const environment = () => {
  const mode = process.env.PAYPAL_MODE || 'live'; // Default to live mode
  console.log('PayPal environment setup:', { mode });
  
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured');
  }
  
  if (mode === 'live') {
    return new paypal.core.LiveEnvironment(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET);
  } else {
    return new paypal.core.SandboxEnvironment(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET);
  }
};

const client = () => {
  try {
    return new paypal.core.PayPalHttpClient(environment());
  } catch (error) {
    console.error('Failed to create PayPal client:', error);
    throw error;
  }
};

export async function createPayPalOrder(amount: number, bookingId: string) {
  console.log('Creating PayPal order:', { amount, bookingId, configured: isPayPalConfigured() });
  
  if (!isPayPalConfigured()) {
    console.error('PayPal credentials not configured');
    return { 
      success: false, 
      error: 'PayPal payment is currently unavailable. Please contact support.' 
    };
  }
  
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  
  request.requestBody({
    intent: 'CAPTURE',
    application_context: {
      return_url: `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://newchillconnect.vercel.app'}/api/payments/paypal/success`,
      cancel_url: `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://newchillconnect.vercel.app'}/api/payments/paypal/cancel`,
      brand_name: 'ChillConnect',
      locale: 'en-IN',
      landing_page: 'BILLING',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW'
    },
    purchase_units: [
      {
        reference_id: bookingId,
        amount: {
          currency_code: 'USD', // PayPal live account supports USD
          value: Math.max((amount / 83), 1.0).toFixed(2) // Convert INR to USD with minimum $1.00
        },
        description: `ChillConnect Consultation - ₹${amount.toLocaleString()} INR`
      }
    ]
  });

  try {
    const response = await client().execute(request);
    console.log('PayPal order created successfully:', response.result.id);
    
    return {
      success: true,
      orderId: response.result.id,
      approvalUrl: response.result.links.find((link: any) => link.rel === 'approve')?.href
    };
  } catch (error: any) {
    console.error('PayPal order creation error:', {
      message: error.message,
      statusCode: error.statusCode,
      headers: error.headers,
      details: error.details || error
    });
    
    let errorMessage = 'PayPal order creation failed';
    if (error.statusCode) {
      errorMessage += ` (Status: ${error.statusCode})`;
    }
    if (error.message) {
      errorMessage += `: ${error.message}`;
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

export async function capturePayPalOrder(orderId: string) {
  console.log('Capturing PayPal order:', orderId);
  
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  try {
    const response = await client().execute(request);
    console.log('PayPal order captured successfully:', response.result.id);
    
    return {
      success: true,
      captureId: response.result.purchase_units[0].payments.captures[0].id,
      status: response.result.status,
      amount: response.result.purchase_units[0].payments.captures[0].amount.value
    };
  } catch (error) {
    console.error('PayPal capture error:', error);
    return { 
      success: false, 
      error: `PayPal capture failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

export async function refundPayPalPayment(captureId: string, amount?: number) {
  const request = new paypal.payments.CapturesRefundRequest(captureId);
  
  if (amount) {
    request.requestBody({
      amount: {
        currency_code: 'USD',
        value: amount.toFixed(2)
      }
    });
  }

  try {
    const response = await client().execute(request);
    return {
      success: true,
      refundId: response.result.id,
      status: response.result.status,
      amount: response.result.amount.value
    };
  } catch (error) {
    console.error('PayPal refund error:', error);
    return { success: false, error };
  }
}

export async function createPayoutToProvider(
  providerEmail: string,
  amount: number,
  bookingId: string
) {
  const request = new paypal.payouts.PayoutsPostRequest();
  request.requestBody({
    sender_batch_header: {
      sender_batch_id: `batch-${bookingId}-${Date.now()}`,
      email_subject: 'ChillConnect Payment',
      email_message: 'You have received a payment for your consultation services.'
    },
    items: [
      {
        recipient_type: 'EMAIL',
        amount: {
          value: amount.toFixed(2),
          currency: 'USD'
        },
        receiver: providerEmail,
        note: `Payment for consultation booking ${bookingId}`,
        sender_item_id: `item-${bookingId}`
      }
    ]
  });

  try {
    const response = await client().execute(request);
    return {
      success: true,
      batchId: response.result.batch_header.payout_batch_id,
      status: response.result.batch_header.batch_status
    };
  } catch (error) {
    console.error('PayPal payout error:', error);
    return { success: false, error };
  }
}

// Stripe-compatible functions for easier migration
export async function createPaymentIntent(
  amount: number,
  customerEmail: string,
  metadata: any
) {
  const bookingId = metadata.bookingId || `booking_${Date.now()}`;
  const order = await createPayPalOrder(amount, bookingId);
  
  if (order.success) {
    return {
      id: order.orderId,
      client_secret: order.orderId, // Use orderId as client secret equivalent
      amount: Math.round(amount * 100), // Convert to cents for compatibility
      currency: 'usd',
      status: 'requires_payment_method',
      metadata,
      approval_url: order.approvalUrl // PayPal-specific field
    };
  } else {
    console.error('PayPal order creation failed:', order.error);
    throw new Error(`PayPal order creation failed: ${order.error || 'Unknown error'}`);
  }
}

export async function createConnectedAccount(email: string) {
  // PayPal uses email-based payouts instead of connected accounts
  console.log('⚠️ PayPal: Using email-based payouts instead of connected accounts');
  return {
    id: `paypal_email_${Date.now()}`,
    email,
    type: 'paypal_email',
    status: 'active'
  };
}

export async function processRefund(paymentIntentId: string, amount?: number) {
  // For PayPal, we need the capture ID, not the order ID
  // This is a simplified version - in production, you'd need to track capture IDs
  return await refundPayPalPayment(paymentIntentId, amount);
}

export async function transferToProvider(
  providerId: string,
  amount: number,
  bookingId: string
) {
  // Use PayPal payouts - providerId should be the provider's email
  return await createPayoutToProvider(providerId, amount, bookingId);
}