import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/config';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        seeker: { include: { profile: true } },
        provider: { include: { profile: true } },
        transactions: true
      }
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this booking
    if (booking.seekerId !== session.user.id && booking.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      id: booking.id,
      status: booking.status,
      startTime: booking.startTime,
      endTime: booking.endTime,
      amount: booking.amount,
      meetUrl: booking.meetUrl,
      seeker: {
        name: `${booking.seeker.profile?.firstName} ${booking.seeker.profile?.lastName}`,
        email: booking.seeker.email
      },
      provider: {
        name: `${booking.provider.profile?.firstName} ${booking.provider.profile?.lastName}`,
        email: booking.provider.email
      },
      paymentStatus: booking.transactions?.[0]?.status || 'pending'
    });
  } catch (error) {
    console.error('Booking status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking status' },
      { status: 500 }
    );
  }
}