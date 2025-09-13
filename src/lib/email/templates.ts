import { sendEmail } from './brevo';

export interface BookingEmailData {
  id: string;
  startTime: string;
  endTime: string;
  amount: number;
  meetUrl?: string;
  seeker: {
    name: string;
    email: string;
  };
  provider: {
    name: string;
    email: string;
  };
}

// Template for booking confirmation email to seeker
function generateSeekerConfirmationTemplate(booking: BookingEmailData): string {
  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);
  const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmed</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; margin-top: 20px; }
            .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #2563eb; }
            .header h1 { color: #2563eb; margin: 0; font-size: 28px; }
            .success-icon { font-size: 48px; color: #10b981; margin: 20px 0; }
            .content { padding: 30px 0; }
            .details-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-weight: 600; color: #374151; }
            .detail-value { color: #1f2937; }
            .amount { font-size: 18px; font-weight: bold; color: #10b981; }
            .meeting-info { background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 6px; padding: 15px; margin: 20px 0; }
            .meeting-link { word-break: break-all; font-family: monospace; background: white; padding: 10px; border-radius: 4px; margin-top: 10px; }
            .important-notes { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px 0; border-top: 1px solid #e2e8f0; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>ChillConnect</h1>
                <div class="success-icon">✅</div>
                <h2 style="color: #10b981; margin: 0;">Booking Confirmed!</h2>
            </div>
            
            <div class="content">
                <p>Hi ${booking.seeker.name},</p>
                <p>Great news! Your consultation has been successfully booked and payment confirmed.</p>
                
                <div class="details-box">
                    <h3 style="margin-top: 0; color: #2563eb;">Session Details</h3>
                    <div class="detail-row">
                        <span class="detail-label">Provider:</span>
                        <span class="detail-value">${booking.provider.name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${formatDate(startDate)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Time:</span>
                        <span class="detail-value">${formatTime(startDate)} - ${formatTime(endDate)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Duration:</span>
                        <span class="detail-value">${duration} minutes</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Amount Paid:</span>
                        <span class="detail-value amount">₹${booking.amount.toLocaleString()}</span>
                    </div>
                </div>
                
                ${booking.meetUrl ? `
                <div class="meeting-info">
                    <h3 style="margin-top: 0; color: #1e40af;">Meeting Details</h3>
                    <p><strong>Meeting Link:</strong></p>
                    <div class="meeting-link">${booking.meetUrl}</div>
                    <p><em>This link will be active 15 minutes before your session starts.</em></p>
                </div>
                ` : `
                <div class="meeting-info">
                    <h3 style="margin-top: 0; color: #1e40af;">Meeting Details</h3>
                    <p>Your meeting link will be shared via email 15 minutes before the session starts.</p>
                </div>
                `}
                
                <div class="important-notes">
                    <h3 style="margin-top: 0; color: #92400e;">Important Information</h3>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Please join the session 5 minutes early to test your audio/video</li>
                        <li>You can reschedule or cancel up to 24 hours before the session</li>
                        <li>A chat will be available for 24 hours after your session</li>
                        <li>You'll receive a reminder 1 hour before your session</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://newchillconnect.vercel.app/bookings" class="button">View My Bookings</a>
                </div>
                
                <p>If you have any questions or need to make changes, please contact us at support@chillconnect.in</p>
            </div>
            
            <div class="footer">
                <p>This is an automated message from ChillConnect.</p>
                <p>© 2024 ChillConnect. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Template for new booking notification email to provider
function generateProviderNotificationTemplate(booking: BookingEmailData): string {
  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);
  const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Booking Received</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; margin-top: 20px; }
            .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #10b981; }
            .header h1 { color: #10b981; margin: 0; font-size: 28px; }
            .notification-icon { font-size: 48px; color: #2563eb; margin: 20px 0; }
            .content { padding: 30px 0; }
            .details-box { background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 20px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #bae6fd; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-weight: 600; color: #0c4a6e; }
            .detail-value { color: #1e3a8a; }
            .amount { font-size: 18px; font-weight: bold; color: #10b981; }
            .client-info { background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 15px; margin: 20px 0; }
            .action-needed { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px 0; border-top: 1px solid #e2e8f0; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>ChillConnect</h1>
                <div class="notification-icon">🔔</div>
                <h2 style="color: #2563eb; margin: 0;">New Booking Received</h2>
            </div>
            
            <div class="content">
                <p>Hi ${booking.provider.name},</p>
                <p>You have a new confirmed consultation booking! A client has successfully booked and paid for a session with you.</p>
                
                <div class="details-box">
                    <h3 style="margin-top: 0; color: #0ea5e9;">Session Details</h3>
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${formatDate(startDate)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Time:</span>
                        <span class="detail-value">${formatTime(startDate)} - ${formatTime(endDate)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Duration:</span>
                        <span class="detail-value">${duration} minutes</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Earnings:</span>
                        <span class="detail-value amount">₹${booking.amount.toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="client-info">
                    <h3 style="margin-top: 0; color: #374151;">Client Information</h3>
                    <div class="detail-row">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${booking.seeker.name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${booking.seeker.email}</span>
                    </div>
                </div>
                
                ${booking.meetUrl ? `
                <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 6px; padding: 15px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #065f46;">Meeting Link Ready</h3>
                    <p>Meeting link: <code style="background: white; padding: 4px 8px; border-radius: 4px;">${booking.meetUrl}</code></p>
                </div>
                ` : ''}
                
                <div class="action-needed">
                    <h3 style="margin-top: 0; color: #92400e;">Action Required</h3>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Prepare for your session by reviewing the client's booking details</li>
                        <li>Ensure you have a stable internet connection and quiet environment</li>
                        <li>Join the meeting 5 minutes early to test your setup</li>
                        <li>You'll receive a reminder 30 minutes before the session</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://newchillconnect.vercel.app/provider/bookings" class="button">View Booking Details</a>
                </div>
                
                <p>Thank you for being part of the ChillConnect community. If you have any questions, please contact us at support@chillconnect.in</p>
            </div>
            
            <div class="footer">
                <p>This is an automated message from ChillConnect.</p>
                <p>© 2024 ChillConnect. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Function to send booking confirmation email to seeker
export async function sendBookingConfirmationToSeeker(booking: BookingEmailData) {
  const subject = `✅ Booking Confirmed - Session with ${booking.provider.name}`;
  const htmlContent = generateSeekerConfirmationTemplate(booking);
  
  return await sendEmail(
    booking.seeker.email,
    subject,
    htmlContent
  );
}

// Function to send booking notification email to provider
export async function sendBookingNotificationToProvider(booking: BookingEmailData) {
  const subject = `🔔 New Booking - ${booking.seeker.name} booked a session`;
  const htmlContent = generateProviderNotificationTemplate(booking);
  
  return await sendEmail(
    booking.provider.email,
    subject,
    htmlContent
  );
}

// Function to send both confirmation emails
export async function sendBookingConfirmationEmails(booking: BookingEmailData) {
  try {
    // Send emails concurrently
    const [seekerResult, providerResult] = await Promise.allSettled([
      sendBookingConfirmationToSeeker(booking),
      sendBookingNotificationToProvider(booking)
    ]);

    console.log('📧 Email Results:', {
      seeker: seekerResult.status === 'fulfilled' ? seekerResult.value : { error: seekerResult.reason },
      provider: providerResult.status === 'fulfilled' ? providerResult.value : { error: providerResult.reason }
    });

    return {
      seekerEmailSent: seekerResult.status === 'fulfilled' && seekerResult.value.success,
      providerEmailSent: providerResult.status === 'fulfilled' && providerResult.value.success,
      errors: [
        seekerResult.status === 'rejected' ? seekerResult.reason : null,
        providerResult.status === 'rejected' ? providerResult.reason : null
      ].filter(Boolean)
    };
  } catch (error) {
    console.error('Error sending booking confirmation emails:', error);
    return {
      seekerEmailSent: false,
      providerEmailSent: false,
      errors: [error]
    };
  }
}