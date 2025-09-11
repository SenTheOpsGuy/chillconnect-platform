// Simple email service that works in development without build issues
async function getBrevoClient() {
  // Always return null in development to use mock email
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  // In production, use fetch API instead of SDK to avoid AMD issues
  return {
    sendTransacEmail: async (emailData: any) => {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY!,
        },
        body: JSON.stringify(emailData),
      });
      
      if (!response.ok) {
        throw new Error(`Brevo API error: ${response.statusText}`);
      }
      
      return await response.json();
    }
  };
}

export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string
) {
  // In development mode, just log the email
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 [MOCK EMAIL]');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Content:', textContent || htmlContent.replace(/<[^>]*>/g, ''));
    console.log('-------------------');
    return { success: true, messageId: 'mock-message-id' };
  }

  try {
    const client = await getBrevoClient();
    if (!client) {
      console.error('Brevo client not available');
      return { success: false, error: 'Email client not available' };
    }

    const emailData = {
      sender: { 
        email: process.env.BREVO_SENDER_EMAIL,
        name: "ChillConnect"
      },
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlContent,
      textContent: textContent || htmlContent.replace(/<[^>]*>/g, '')
    };
    
    const data = await client.sendTransacEmail(emailData);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

export async function sendOTP(email: string, otp: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verify Your Email</h2>
      <p>Your verification code is:</p>
      <h1 style="background: #f0f0f0; padding: 20px; text-align: center; letter-spacing: 5px;">${otp}</h1>
      <p>This code expires in 10 minutes.</p>
    </div>
  `;
  
  return sendEmail(email, "ChillConnect - Verify Your Email", html);
}