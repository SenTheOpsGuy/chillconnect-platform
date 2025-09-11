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

    if (session.user.role !== 'EMPLOYEE' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only employees can access this endpoint' },
        { status: 403 }
      );
    }

    // Get real employee statistics from database
    const [
      unmatchedRequestsCount,
      pendingVerificationsCount,
      activeDisputesCount,
      totalProcessedCount
    ] = await Promise.all([
      // Unmatched requests (pending status)
      prisma.unmatchedRequest.count({
        where: { status: 'pending' }
      }),
      
      // Pending verifications (providers with PENDING verification status)
      prisma.provider.count({
        where: { verificationStatus: 'PENDING' }
      }),
      
      // Active disputes (bookings with DISPUTED status)
      prisma.booking.count({
        where: { status: 'DISPUTED' }
      }),
      
      // Total processed requests (resolved unmatched requests)
      prisma.unmatchedRequest.count({
        where: { status: 'resolved' }
      })
    ]);

    // Get resolved today count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const resolvedTodayCount = await prisma.unmatchedRequest.count({
      where: {
        status: 'resolved',
        resolvedAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // Get recent activity
    const recentUnmatchedRequests = await prisma.unmatchedRequest.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        seekerEmail: true,
        expertise: true,
        budget: true,
        createdAt: true,
        preferredTime: true
      }
    });

    // Get pending verifications
    const pendingProviders = await prisma.provider.findMany({
      where: { verificationStatus: 'PENDING' },
      include: {
        user: {
          include: { profile: true }
        }
      },
      orderBy: { id: 'desc' },
      take: 10
    });

    // Get recent bookings for overview
    const recentBookings = await prisma.booking.findMany({
      include: {
        seeker: { include: { profile: true } },
        provider: { include: { profile: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const stats = {
      unmatchedRequests: unmatchedRequestsCount,
      pendingVerifications: pendingVerificationsCount,
      activeDisputes: activeDisputesCount,
      resolvedToday: resolvedTodayCount,
      totalProcessed: totalProcessedCount,
      
      // Additional data for the dashboard
      recentUnmatchedRequests: recentUnmatchedRequests.map(req => ({
        id: req.id,
        email: req.seekerEmail,
        expertise: req.expertise,
        budget: req.budget,
        createdAt: req.createdAt,
        preferredTime: req.preferredTime
      })),
      
      pendingProviders: pendingProviders.map(provider => ({
        id: provider.id,
        name: `${provider.user.profile?.firstName || ''} ${provider.user.profile?.lastName || ''}`.trim(),
        email: provider.user.email,
        expertise: provider.expertise,
        yearsExperience: provider.yearsExperience,
        hourlyRate: provider.hourlyRate,
        createdAt: provider.user.createdAt
      })),
      
      recentBookings: recentBookings.map(booking => ({
        id: booking.id,
        seekerName: `${booking.seeker.profile?.firstName || ''} ${booking.seeker.profile?.lastName || ''}`.trim(),
        providerName: `${booking.provider.profile?.firstName || ''} ${booking.provider.profile?.lastName || ''}`.trim(),
        amount: booking.amount,
        status: booking.status,
        startTime: booking.startTime,
        createdAt: booking.createdAt
      }))
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}