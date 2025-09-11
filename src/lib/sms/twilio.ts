import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendVerificationSMS(phone: string) {
  // In development mode with mock credentials, just log
  if (process.env.NODE_ENV === 'development' && process.env.TWILIO_ACCOUNT_SID === 'development-mock-sid') {
    console.log('📱 [MOCK SMS VERIFICATION]');
    console.log('To:', phone);
    console.log('Message: Your verification code has been sent');
    console.log('-------------------');
    return { success: true, status: 'pending' };
  }

  try {
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications
      .create({ to: phone, channel: 'sms' });
    
    return { success: true, status: verification.status };
  } catch (error) {
    console.error('SMS verification error:', error);
    return { success: false, error };
  }
}

export async function verifyOTP(phone: string, code: string) {
  // In development mode, accept any 6-digit code
  if (process.env.NODE_ENV === 'development' && process.env.TWILIO_ACCOUNT_SID === 'development-mock-sid') {
    console.log('📱 [MOCK SMS VERIFICATION CHECK]');
    console.log('Phone:', phone);
    console.log('Code:', code);
    const success = code.length === 6 && /^\d+$/.test(code);
    console.log('Status:', success ? 'approved' : 'denied');
    console.log('-------------------');
    return { success, status: success ? 'approved' : 'denied' };
  }

  try {
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks
      .create({ to: phone, code });
    
    return { 
      success: verificationCheck.status === 'approved',
      status: verificationCheck.status 
    };
  } catch (error) {
    console.error('OTP verification error:', error);
    return { success: false, error };
  }
}

export async function sendReminderSMS(phone: string, message: string) {
  try {
    const sms = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
    
    return { success: true, sid: sms.sid };
  } catch (error) {
    console.error('SMS send error:', error);
    return { success: false, error };
  }
}