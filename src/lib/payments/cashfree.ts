import axios from 'axios';
import crypto from 'crypto';

// Cashfree credentials from environment variables (trim whitespace)
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID?.trim();
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY?.trim();
const CASHFREE_BASE_URL = (process.env.CASHFREE_BASE_URL || 'https://api.cashfree.com/pg').trim();

// Check if Cashfree is properly configured
const isCashfreeConfigured = () => {
  const configured = !!(CASHFREE_APP_ID && CASHFREE_SECRET_KEY);
  console.log('Cashfree configuration check:', { 
    hasAppId: !!CASHFREE_APP_ID, 
    hasSecretKey: !!CASHFREE_SECRET_KEY,
    configured,
    baseUrl: CASHFREE_BASE_URL,
    appId: CASHFREE_APP_ID ? `${CASHFREE_APP_ID.substring(0, 4)}...` : 'undefined',
    secretKey: CASHFREE_SECRET_KEY ? `${CASHFREE_SECRET_KEY.substring(0, 4)}...` : 'undefined'
  });
  return configured;
};

// Generate authentication headers for Cashfree API
const getAuthHeaders = () => {
  if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
    throw new Error('Cashfree credentials not configured');
  }

  return {
    'Content-Type': 'application/json',
    'x-api-version': '2023-08-01',
    'x-client-id': CASHFREE_APP_ID,
    'x-client-secret': CASHFREE_SECRET_KEY
  };
};

// Generate unique order ID
const generateOrderId = (bookingId: string) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `ORDER_${bookingId}_${timestamp}_${random}`.toUpperCase();
};

// Create payment session with Cashfree
export async function createCashfreePaymentSession(
  bookingId: string,
  amount: number,
  customerDetails: {
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  },
  bookingDetails: {
    service_type?: string;
    booking_date?: string;
    description?: string;
  }
) {
  console.log('Creating Cashfree payment session:', { 
    bookingId, 
    amount, 
    customer: customerDetails,
    configured: isCashfreeConfigured() 
  });
  
  if (!isCashfreeConfigured()) {
    const missingConfig = [];
    if (!CASHFREE_APP_ID) missingConfig.push('CASHFREE_APP_ID');
    if (!CASHFREE_SECRET_KEY) missingConfig.push('CASHFREE_SECRET_KEY');
    
    console.error('Cashfree credentials not configured. Missing:', missingConfig.join(', '));
    return { 
      success: false, 
      error: `Payment gateway configuration incomplete. Missing: ${missingConfig.join(', ')}. Please contact support.`
    };
  }

  const orderId = generateOrderId(bookingId);
  const returnUrl = `${process.env.NEXTAUTH_URL?.trim()}/api/payments/cashfree/callback`;

  const paymentData = {
    order_id: orderId,
    order_amount: amount,
    order_currency: 'INR',
    customer_details: {
      customer_id: customerDetails.customer_id,
      customer_name: customerDetails.customer_name,
      customer_email: customerDetails.customer_email,
      customer_phone: customerDetails.customer_phone
    },
    order_meta: {
      return_url: returnUrl,
      notify_url: `${process.env.NEXTAUTH_URL?.trim()}/api/payments/cashfree/webhook`,
      payment_methods: 'cc,dc,upi,nb,paylater,emi'
    },
    order_note: bookingDetails.description || `ChillConnect consultation booking - ${bookingId}`
  };

  try {
    const response = await axios.post(
      `${CASHFREE_BASE_URL}/orders`,
      paymentData,
      { headers: getAuthHeaders() }
    );

    console.log('Cashfree payment session created successfully:', response.data.order_id);
    console.log('Full Cashfree response:', response.data);
    
    // For Cashfree, the payment URL is constructed using the payment session ID
    const paymentUrl = `https://payments.cashfree.com/pay/order?session-id=${response.data.payment_session_id}`;
    console.log('Constructed payment URL:', paymentUrl);
    
    return {
      success: true,
      orderId: response.data.order_id,
      paymentSessionId: response.data.payment_session_id,
      paymentUrl: paymentUrl,
      cfOrderId: response.data.cf_order_id
    };
  } catch (error: any) {
    console.error('Cashfree payment session creation error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method
      }
    });
    
    let errorMessage = 'Payment session creation failed';
    if (error.response?.status) {
      errorMessage += ` (Status: ${error.response.status})`;
    }
    if (error.response?.data?.message) {
      errorMessage += `: ${error.response.data.message}`;
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

// Verify payment status with Cashfree
export async function verifyCashfreePayment(orderId: string) {
  console.log('Verifying Cashfree payment:', orderId);
  
  if (!isCashfreeConfigured()) {
    throw new Error('Cashfree credentials not configured');
  }

  try {
    const response = await axios.get(
      `${CASHFREE_BASE_URL}/orders/${orderId}`,
      { headers: getAuthHeaders() }
    );

    console.log('Cashfree payment verification result:', {
      orderId: response.data.order_id,
      status: response.data.order_status,
      amount: response.data.order_amount
    });

    return {
      success: true,
      orderId: response.data.order_id,
      cfOrderId: response.data.cf_order_id,
      status: response.data.order_status,
      amount: response.data.order_amount,
      currency: response.data.order_currency,
      paymentDetails: response.data.payments || [],
      customerDetails: response.data.customer_details,
      orderNote: response.data.order_note
    };
  } catch (error: any) {
    console.error('Cashfree payment verification error:', error);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message || 'Payment verification failed' 
    };
  }
}

// Process refund through Cashfree
export async function processCashfreeRefund(
  orderId: string, 
  refundAmount: number, 
  refundNote?: string
) {
  console.log('Processing Cashfree refund:', { orderId, refundAmount });
  
  if (!isCashfreeConfigured()) {
    throw new Error('Cashfree credentials not configured');
  }

  const refundId = `REFUND_${orderId}_${Date.now()}`;
  
  const refundData = {
    refund_amount: refundAmount,
    refund_id: refundId,
    refund_note: refundNote || 'Booking cancellation refund'
  };

  try {
    const response = await axios.post(
      `${CASHFREE_BASE_URL}/orders/${orderId}/refunds`,
      refundData,
      { headers: getAuthHeaders() }
    );

    return {
      success: true,
      refundId: response.data.refund_id,
      cfRefundId: response.data.cf_refund_id,
      status: response.data.refund_status,
      amount: response.data.refund_amount
    };
  } catch (error: any) {
    console.error('Cashfree refund error:', error);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message || 'Refund processing failed' 
    };
  }
}

// Verify webhook signature
export function verifyCashfreeWebhook(
  rawBody: string,
  signature: string,
  timestamp: string
): boolean {
  try {
    if (!CASHFREE_SECRET_KEY) {
      console.error('Cashfree secret key not configured for webhook verification');
      return false;
    }

    // Cashfree webhook signature verification
    const expectedSignature = crypto
      .createHmac('sha256', CASHFREE_SECRET_KEY)
      .update(timestamp + rawBody)
      .digest('base64');

    const isValid = signature === expectedSignature;
    console.log('Webhook signature verification:', { isValid, signature, expectedSignature });
    
    return isValid;
  } catch (error) {
    console.error('Webhook verification error:', error);
    return false;
  }
}

// Stripe-compatible functions for easier migration from existing PayPal code
export async function createPaymentIntent(
  amount: number,
  customerEmail: string,
  metadata: any
) {
  const bookingId = metadata.bookingId || `booking_${Date.now()}`;
  const customerDetails = {
    customer_id: metadata.seekerId || `customer_${Date.now()}`,
    customer_name: metadata.customerName || 'Customer',
    customer_email: customerEmail,
    customer_phone: metadata.customerPhone || '9999999999'
  };

  const session = await createCashfreePaymentSession(
    bookingId,
    amount,
    customerDetails,
    {
      description: `ChillConnect Consultation - ₹${amount.toLocaleString()} INR`
    }
  );
  
  if (session.success) {
    return {
      id: session.orderId,
      client_secret: session.paymentSessionId, // Use session ID as client secret equivalent
      amount: Math.round(amount * 100), // Convert to paisa for compatibility
      currency: 'inr',
      status: 'requires_payment_method',
      metadata,
      payment_url: session.paymentUrl // Cashfree-specific field
    };
  } else {
    console.error('Cashfree payment session creation failed:', session.error);
    throw new Error(`Payment session creation failed: ${session.error || 'Unknown error'}`);
  }
}

// Dummy function for compatibility - Cashfree handles payouts differently
export async function createConnectedAccount(email: string) {
  console.log('⚠️ Cashfree: Connected accounts handled through Cashfree merchant dashboard');
  return {
    id: `cashfree_merchant_${Date.now()}`,
    email,
    type: 'cashfree_merchant',
    status: 'active'
  };
}

// Process refund (compatible with existing interface)
export async function processRefund(orderId: string, amount?: number) {
  if (!amount) {
    // Get order details to determine refund amount
    const verification = await verifyCashfreePayment(orderId);
    if (verification.success) {
      amount = verification.amount;
    } else {
      throw new Error('Could not determine refund amount');
    }
  }
  
  if (!amount) {
    throw new Error('Could not determine refund amount');
  }
  return await processCashfreeRefund(orderId, amount);
}

// Transfer to provider (placeholder - actual implementation depends on business model)
export async function transferToProvider(
  providerId: string,
  amount: number,
  bookingId: string
) {
  console.log('⚠️ Provider payouts should be handled through Cashfree merchant settlement or separate payout API');
  return {
    success: true,
    transferId: `transfer_${bookingId}_${Date.now()}`,
    status: 'processed',
    note: 'Provider settlement handled through Cashfree merchant dashboard'
  };
}