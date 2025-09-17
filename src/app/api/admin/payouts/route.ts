import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// Get pending payouts for admin/employee review
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['EMPLOYEE', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'REQUESTED';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // For employees, they can only see payouts they've approved (in history)
    // For new requests, all employees can see them
    const whereClause: any = {
      status: status
    };

    if (session.user.role === 'EMPLOYEE' && status !== 'REQUESTED') {
      whereClause.approvedBy = session.user.id;
    }

    const [payouts, totalCount] = await Promise.all([
      prisma.payout.findMany({
        where: whereClause,
        include: {
          provider: {
            include: {
              user: {
                include: { profile: true }
              }
            }
          },
          bankAccount: true,
          earnings: {
            include: {
              earning: {
                include: {
                  booking: {
                    include: {
                      seeker: {
                        include: { profile: true }
                      }
                    }
                  }
                }
              }
            }
          },
          logs: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        },
        orderBy: { requestedAt: 'desc' },
        skip: offset,
        take: limit
      }),
      
      prisma.payout.count({ where: whereClause })
    ]);

    return NextResponse.json({
      payouts: payouts.map(payout => ({
        id: payout.id,
        requestedAmount: payout.requestedAmount,
        actualAmount: payout.actualAmount,
        status: payout.status,
        requestedAt: payout.requestedAt,
        approvedAt: payout.approvedAt,
        processedAt: payout.processedAt,
        rejectedAt: payout.rejectedAt,
        rejectionReason: payout.rejectionReason,
        transactionFee: payout.transactionFee,
        notes: payout.notes,
        provider: {
          id: payout.provider.id,
          name: `${payout.provider.user.profile?.firstName || ''} ${payout.provider.user.profile?.lastName || ''}`.trim(),
          email: payout.provider.user.email,
          totalSessions: payout.provider.totalSessions,
          rating: payout.provider.rating
        },
        bankAccount: {
          accountHolderName: payout.bankAccount.accountHolderName,
          bankName: payout.bankAccount.bankName,
          ifscCode: payout.bankAccount.ifscCode,
          accountNumber: payout.bankAccount.accountNumber,
          verificationStatus: payout.bankAccount.verificationStatus,
          verifiedAt: payout.bankAccount.verifiedAt
        },
        earningsCount: payout.earnings.length,
        earningsDetails: payout.earnings.map(pe => ({
          amount: pe.amount,
          bookingId: pe.earning.bookingId,
          bookingDate: pe.earning.booking.startTime,
          seekerName: `${pe.earning.booking.seeker.profile?.firstName || ''} ${pe.earning.booking.seeker.profile?.lastName || ''}`.trim()
        })),
        recentLogs: payout.logs.map(log => ({
          action: log.action,
          details: log.details,
          performedBy: log.performedBy,
          createdAt: log.createdAt
        }))
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}