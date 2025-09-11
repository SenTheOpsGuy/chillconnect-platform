import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email/brevo';
import { sendReminderSMS } from '@/lib/sms/twilio';

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    
    // 24-hour email reminders
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const bookings24h = await prisma.booking.findMany({
      where: {
        startTime: {
          gte: tomorrow,
          lt: new Date(tomorrow.getTime() + 60 * 1000) // 1-minute window
        },
        status: 'CONFIRMED'
      },
      include: {
        seeker: { include: { profile: true } },
        provider: { include: { user: { include: { profile: true } } } }
      }
    });

    for (const booking of bookings24h) {
      await sendEmail(
        booking.seeker.email,
        'Reminder: Consultation Tomorrow',
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your consultation is tomorrow</h2>
            <p><strong>Expert:</strong> ${booking.provider.user.profile?.firstName} ${booking.provider.user.profile?.lastName}</p>
            <p><strong>Date & Time:</strong> ${booking.startTime.toLocaleDateString('en-IN')} at ${booking.startTime.toLocaleTimeString('en-IN')}</p>
            <p><strong>Duration:</strong> ${Math.round((booking.endTime.getTime() - booking.startTime.getTime()) / 60000)} minutes</p>
            <p><a href="${booking.meetUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Join Meeting</a></p>
          </div>
        `
      );
    }

    // 1-hour SMS reminders
    const oneHour = new Date(now.getTime() + 60 * 60 * 1000);
    const bookings1h = await prisma.booking.findMany({
      where: {
        startTime: {
          gte: oneHour,
          lt: new Date(oneHour.getTime() + 60 * 1000)
        },
        status: 'CONFIRMED'
      },
      include: {
        seeker: true,
        provider: { include: { user: { include: { profile: true } } } }
      }
    });

    for (const booking of bookings1h) {
      if (booking.seeker.phone) {
        await sendReminderSMS(
          booking.seeker.phone,
          `ChillConnect: Your consultation with ${booking.provider.user.profile?.firstName} starts in 1 hour. Meeting: ${booking.meetUrl}`
        );
      }
    }

    return NextResponse.json({ 
      processed: {
        email24h: bookings24h.length,
        sms1h: bookings1h.length
      }
    });
  } catch (error) {
    console.error('Reminders cron error:', error);
    return NextResponse.json(
      { error: 'Failed to process reminders' },
      { status: 500 }
    );
  }
}