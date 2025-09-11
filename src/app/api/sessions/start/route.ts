import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const startSessionSchema = z.object({
  bookingId: z.string()
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { bookingId } = startSessionSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { session: true }
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if user is part of this booking
    if (booking.seekerId !== session.user.id && booking.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if booking is confirmed
    if (booking.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Booking not confirmed' },
        { status: 400 }
      );
    }

    // Create or update session
    let sessionData = booking.session;
    if (!sessionData) {
      sessionData = await prisma.session.create({
        data: {
          bookingId,
          startedAt: new Date(),
          chatExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        }
      });
    } else if (!sessionData.startedAt) {
      sessionData = await prisma.session.update({
        where: { id: sessionData.id },
        data: {
          startedAt: new Date(),
          chatExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });
    }

    return NextResponse.json({
      sessionId: sessionData.id,
      meetUrl: booking.meetUrl,
      chatEnabled: true
    });
  } catch (error) {
    console.error('Start session error:', error);
    return NextResponse.json(
      { error: 'Failed to start session' },
      { status: 500 }
    );
  }
}