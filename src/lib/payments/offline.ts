// Offline/Manual payment processing for when PayPal is not configured
// This provides a fallback payment method

export interface OfflinePaymentResult {
  success: boolean;
  paymentId: string;
  status: 'pending' | 'confirmed' | 'failed';
  instructions?: string;
  error?: string;
}

export async function createOfflinePayment(
  amount: number,
  bookingId: string,
  userEmail: string
): Promise<OfflinePaymentResult> {
  try {
    // Generate a unique payment ID
    const paymentId = `offline_${bookingId}_${Date.now()}`;
    
    // In a real implementation, this would:
    // 1. Generate payment instructions
    // 2. Send email to user with payment details
    // 3. Create a payment record in the database
    // 4. Set up payment verification workflow
    
    console.log('Offline payment created:', {
      paymentId,
      bookingId,
      amount,
      userEmail
    });
    
    return {
      success: true,
      paymentId,
      status: 'pending',
      instructions: `Please complete payment of ₹${amount} for booking ${bookingId}. Contact support at admin@chillconnect.in with payment details.`
    };
  } catch (error) {
    console.error('Offline payment creation error:', error);
    return {
      success: false,
      paymentId: '',
      status: 'failed',
      error: 'Failed to create offline payment'
    };
  }
}

export async function createUPIPayment(
  amount: number,
  bookingId: string,
  userEmail: string
): Promise<OfflinePaymentResult> {
  try {
    const paymentId = `upi_${bookingId}_${Date.now()}`;
    
    // UPI payment details - in production, this would generate actual UPI links
    const upiId = 'chillconnect@paytm'; // Example UPI ID
    const upiLink = `upi://pay?pa=${upiId}&pn=ChillConnect&am=${amount}&cu=INR&tn=Booking-${bookingId}`;
    
    return {
      success: true,
      paymentId,
      status: 'pending',
      instructions: `Pay ₹${amount} using UPI: ${upiId} or scan QR code. Reference: ${bookingId}. WhatsApp payment screenshot to +91-XXXXXXXXXX`
    };
  } catch (error) {
    console.error('UPI payment creation error:', error);
    return {
      success: false,
      paymentId: '',
      status: 'failed',
      error: 'Failed to create UPI payment'
    };
  }
}

export async function createBankTransferPayment(
  amount: number,
  bookingId: string,
  userEmail: string
): Promise<OfflinePaymentResult> {
  try {
    const paymentId = `bank_${bookingId}_${Date.now()}`;
    
    return {
      success: true,
      paymentId,
      status: 'pending',
      instructions: `Bank Transfer Details:
Account Name: ChillConnect Services
Account Number: XXXX-XXXX-XXXX
IFSC Code: XXXXXXXX
Amount: ₹${amount}
Reference: ${bookingId}
Please email transfer receipt to payments@chillconnect.in`
    };
  } catch (error) {
    console.error('Bank transfer payment creation error:', error);
    return {
      success: false,
      paymentId: '',
      status: 'failed',
      error: 'Failed to create bank transfer payment'
    };
  }
}