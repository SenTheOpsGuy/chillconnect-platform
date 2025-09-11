import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get bookings based on user role
    const whereCondition = session.user.role === 'PROVIDER'
      ? { providerId: session.user.id }
      : { seekerId: session.user.id };

    const bookings = await prisma.booking.findMany({
      where: {
        ...whereCondition,
        status: { in: ['CONFIRMED', 'COMPLETED'] }
      },
      include: {
        session: true,
        seeker: {
          include: { profile: true }
        },
        provider: {
          include: { profile: true }
        },
        feedback: true
      },
      orderBy: { startTime: 'desc' }
    });

    const sessions = bookings.map(booking => {
      const isProvider = session.user.role === 'PROVIDER';
      const otherUser = isProvider ? booking.seeker : booking.provider;
      
      return {
        id: booking.session?.id || booking.id,
        bookingId: booking.id,
        startedAt: booking.session?.startedAt || null,
        endedAt: booking.session?.endedAt || null,
        recordingUrl: booking.session?.recordingUrl || booking.recordingUrl,
        chatExpiresAt: booking.session?.chatExpiresAt || null,
        booking: {
          id: booking.id,
          scheduledAt: booking.startTime,
          duration: Math.round((booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60)),
          status: booking.status,
          amount: booking.amount,
          meetUrl: booking.meetUrl,
          [isProvider ? 'seeker' : 'provider']: {
            name: `${otherUser.profile?.firstName || ''} ${otherUser.profile?.lastName || ''}`.trim(),
            email: otherUser.email,
            avatar: otherUser.profile?.avatar || null
          }
        },
        feedback: booking.feedback ? {
          rating: booking.feedback.rating,
          comment: booking.feedback.comment,
          createdAt: booking.feedback.createdAt
        } : null
      };
    });

    return NextResponse.json({ sessions });

  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}