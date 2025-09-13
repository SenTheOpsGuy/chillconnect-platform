import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

interface EarningsResponse {
  earnings: {
    id: string;
    amount: number;
    sessionDate: string;
    seekerName: string;
    status: 'PENDING' | 'PAID' | 'PROCESSING';
    payoutDate?: string;
  }[];
  stats: {
    totalEarnings: number;
    pendingPayouts: number;
    thisMonthEarnings: number;
    lastMonthEarnings: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Forbidden - Only providers can access earnings' }, { status: 403 });
    }

    const providerId = session.user.id;

    // Get current date ranges
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Fetch all completed and paid bookings for this provider
    const bookings = await prisma.booking.findMany({
      where: {
        providerId: providerId,
        status: {
          in: ['COMPLETED', 'CONFIRMED']
        }
      },
      include: {
        seeker: {
          include: {
            profile: true
          }
        },
        transactions: {
          where: {
            type: 'BOOKING_PAYMENT',
            status: 'completed'
          }
        }
      },
      orderBy: {
        endTime: 'desc'
      }
    });

    // Transform bookings into earnings format
    const earnings = bookings.map(booking => {
      const transaction = booking.transactions[0];
      const seekerName = booking.seeker.profile 
        ? `${booking.seeker.profile.firstName} ${booking.seeker.profile.lastName}`
        : booking.seeker.email.split('@')[0];

      // Determine status based on transaction and booking status
      let status: 'PENDING' | 'PAID' | 'PROCESSING' = 'PENDING';
      let payoutDate: string | undefined;

      if (transaction && transaction.status === 'completed') {
        if (booking.status === 'COMPLETED') {
          status = 'PAID';
          payoutDate = new Date(transaction.createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString();
        } else {
          status = 'PROCESSING';
        }
      }

      return {
        id: booking.id,
        amount: booking.amount,
        sessionDate: booking.endTime.toISOString(),
        seekerName,
        status,
        payoutDate
      };
    });

    // Calculate statistics
    const totalEarnings = bookings
      .filter(booking => booking.transactions.some(t => t.status === 'completed'))
      .reduce((sum, booking) => sum + booking.amount, 0);

    const pendingPayouts = bookings
      .filter(booking => 
        booking.status === 'COMPLETED' && 
        !booking.transactions.some(t => t.status === 'completed')
      )
      .reduce((sum, booking) => sum + booking.amount, 0);

    const thisMonthEarnings = bookings
      .filter(booking => 
        booking.endTime >= startOfThisMonth &&
        booking.transactions.some(t => t.status === 'completed')
      )
      .reduce((sum, booking) => sum + booking.amount, 0);

    const lastMonthEarnings = bookings
      .filter(booking => 
        booking.endTime >= startOfLastMonth && 
        booking.endTime <= endOfLastMonth &&
        booking.transactions.some(t => t.status === 'completed')
      )
      .reduce((sum, booking) => sum + booking.amount, 0);

    const stats = {
      totalEarnings: Math.round(totalEarnings),
      pendingPayouts: Math.round(pendingPayouts),
      thisMonthEarnings: Math.round(thisMonthEarnings),
      lastMonthEarnings: Math.round(lastMonthEarnings)
    };

    const response: EarningsResponse = {
      earnings,
      stats
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching earnings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings' },
      { status: 500 }
    );
  }
}