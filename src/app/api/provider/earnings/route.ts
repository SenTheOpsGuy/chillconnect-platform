import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get provider
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id }
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Get earnings summary
    const [
      totalEarnings,
      approvedEarnings,
      pendingEarnings,
      paidOutEarnings,
      recentEarnings
    ] = await Promise.all([
      // Total earnings (all time)
      prisma.providerEarnings.aggregate({
        where: { providerId: provider.id },
        _sum: { amount: true },
        _count: true
      }),
      
      // Available for payout
      prisma.providerEarnings.aggregate({
        where: { 
          providerId: provider.id,
          status: 'APPROVED'
        },
        _sum: { amount: true },
        _count: true
      }),
      
      // Pending approval (within dispute period)
      prisma.providerEarnings.aggregate({
        where: { 
          providerId: provider.id,
          status: 'PENDING'
        },
        _sum: { amount: true },
        _count: true
      }),
      
      // Already paid out
      prisma.providerEarnings.aggregate({
        where: { 
          providerId: provider.id,
          status: 'PAID_OUT'
        },
        _sum: { amount: true },
        _count: true
      }),
      
      // Recent earnings (last 10)
      prisma.providerEarnings.findMany({
        where: { providerId: provider.id },
        include: {
          booking: {
            include: {
              seeker: {
                include: { profile: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    const availableBalance = approvedEarnings._sum.amount || 0;
    const minimumPayout = 1000; // Minimum ₹1000 for payout
    const canRequestPayout = availableBalance >= minimumPayout;

    return NextResponse.json({
      summary: {
        totalEarnings: totalEarnings._sum.amount || 0,
        totalSessions: totalEarnings._count || 0,
        availableBalance: availableBalance,
        pendingAmount: pendingEarnings._sum.amount || 0,
        pendingSessions: pendingEarnings._count || 0,
        paidOutAmount: paidOutEarnings._sum.amount || 0,
        paidOutSessions: paidOutEarnings._count || 0,
        minimumPayout: minimumPayout,
        canRequestPayout: canRequestPayout
      },
      recentEarnings: recentEarnings.map(earning => ({
        id: earning.id,
        amount: earning.amount,
        totalAmount: earning.totalAmount,
        platformCommission: earning.platformCommission,
        status: earning.status,
        disputeDeadline: earning.disputeDeadline,
        approvedAt: earning.approvedAt,
        approvedBy: earning.approvedBy,
        createdAt: earning.createdAt,
        booking: {
          id: earning.booking.id,
          startTime: earning.booking.startTime,
          endTime: earning.booking.endTime,
          status: earning.booking.status,
          seeker: {
            name: `${earning.booking.seeker.profile?.firstName || ''} ${earning.booking.seeker.profile?.lastName || ''}`.trim()
          }
        }
      }))
    });

  } catch (error) {
    console.error('Error fetching provider earnings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings' },
      { status: 500 }
    );
  }
}