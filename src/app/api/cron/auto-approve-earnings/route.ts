import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Auto-approve earnings after 24-hour dispute period
export async function POST(request: NextRequest) {
  try {
    // Verify this is called by a cron job or authorized system
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    
    // Find earnings that are past their dispute deadline and still pending
    const pendingEarnings = await prisma.providerEarnings.findMany({
      where: {
        status: 'PENDING',
        disputeDeadline: {
          lt: now // Dispute deadline has passed
        }
      },
      include: {
        booking: {
          include: {
            dispute: true
          }
        }
      }
    });

    const approvedCount = {
      total: 0,
      amount: 0
    };

    for (const earning of pendingEarnings) {
      // Check if there's an active dispute
      const hasActiveDispute = earning.booking.dispute && 
        ['OPEN', 'IN_PROGRESS'].includes(earning.booking.dispute.status);

      if (!hasActiveDispute) {
        // Auto-approve the earning
        await prisma.providerEarnings.update({
          where: { id: earning.id },
          data: {
            status: 'APPROVED',
            approvedAt: now,
            approvedBy: 'AUTO'
          }
        });

        approvedCount.total++;
        approvedCount.amount += earning.amount;

        console.log(`Auto-approved earning ${earning.id} for ₹${earning.amount}`);
      } else {
        // Keep as disputed
        await prisma.providerEarnings.update({
          where: { id: earning.id },
          data: {
            status: 'DISPUTED'
          }
        });

        console.log(`Earning ${earning.id} marked as disputed due to active dispute`);
      }
    }

    console.log(`Auto-approval completed: ${approvedCount.total} earnings totaling ₹${approvedCount.amount}`);

    return NextResponse.json({
      success: true,
      processed: pendingEarnings.length,
      approved: approvedCount.total,
      totalAmount: approvedCount.amount,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Auto-approval cron job error:', error);
    return NextResponse.json(
      { error: 'Auto-approval failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Manual trigger for testing (admin only)
export async function GET() {
  try {
    // Just return stats without approving
    const now = new Date();
    
    const [pendingCount, readyForApproval] = await Promise.all([
      prisma.providerEarnings.count({
        where: { status: 'PENDING' }
      }),
      
      prisma.providerEarnings.count({
        where: {
          status: 'PENDING',
          disputeDeadline: { lt: now }
        }
      })
    ]);

    return NextResponse.json({
      pendingEarnings: pendingCount,
      readyForAutoApproval: readyForApproval,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Auto-approval stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get auto-approval stats' },
      { status: 500 }
    );
  }
}