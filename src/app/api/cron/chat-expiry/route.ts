import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Enable chat for recently completed sessions (within last hour)
    const recentlyCompleted = await prisma.booking.findMany({
      where: {
        endTime: { 
          lt: now,
          gte: new Date(now.getTime() - 60 * 60 * 1000) // Last hour
        },
        status: 'CONFIRMED',
        session: { is: null }
      }
    });

    for (const booking of recentlyCompleted) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { 
          status: 'COMPLETED',
          session: {
            create: {
              startedAt: booking.startTime,
              endedAt: booking.endTime,
              chatExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours
            }
          }
        }
      });
    }

    // Disable expired chats
    const expiredSessions = await prisma.session.updateMany({
      where: {
        chatExpiresAt: { 
          lt: now,
          not: null
        }
      },
      data: {
        chatExpiresAt: null
      }
    });

    // Auto-cancel unconfirmed bookings (older than 30 minutes)
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const cancelledBookings = await prisma.booking.updateMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: thirtyMinutesAgo }
      },
      data: {
        status: 'CANCELLED'
      }
    });

    return NextResponse.json({
      processed: {
        enabledChat: recentlyCompleted.length,
        expiredChats: expiredSessions.count,
        cancelledBookings: cancelledBookings.count
      }
    });
  } catch (error) {
    console.error('Chat expiry cron error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat expiry' },
      { status: 500 }
    );
  }
}