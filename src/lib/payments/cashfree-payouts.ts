import axios from 'axios';

// Cashfree Payout API integration
const CASHFREE_PAYOUT_APP_ID = process.env.CASHFREE_PAYOUT_APP_ID?.trim();
const CASHFREE_PAYOUT_SECRET_KEY = process.env.CASHFREE_PAYOUT_SECRET_KEY?.trim();
const CASHFREE_PAYOUT_BASE_URL = (process.env.CASHFREE_PAYOUT_BASE_URL || 'https://payout-api.cashfree.com').trim();

// Check if Cashfree Payout is properly configured
const isCashfreePayoutConfigured = () => {
  const configured = !!(CASHFREE_PAYOUT_APP_ID && CASHFREE_PAYOUT_SECRET_KEY);
  console.log('Cashfree Payout configuration check:', { 
    hasAppId: !!CASHFREE_PAYOUT_APP_ID, 
    hasSecretKey: !!CASHFREE_PAYOUT_SECRET_KEY,
    configured,
    baseUrl: CASHFREE_PAYOUT_BASE_URL
  });
  return configured;
};

// Generate authentication headers for Cashfree Payout API
const getPayoutAuthHeaders = () => {
  if (!CASHFREE_PAYOUT_APP_ID || !CASHFREE_PAYOUT_SECRET_KEY) {
    throw new Error('Cashfree Payout credentials not configured');
  }

  return {
    'Content-Type': 'application/json',
    'X-Client-Id': CASHFREE_PAYOUT_APP_ID,
    'X-Client-Secret': CASHFREE_PAYOUT_SECRET_KEY
  };
};

// Send penny test to validate bank account
export async function sendPennyTest(
  transferId: string,
  bankAccount: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  }
) {
  console.log('Sending penny test:', { transferId, bankAccount: { ...bankAccount, accountNumber: '***' } });
  
  if (!isCashfreePayoutConfigured()) {
    return { 
      success: false, 
      error: 'Cashfree Payout not configured. Please contact support.'
    };
  }

  // Generate random penny test amount between 1.00 and 9.99
  const pennyAmount = Math.floor(Math.random() * 899) + 100; // 100 to 999 paise = 1.00 to 9.99 INR
  const pennyAmountRupees = pennyAmount / 100;

  const transferData = {
    transferId: transferId,
    transferMode: 'banktransfer',
    amount: pennyAmountRupees,
    remarks: `Bank account verification for ChillConnect - Amount: ₹${pennyAmountRupees}`,
    beneDetails: {
      beneId: `bene_${transferId}`,
      name: bankAccount.accountHolderName,
      email: 'verification@chillconnect.in', // Required by Cashfree
      phone: '9999999999', // Required by Cashfree
      bankAccount: bankAccount.accountNumber,
      ifsc: bankAccount.ifscCode,
      address1: 'Address', // Required by Cashfree
      city: 'City', // Required by Cashfree
      state: 'State', // Required by Cashfree
      pincode: '123456' // Required by Cashfree
    }
  };

  try {
    const response = await axios.post(
      `${CASHFREE_PAYOUT_BASE_URL}/payout/v1/requestTransfer`,
      transferData,
      { headers: getPayoutAuthHeaders() }
    );

    console.log('Penny test sent successfully:', response.data);
    
    return {
      success: true,
      transferId: response.data.data.transferId,
      pennyAmount: pennyAmountRupees,
      referenceId: response.data.data.referenceId,
      status: response.data.data.status
    };
  } catch (error: any) {
    console.error('Penny test failed:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message || 'Penny test failed'
    };
  }
}

// Check status of a transfer (penny test or payout)
export async function checkTransferStatus(transferId: string) {
  if (!isCashfreePayoutConfigured()) {
    throw new Error('Cashfree Payout not configured');
  }

  try {
    const response = await axios.get(
      `${CASHFREE_PAYOUT_BASE_URL}/payout/v1/getTransferStatus?transferId=${transferId}`,
      { headers: getPayoutAuthHeaders() }
    );

    return {
      success: true,
      transferId: response.data.data.transferId,
      status: response.data.data.status,
      amount: response.data.data.amount,
      referenceId: response.data.data.referenceId,
      processedAt: response.data.data.processedAt,
      acknowledged: response.data.data.acknowledged
    };
  } catch (error: any) {
    console.error('Transfer status check failed:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message || 'Status check failed'
    };
  }
}

// Process payout to provider
export async function processProviderPayout(
  transferId: string,
  amount: number,
  bankAccount: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  },
  providerId: string
) {
  console.log('Processing provider payout:', { transferId, amount, providerId });
  
  if (!isCashfreePayoutConfigured()) {
    return { 
      success: false, 
      error: 'Cashfree Payout not configured. Please contact support.'
    };
  }

  const transferData = {
    transferId: transferId,
    transferMode: 'banktransfer',
    amount: amount,
    remarks: `ChillConnect provider payout - Provider: ${providerId}`,
    beneDetails: {
      beneId: `provider_${providerId}_${Date.now()}`,
      name: bankAccount.accountHolderName,
      email: 'payouts@chillconnect.in',
      phone: '9999999999',
      bankAccount: bankAccount.accountNumber,
      ifsc: bankAccount.ifscCode,
      address1: 'ChillConnect Provider',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001'
    }
  };

  try {
    const response = await axios.post(
      `${CASHFREE_PAYOUT_BASE_URL}/payout/v1/requestTransfer`,
      transferData,
      { headers: getPayoutAuthHeaders() }
    );

    console.log('Payout processed successfully:', response.data);
    
    return {
      success: true,
      transferId: response.data.data.transferId,
      amount: amount,
      referenceId: response.data.data.referenceId,
      status: response.data.data.status,
      fullResponse: response.data
    };
  } catch (error: any) {
    console.error('Payout processing failed:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message || 'Payout processing failed',
      fullError: error.response?.data || error.message
    };
  }
}

// Get account balance
export async function getPayoutBalance() {
  if (!isCashfreePayoutConfigured()) {
    throw new Error('Cashfree Payout not configured');
  }

  try {
    const response = await axios.get(
      `${CASHFREE_PAYOUT_BASE_URL}/payout/v1/getBalance`,
      { headers: getPayoutAuthHeaders() }
    );

    return {
      success: true,
      balance: response.data.data.balance,
      currency: 'INR'
    };
  } catch (error: any) {
    console.error('Balance check failed:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message || 'Balance check failed'
    };
  }
}