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

    // Get current date for calculations
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Generate monthly user growth data for the last 6 months
    const monthlyGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const nextMonth = new Date(currentYear, currentMonth - i + 1, 1);
      
      const newUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextMonth
          }
        }
      });

      const newProviders = await prisma.user.count({
        where: {
          role: 'PROVIDER',
          createdAt: {
            gte: date,
            lt: nextMonth
          }
        }
      });

      const newSeekers = await prisma.user.count({
        where: {
          role: 'SEEKER',
          createdAt: {
            gte: date,
            lt: nextMonth
          }
        }
      });

      monthlyGrowth.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        newUsers,
        newProviders,
        newSeekers,
        totalUsers: newUsers // This would be cumulative in real implementation
      });
    }

    // Get total user counts by role
    const [
      totalUsers,
      totalProviders,
      totalSeekers,
      totalEmployees,
      recentUsers,
      usersByLocation
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'PROVIDER' } }),
      prisma.user.count({ where: { role: 'SEEKER' } }),
      prisma.user.count({ where: { role: { in: ['EMPLOYEE', 'SUPER_ADMIN'] } } }),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { profile: true }
      }),
      prisma.userProfile.groupBy({
        by: ['state'],
        _count: true,
        where: { state: { not: null } }
      })
    ]);

    // Calculate growth rates
    const lastMonth = new Date(currentYear, currentMonth - 1, 1);
    const thisMonth = new Date(currentYear, currentMonth, 1);
    
    const [lastMonthUsers, thisMonthUsers] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(currentYear, currentMonth - 2, 1),
            lt: lastMonth
          }
        }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: lastMonth,
            lt: thisMonth
          }
        }
      })
    ]);

    const growthRate = lastMonthUsers > 0 ? 
      Math.round(((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100) : 
      0;

    // User engagement data
    const activeUsers30d = await prisma.user.count({
      where: {
        OR: [
          { lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
          { updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
        ]
      }
    });

    const activeUsers7d = await prisma.user.count({
      where: {
        OR: [
          { lastLoginAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          { updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
        ]
      }
    });

    // User distribution by role
    const usersByRole = [
      { role: 'Seekers', count: totalSeekers, percentage: Math.round((totalSeekers / totalUsers) * 100) },
      { role: 'Providers', count: totalProviders, percentage: Math.round((totalProviders / totalUsers) * 100) },
      { role: 'Staff', count: totalEmployees, percentage: Math.round((totalEmployees / totalUsers) * 100) }
    ];

    // Geographic distribution (top 5 states)
    const topLocations = usersByLocation
      .sort((a, b) => b._count - a._count)
      .slice(0, 5)
      .map(location => ({
        state: location.state || 'Unknown',
        count: location._count,
        percentage: Math.round((location._count / totalUsers) * 100)
      }));

    const analyticsData = {
      overview: {
        totalUsers,
        activeUsers30d,
        activeUsers7d,
        growthRate,
        newUsersThisMonth: thisMonthUsers
      },
      usersByRole,
      monthlyGrowth,
      topLocations,
      recentUsers: recentUsers.map(user => ({
        id: user.id,
        name: user.profile?.fullName || user.email,
        email: user.email,
        role: user.role,
        joinedAt: user.createdAt,
        location: user.profile?.state || 'Not provided',
        isActive: user.lastLoginAt ? 
          new Date(user.lastLoginAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : 
          false
      })),
      engagement: {
        dailyActiveUsers: Math.round(activeUsers7d / 7),
        weeklyActiveUsers: activeUsers7d,
        monthlyActiveUsers: activeUsers30d,
        retentionRate: totalUsers > 0 ? Math.round((activeUsers30d / totalUsers) * 100) : 0
      }
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('User analytics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user analytics' },
      { status: 500 }
    );
  }
}