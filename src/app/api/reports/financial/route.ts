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

    // Generate monthly data for the last 6 months
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const nextMonth = new Date(currentYear, currentMonth - i + 1, 1);
      
      const monthlyTransactions = await prisma.transaction.aggregate({
        where: {
          type: 'BOOKING_PAYMENT',
          status: 'completed',
          createdAt: {
            gte: date,
            lt: nextMonth
          }
        },
        _sum: { amount: true },
        _count: true
      });

      const monthlyPayouts = await prisma.payout.aggregate({
        where: {
          status: 'COMPLETED',
          processedAt: {
            gte: date,
            lt: nextMonth
          }
        },
        _sum: { actualAmount: true }
      });

      const revenue = monthlyTransactions._sum.amount || 0;
      const commission = revenue * 0.15; // 15% platform commission
      const payouts = monthlyPayouts._sum.actualAmount || 0;

      monthlyData.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        revenue,
        commission,
        payouts
      });
    }

    // Get total aggregated data
    const [
      totalRevenueResult,
      totalPayoutsResult,
      transactionStats,
      categoryStats
    ] = await Promise.all([
      prisma.transaction.aggregate({
        where: { type: 'BOOKING_PAYMENT', status: 'completed' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.payout.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { actualAmount: true, transactionFee: true }
      }),
      prisma.transaction.findMany({
        where: { type: 'BOOKING_PAYMENT' },
        select: { amount: true, status: true }
      }),
      prisma.booking.groupBy({
        by: ['serviceType'],
        _sum: { amount: true },
        _count: true
      })
    ]);

    const totalRevenue = totalRevenueResult._sum.amount || 0;
    const platformCommission = totalRevenue * 0.15;
    const providerPayouts = totalPayoutsResult._sum.actualAmount || 0;
    const totalFees = totalPayoutsResult._sum.transactionFee || 0;

    // Calculate refunds and chargebacks
    const refunds = transactionStats.filter(t => t.status === 'refunded').length;
    const chargebacks = transactionStats.filter(t => t.status === 'disputed').length;
    const avgTransaction = totalRevenue / (totalRevenueResult._count || 1);

    // Convert category stats to revenue breakdown
    const revenueByCategory = categoryStats.map(cat => {
      const amount = cat._sum.amount || 0;
      const percentage = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0;
      return {
        category: cat.serviceType || 'Other',
        amount,
        percentage
      };
    });

    // Calculate tax breakdown
    const gstOnCommission = platformCommission * 0.18; // 18% GST
    const tdsOnProviders = totalRevenue * 0.02; // 2% TDS
    
    const taxBreakdown = [
      { category: 'Platform Commission (15%)', amount: platformCommission, rate: 15 },
      { category: 'GST on Commission (18%)', amount: gstOnCommission, rate: 18 },
      { category: 'TDS on Provider Payments (2%)', amount: tdsOnProviders, rate: 2 }
    ];

    const financialData = {
      totalRevenue,
      platformCommission,
      providerPayouts,
      taxableAmount: platformCommission + gstOnCommission,
      monthlyRevenue: monthlyData,
      revenueByCategory,
      taxBreakdown,
      transactionStats: {
        totalTransactions: totalRevenueResult._count || 0,
        averageTransaction: Math.round(avgTransaction),
        refunds,
        chargebacks
      }
    };

    return NextResponse.json(financialData);
  } catch (error) {
    console.error('Financial data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial data' },
      { status: 500 }
    );
  }
}