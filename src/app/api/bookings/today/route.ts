import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/config';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    let whereCondition: Record<string, any> = {
      startTime: {
        gte: startOfDay,
        lt: endOfDay
      },
      status: {
        in: ['CONFIRMED', 'PENDING']
      }
    };

    // Filter based on user role
    if (session.user.role === 'PROVIDER') {
      whereCondition.providerId = session.user.id;
    } else if (session.user.role === 'SEEKER') {
      whereCondition.seekerId = session.user.id;
    } else {
      // For employees and admins, don't filter by user
    }

    const todayBookings = await prisma.booking.findMany({
      where: whereCondition,
      include: {
        seeker: {
          include: { profile: true }
        },
        provider: {
          include: { 
            profile: true,
            providerProfile: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    const formattedBookings = todayBookings.map(booking => ({
      id: booking.id,
      clientName: session.user.role === 'PROVIDER' 
        ? `${booking.seeker.profile?.firstName || ''} ${booking.seeker.profile?.lastName || ''}`.trim()
        : `${booking.provider.profile?.firstName || ''} ${booking.provider.profile?.lastName || ''}`.trim(),
      time: booking.startTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      }),
      duration: Math.round((booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60)),
      service: booking.provider.providerProfile?.expertise?.[0] || 'Consultation',
      status: booking.status,
      meetUrl: booking.meetUrl,
      canJoin: booking.status === 'CONFIRMED' && 
               new Date() >= new Date(booking.startTime.getTime() - 15 * 60 * 1000) && // 15 min before
               new Date() <= booking.endTime
    }));

    return NextResponse.json({ bookings: formattedBookings });
  } catch (error) {
    console.error('Today bookings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today bookings' },
      { status: 500 }
    );
  }
}