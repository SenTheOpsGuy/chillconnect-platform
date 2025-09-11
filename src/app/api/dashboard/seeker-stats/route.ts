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

    if (session.user.role !== 'SEEKER') {
      return NextResponse.json(
        { error: 'Only seekers can access this endpoint' },
        { status: 403 }
      );
    }

    // Get real seeker statistics from database
    const userId = session.user.id;

    // Get all bookings for the seeker
    const bookings = await prisma.booking.findMany({
      where: { seekerId: userId },
      include: {
        provider: {
          include: {
            profile: true,
            providerProfile: true
          }
        },
        transactions: true,
        feedback: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate statistics
    const totalBookings = bookings.length;
    const completedSessions = bookings.filter(b => b.status === 'COMPLETED').length;
    const upcomingBookings = bookings.filter(b => 
      ['PENDING', 'CONFIRMED'].includes(b.status) && b.startTime > new Date()
    ).length;
    
    const completedTransactions = bookings
      .flatMap(b => b.transactions)
      .filter(t => t.status === 'completed');
    const totalSpent = completedTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Calculate average rating given by this seeker
    const ratingsGiven = bookings
      .map(b => b.feedback)
      .filter(f => f !== null);
    const averageRating = ratingsGiven.length > 0 
      ? ratingsGiven.reduce((sum, f) => sum + f!.rating, 0) / ratingsGiven.length 
      : 0;

    // Get favorite experts (most booked providers)
    const providerBookingCounts = bookings.reduce((acc, booking) => {
      const providerId = booking.provider.id;
      acc[providerId] = (acc[providerId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const favoriteExperts = Object.entries(providerBookingCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([providerId, count]) => {
        const provider = bookings.find(b => b.provider.id === providerId)?.provider;
        return {
          id: providerId,
          name: `${provider?.profile?.firstName || ''} ${provider?.profile?.lastName || ''}`.trim(),
          expertise: provider?.providerProfile?.expertise?.[0] || 'Consultation',
          sessionsWithThem: count
        };
      });

    // Get recent activity
    const recentActivity = bookings.slice(0, 5).map(booking => {
      let type = 'booking_created';
      let description = `Booking created with ${booking.provider.profile?.firstName}`;
      
      if (booking.status === 'COMPLETED') {
        type = 'session_completed';
        description = `Completed session with ${booking.provider.profile?.firstName}`;
      } else if (booking.status === 'CONFIRMED') {
        type = 'booking_confirmed';
        description = `Booking confirmed with ${booking.provider.profile?.firstName}`;
      }

      return {
        type,
        description,
        timestamp: booking.createdAt.toISOString()
      };
    });

    // Calculate spending by category
    const spendingByCategory = bookings
      .filter(b => b.status === 'COMPLETED')
      .reduce((acc, booking) => {
        const expertise = booking.provider.providerProfile?.expertise?.[0] || 'Other';
        acc[expertise] = (acc[expertise] || 0) + booking.amount;
        return acc;
      }, {} as Record<string, number>);

    // Calculate monthly spending (last 6 months)
    const monthlySpending = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthlyAmount = bookings
        .filter(b => 
          b.status === 'COMPLETED' &&
          b.createdAt >= month && 
          b.createdAt < nextMonth
        )
        .reduce((sum, b) => sum + b.amount, 0);

      monthlySpending.push({
        month: month.toLocaleDateString('en-IN', { month: 'short' }),
        amount: monthlyAmount
      });
    }

    const stats = {
      totalBookings,
      completedSessions,
      upcomingBookings,
      totalSpent,
      averageRating: Math.round(averageRating * 10) / 10,
      favoriteExperts,
      recentActivity,
      spendingByCategory,
      monthlySpending
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching seeker stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}