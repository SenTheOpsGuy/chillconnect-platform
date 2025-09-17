import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['EMPLOYEE', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get comprehensive payout statistics
    const [
      totalPayouts,
      monthlyPayouts,
      lastMonthPayouts,
      pendingPayouts,
      processingPayouts,
      pendingEarnings,
      readyForApproval,
      bankAccountRequests,
      topProviders
    ] = await Promise.all([
      // Total payouts processed
      prisma.payout.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { actualAmount: true },
        _count: true
      }),

      // This month's payouts
      prisma.payout.aggregate({
        where: { 
          status: 'COMPLETED',
          processedAt: { gte: startOfMonth }
        },
        _sum: { actualAmount: true },
        _count: true
      }),

      // Last month's payouts
      prisma.payout.aggregate({
        where: { 
          status: 'COMPLETED',
          processedAt: { 
            gte: startOfLastMonth,
            lt: endOfLastMonth
          }
        },
        _sum: { actualAmount: true },
        _count: true
      }),

      // Pending payouts awaiting approval
      prisma.payout.aggregate({
        where: { status: 'REQUESTED' },
        _sum: { requestedAmount: true },
        _count: true
      }),

      // Currently processing payouts
      prisma.payout.count({
        where: { 
          status: { in: ['APPROVED', 'PROCESSING'] }
        }
      }),

      // Pending earnings (in dispute period)
      prisma.providerEarnings.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: true
      }),

      // Earnings ready for auto-approval
      prisma.providerEarnings.aggregate({
        where: { 
          status: 'PENDING',
          disputeDeadline: { lt: now }
        },
        _sum: { amount: true },
        _count: true
      }),

      // Pending bank account deletion requests
      prisma.bankAccountDeleteRequest.count({
        where: { status: 'PENDING' }
      }),

      // Top providers by earnings this month
      prisma.providerEarnings.groupBy({
        by: ['providerId'],
        where: {
          status: { in: ['APPROVED', 'PAID_OUT'] },
          createdAt: { gte: startOfMonth }
        },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 5
      })
    ]);

    // Get provider details for top providers
    const topProviderDetails = await Promise.all(
      topProviders.map(async (tp) => {
        const provider = await prisma.provider.findUnique({
          where: { id: tp.providerId },
          include: {
            user: { include: { profile: true } }
          }
        });
        return {
          id: tp.providerId,
          name: provider ? `${provider.user.profile?.firstName || ''} ${provider.user.profile?.lastName || ''}`.trim() : 'Unknown',
          email: provider?.user.email || 'Unknown',
          earnings: tp._sum.amount || 0,
          sessions: tp._count
        };
      })
    );

    // Calculate month-over-month growth
    const monthlyAmount = monthlyPayouts._sum.actualAmount || 0;
    const lastMonthAmount = lastMonthPayouts._sum.actualAmount || 0;
    const monthOverMonthGrowth = lastMonthAmount > 0 
      ? ((monthlyAmount - lastMonthAmount) / lastMonthAmount) * 100 
      : 0;

    return NextResponse.json({
      overview: {
        totalPayoutsProcessed: {
          amount: totalPayouts._sum.actualAmount || 0,
          count: totalPayouts._count || 0
        },
        monthlyPayouts: {
          amount: monthlyAmount,
          count: monthlyPayouts._count || 0
        },
        lastMonthPayouts: {
          amount: lastMonthAmount,
          count: lastMonthPayouts._count || 0
        },
        monthOverMonthGrowth: Math.round(monthOverMonthGrowth * 100) / 100,
        pendingApprovals: {
          amount: pendingPayouts._sum.requestedAmount || 0,
          count: pendingPayouts._count || 0
        },
        processingCount: processingPayouts,
        pendingEarnings: {
          amount: pendingEarnings._sum.amount || 0,
          count: pendingEarnings._count || 0
        },
        readyForAutoApproval: {
          amount: readyForApproval._sum.amount || 0,
          count: readyForApproval._count || 0
        },
        pendingBankAccountRequests: bankAccountRequests
      },
      topProviders: topProviderDetails,
      lastUpdated: now.toISOString()
    });

  } catch (error) {
    console.error('Error fetching payout statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payout statistics' },
      { status: 500 }
    );
  }
}