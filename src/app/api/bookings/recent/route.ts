import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get recent bookings from database
    const userId = session.user.id;
    
    const recentBookings = await prisma.booking.findMany({
      where: { seekerId: userId },
      include: {
        provider: {
          include: {
            profile: true,
            providerProfile: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const formattedBookings = recentBookings.map(booking => ({
      id: booking.id,
      providerId: booking.provider.id,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      amount: booking.amount,
      status: booking.status,
      meetUrl: booking.meetUrl,
      provider: {
        id: booking.provider.id,
        expertise: booking.provider.providerProfile?.expertise || [],
        user: {
          profile: {
            firstName: booking.provider.profile?.firstName || '',
            lastName: booking.provider.profile?.lastName || ''
          }
        }
      }
    }));

    return NextResponse.json({ bookings: formattedBookings });
  } catch (error) {
    console.error('Error fetching recent bookings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}