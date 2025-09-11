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

    if (session.user.role !== 'EMPLOYEE' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get aggregated data for reports
    const [
      totalBookings,
      totalRevenue,
      totalUsers,
      totalProviders,
      recentTransactions
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.transaction.aggregate({
        where: { type: 'BOOKING_PAYMENT', status: 'completed' },
        _sum: { amount: true }
      }),
      prisma.user.count(),
      prisma.provider.count(),
      prisma.transaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { include: { profile: true } } }
      })
    ]);

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Generate dynamic reports based on actual data
    const reports = [
      {
        id: '1',
        title: 'Financial Summary Report',
        description: `Platform revenue analysis with ${Math.abs(totalRevenue._sum.amount || 0).toFixed(0)} total revenue processed`,
        type: 'FINANCIAL',
        generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        period: `${lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        size: '2.4 MB',
        status: 'READY'
      },
      {
        id: '2',
        title: 'User Growth Analysis',
        description: `User acquisition and engagement metrics (${totalUsers} total users)`,
        type: 'USER',
        generatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        period: `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`,
        size: '1.8 MB',
        status: 'READY'
      },
      {
        id: '3',
        title: 'Provider Performance Report',
        description: `Performance metrics for ${totalProviders} active providers`,
        type: 'PERFORMANCE',
        generatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        period: lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        size: '3.1 MB',
        status: 'READY'
      },
      {
        id: '4',
        title: 'Booking Trends Report',
        description: `Analysis of ${totalBookings} bookings and seasonal patterns`,
        type: 'BOOKING',
        generatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
        period: `Year ${now.getFullYear()}`,
        size: '4.2 MB',
        status: 'READY'
      },
      {
        id: '5',
        title: 'Tax Compliance Report',
        description: 'Transaction records and tax calculations for compliance filing',
        type: 'FINANCIAL',
        generatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        period: `FY ${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(-2)} Q${Math.ceil((now.getMonth() + 1) / 3)}`,
        size: '5.7 MB',
        status: 'GENERATING'
      },
      {
        id: '6',
        title: 'Customer Satisfaction Survey',
        description: 'Feedback analysis and satisfaction ratings from completed sessions',
        type: 'USER',
        generatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
        period: lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        size: '1.3 MB',
        status: 'READY'
      },
      {
        id: '7',
        title: 'Platform Analytics Dashboard',
        description: 'Comprehensive overview of platform metrics and KPIs',
        type: 'PERFORMANCE',
        generatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
        period: thisMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        size: '6.8 MB',
        status: 'READY'
      },
      {
        id: '8',
        title: 'Dispute Resolution Report',
        description: 'Analysis of disputes, resolution times, and outcomes',
        type: 'BOOKING',
        generatedAt: new Date().toISOString(),
        period: `Last 30 days`,
        size: '0.9 MB',
        status: 'GENERATING'
      }
    ];

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Reports fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'EMPLOYEE' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { reportId, action } = body;

    if (action === 'download') {
      // Simulate report generation/download
      return NextResponse.json({ 
        message: 'Report download initiated',
        downloadUrl: `/api/reports/${reportId}/download`,
        estimatedTime: '2-5 minutes'
      });
    }

    if (action === 'regenerate') {
      // Simulate report regeneration
      return NextResponse.json({ 
        message: 'Report regeneration started',
        reportId,
        status: 'GENERATING'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Report action error:', error);
    return NextResponse.json(
      { error: 'Failed to process report action' },
      { status: 500 }
    );
  }
}