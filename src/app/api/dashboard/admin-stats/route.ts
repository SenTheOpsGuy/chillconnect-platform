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

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get current date ranges for comparisons
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Fetch all statistics in parallel
    const [
      totalUsers,
      totalProviders,
      totalSeekers,
      totalEmployees,
      totalBookings,
      completedBookings,
      activeBookings,
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      thisMonthUsers,
      lastMonthUsers,
      todayBookings,
      pendingVerifications,
      disputedBookings,
      platformBalance
    ] = await Promise.all([
      // User counts
      prisma.user.count(),
      prisma.user.count({ where: { role: 'PROVIDER' } }),
      prisma.user.count({ where: { role: 'SEEKER' } }),
      prisma.user.count({ where: { role: { in: ['EMPLOYEE', 'SUPER_ADMIN'] } } }),
      
      // Booking stats
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'COMPLETED' } }),
      prisma.booking.count({ 
        where: { 
          status: 'CONFIRMED',
          startTime: { gte: now }
        } 
      }),
      
      // Revenue stats
      prisma.transaction.aggregate({
        where: { 
          type: 'BOOKING_PAYMENT', 
          status: 'completed',
          amount: { lt: 0 } // Negative amounts are payments FROM users
        },
        _sum: { amount: true }
      }),
      
      // This month revenue
      prisma.transaction.aggregate({
        where: { 
          type: 'BOOKING_PAYMENT', 
          status: 'completed',
          amount: { lt: 0 },
          createdAt: { gte: startOfMonth }
        },
        _sum: { amount: true }
      }),
      
      // Last month revenue
      prisma.transaction.aggregate({
        where: { 
          type: 'BOOKING_PAYMENT', 
          status: 'completed',
          amount: { lt: 0 },
          createdAt: { 
            gte: startOfLastMonth,
            lt: startOfMonth
          }
        },
        _sum: { amount: true }
      }),
      
      // User growth
      prisma.user.count({
        where: { createdAt: { gte: startOfMonth } }
      }),
      
      prisma.user.count({
        where: { 
          createdAt: { 
            gte: startOfLastMonth,
            lt: startOfMonth
          }
        }
      }),
      
      // Today's bookings
      prisma.booking.count({
        where: {
          startTime: {
            gte: startOfToday,
            lt: endOfToday
          }
        }
      }),
      
      // Pending verifications
      prisma.provider.count({
        where: { verificationStatus: 'PENDING' }
      }),
      
      // Disputed bookings
      prisma.booking.count({
        where: { status: 'DISPUTED' }
      }),
      
      // Platform balance (total wallet balances)
      prisma.wallet.aggregate({
        _sum: { balance: true }
      })
    ]);

    // Calculate growth rates
    const userGrowthRate = lastMonthUsers > 0 
      ? ((thisMonthUsers - lastMonthUsers) / lastMonthUsers * 100)
      : thisMonthUsers > 0 ? 100 : 0;

    const revenueGrowthRate = (lastMonthRevenue._sum.amount || 0) !== 0
      ? (((thisMonthRevenue._sum.amount || 0) - (lastMonthRevenue._sum.amount || 0)) / Math.abs(lastMonthRevenue._sum.amount || 1) * 100)
      : (thisMonthRevenue._sum.amount || 0) > 0 ? 100 : 0;

    // Calculate system health based on various metrics
    let systemHealth = 'Excellent';
    let healthScore = 100;
    
    if (disputedBookings > 0) healthScore -= disputedBookings * 10;
    if (pendingVerifications > 5) healthScore -= (pendingVerifications - 5) * 5;
    
    if (healthScore >= 90) systemHealth = 'Excellent';
    else if (healthScore >= 70) systemHealth = 'Good';
    else if (healthScore >= 50) systemHealth = 'Fair';
    else systemHealth = 'Needs Attention';

    const stats = {
      totalUsers,
      totalProviders,
      totalSeekers,
      totalEmployees,
      totalBookings,
      completedBookings,
      activeSessions: activeBookings, // Active/upcoming confirmed bookings
      totalRevenue: Math.abs(totalRevenue._sum.amount || 0), // Convert to positive
      thisMonthRevenue: Math.abs(thisMonthRevenue._sum.amount || 0),
      lastMonthRevenue: Math.abs(lastMonthRevenue._sum.amount || 0),
      platformGrowth: Number(userGrowthRate.toFixed(1)),
      revenueGrowth: Number(revenueGrowthRate.toFixed(1)),
      pendingIssues: disputedBookings + pendingVerifications,
      pendingVerifications,
      disputedBookings,
      systemHealth,
      todayBookings,
      platformBalance: platformBalance._sum.balance || 0,
      bookingCompletionRate: totalBookings > 0 ? Number(((completedBookings / totalBookings) * 100).toFixed(1)) : 0
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Admin stats fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}