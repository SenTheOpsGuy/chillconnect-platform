// Email service using Brevo (formerly SendinBlue)
export class EmailService {
  private apiKey: string
  private baseUrl = 'https://api.brevo.com/v3'

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || ''
  }

  async sendEmail(to: string, subject: string, content: string, isHTML = true) {
    const response = await fetch(`${this.baseUrl}/smtp/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify({
        sender: { email: 'noreply@chillconnect.in', name: 'ChillConnect' },
        to: [{ email: to }],
        subject,
        htmlContent: isHTML ? content : undefined,
        textContent: !isHTML ? content : undefined,
      }),
    })

    return response.json()
  }

  async sendOTPEmail(to: string, otp: string) {
    const subject = 'ChillConnect Email Verification'
    const content = `
      <h2>Welcome to ChillConnect!</h2>
      <p>Your verification code is: <strong>${otp}</strong></p>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
    return this.sendEmail(to, subject, content)
  }

  async sendBookingConfirmation(to: string, bookingDetails: any) {
    const subject = 'Booking Confirmed - ChillConnect'
    const content = `
      <h2>Your consultation has been confirmed!</h2>
      <p><strong>Expert:</strong> ${bookingDetails.providerName}</p>
      <p><strong>Date:</strong> ${bookingDetails.scheduledAt}</p>
      <p><strong>Duration:</strong> ${bookingDetails.duration} minutes</p>
      <p><strong>Cost:</strong> $${bookingDetails.cost}</p>
      <p>Meeting link will be shared 15 minutes before the session.</p>
    `
    return this.sendEmail(to, subject, content)
  }
}

// SMS service using Twilio
export class SMSService {
  private accountSid: string
  private authToken: string
  private phoneNumber: string

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || ''
    this.authToken = process.env.TWILIO_AUTH_TOKEN || ''
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER || ''
  }

  async sendSMS(to: string, message: string) {
    const twilio = require('twilio')(this.accountSid, this.authToken)
    
    try {
      const result = await twilio.messages.create({
        body: message,
        from: this.phoneNumber,
        to,
      })
      return { success: true, sid: result.sid }
    } catch (error) {
      console.error('SMS send error:', error)
      return { success: false, error }
    }
  }

  async sendOTPSMS(to: string, otp: string) {
    const message = `ChillConnect verification code: ${otp}. Valid for 10 minutes. Don't share this code.`
    return this.sendSMS(to, message)
  }

  async sendBookingReminder(to: string, bookingDetails: any) {
    const message = `Reminder: Your consultation with ${bookingDetails.providerName} starts in 15 minutes. Join here: ${bookingDetails.meetingLink}`
    return this.sendSMS(to, message)
  }
}

// OTP generation and validation
export class OTPService {
  generateOTP(length = 6): string {
    const chars = '0123456789'
    let result = ''
    for (let i = length; i > 0; --i) {
      result += chars[Math.floor(Math.random() * chars.length)]
    }
    return result
  }

  async storeOTP(userId: string, otp: string, type: string) {
    const { prisma } = await import('./prisma')
    
    // Clear existing OTPs of this type
    await prisma.oTP.deleteMany({
      where: { userId, type }
    })

    // Store new OTP
    return prisma.oTP.create({
      data: {
        userId,
        code: otp,
        type,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      }
    })
  }

  async verifyOTP(userId: string, otp: string, type: string): Promise<boolean> {
    const { prisma } = await import('./prisma')
    
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        userId,
        type,
        code: otp,
        verified: false,
        expiresAt: { gt: new Date() }
      }
    })

    if (!otpRecord) return false

    // Mark as verified
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { verified: true }
    })

    return true
  }
}