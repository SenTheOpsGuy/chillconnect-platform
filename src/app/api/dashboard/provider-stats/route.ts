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

    if (session.user.role !== 'PROVIDER') {
      return NextResponse.json(
        { error: 'Only providers can access this endpoint' },
        { status: 403 }
      );
    }

    const userId = session.user.id;

    // Get provider profile
    const provider = await prisma.provider.findUnique({
      where: { userId },
      include: { user: { include: { profile: true } } }
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider profile not found' },
        { status: 404 }
      );
    }

    // Get all bookings for this provider
    const bookings = await prisma.booking.findMany({
      where: { providerId: userId },
      include: {
        seeker: { include: { profile: true } },
        transactions: true,
        feedback: true,
        session: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate statistics
    const totalBookings = bookings.length;
    const completedSessions = bookings.filter(b => b.status === 'COMPLETED').length;
    const upcomingBookings = bookings.filter(b => 
      ['PENDING', 'CONFIRMED'].includes(b.status) && b.startTime > new Date()
    ).length;
    const totalEarnings = bookings
      .filter(b => b.status === 'COMPLETED')
      .reduce((sum, b) => sum + b.amount, 0);

    // Get today's sessions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysBookings = bookings.filter(b => 
      b.status === 'CONFIRMED' &&
      b.startTime >= today && 
      b.startTime < tomorrow
    );

    // Calculate rating from feedback
    const feedbacks = bookings.map(b => b.feedback).filter(f => f !== null);
    const averageRating = feedbacks.length > 0 
      ? feedbacks.reduce((sum, f) => sum + f!.rating, 0) / feedbacks.length 
      : provider.rating;

    // Get recent bookings for display
    const recentBookings = bookings.slice(0, 10).map(booking => ({
      id: booking.id,
      seekerName: `${booking.seeker.profile?.firstName || ''} ${booking.seeker.profile?.lastName || ''}`.trim(),
      seekerEmail: booking.seeker.email,
      scheduledAt: booking.startTime,
      duration: Math.round((booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60)),
      amount: booking.amount,
      status: booking.status,
      canJoin: booking.status === 'CONFIRMED' && 
               new Date() >= new Date(booking.startTime.getTime() - 15 * 60 * 1000) && // 15 min before
               new Date() <= booking.endTime,
      meetingLink: booking.meetUrl
    }));

    // Calculate monthly earnings (last 6 months)
    const monthlyEarnings = [];
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

      monthlyEarnings.push({
        month: month.toLocaleDateString('en-IN', { month: 'short' }),
        amount: monthlyAmount
      });
    }

    const stats = {
      // Basic stats
      totalBookings,
      completedSessions,
      upcomingBookings,
      totalEarnings,
      averageRating: Math.round(averageRating * 10) / 10,
      verificationStatus: provider.verificationStatus,
      
      // Today's schedule
      todaysSessions: todaysBookings.length,
      todaysEarnings: todaysBookings.reduce((sum, b) => sum + b.amount, 0),
      
      // Profile info
      hourlyRate: provider.hourlyRate,
      yearsExperience: provider.yearsExperience,
      expertise: provider.expertise,
      
      // Detailed data
      recentBookings,
      monthlyEarnings,
      todaysBookings: todaysBookings.map(booking => ({
        id: booking.id,
        seekerName: `${booking.seeker.profile?.firstName || ''} ${booking.seeker.profile?.lastName || ''}`.trim(),
        time: booking.startTime.toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        duration: Math.round((booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60)),
        amount: booking.amount,
        meetingLink: booking.meetUrl,
        canJoin: new Date() >= new Date(booking.startTime.getTime() - 15 * 60 * 1000) && 
                 new Date() <= booking.endTime
      }))
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching provider stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}