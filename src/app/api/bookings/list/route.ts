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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // filter by status
    const role = searchParams.get('role'); // 'seeker' or 'provider'

    const whereCondition: Record<string, any> = {};

    // Filter by user role
    if (role === 'provider') {
      whereCondition.providerId = session.user.id;
    } else {
      // Default to seeker bookings
      whereCondition.seekerId = session.user.id;
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      if (status === 'upcoming') {
        whereCondition.status = { in: ['PENDING', 'CONFIRMED'] };
        whereCondition.startTime = { gte: new Date() };
      } else if (status === 'completed') {
        whereCondition.status = 'COMPLETED';
      } else if (status === 'cancelled') {
        whereCondition.status = 'CANCELLED';
      } else {
        whereCondition.status = status.toUpperCase();
      }
    }

    const bookings = await prisma.booking.findMany({
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
        },
        transactions: true,
        session: true
      },
      orderBy: [
        { startTime: 'desc' }
      ]
    });

    const formattedBookings = bookings.map(booking => ({
      id: booking.id,
      providerId: booking.provider.id,
      providerName: `${booking.provider.profile?.firstName || ''} ${booking.provider.profile?.lastName || ''}`.trim(),
      providerAvatar: booking.provider.profile?.avatar,
      expertise: booking.provider.providerProfile?.expertise?.[0] || 'Consultation',
      scheduledAt: booking.startTime.toISOString(),
      duration: Math.round((booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60)),
      amount: booking.amount,
      status: booking.status,
      meetingLink: booking.meetUrl,
      seekerName: role === 'provider' ? `${booking.seeker.profile?.firstName || ''} ${booking.seeker.profile?.lastName || ''}`.trim() : undefined,
      paymentStatus: booking.transactions?.[0]?.status || 'pending',
      canJoin: booking.status === 'CONFIRMED' && 
               new Date() >= new Date(booking.startTime.getTime() - 15 * 60 * 1000) && // 15 min before
               new Date() <= booking.endTime,
      chatAvailable: booking.session?.chatExpiresAt ? new Date() < booking.session.chatExpiresAt : false
    }));

    return NextResponse.json({ bookings: formattedBookings });
  } catch (error) {
    console.error('Bookings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}