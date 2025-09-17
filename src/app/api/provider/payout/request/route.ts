import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const payoutRequestSchema = z.object({
  amount: z.number().min(1000, 'Minimum payout amount is ₹1000').max(100000, 'Maximum payout amount is ₹100,000')
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount } = payoutRequestSchema.parse(body);

    // Get provider with bank account
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
      include: { 
        bankAccount: true,
        payouts: {
          where: { 
            status: { in: ['REQUESTED', 'PENDING', 'APPROVED', 'PROCESSING'] }
          }
        }
      }
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Check if bank account is verified
    if (!provider.bankAccount || !provider.bankAccount.isActive || provider.bankAccount.verificationStatus !== 'VERIFIED') {
      return NextResponse.json({ 
        error: 'Please verify your bank account first to request payouts' 
      }, { status: 400 });
    }

    // Check for pending payouts
    if (provider.payouts.length > 0) {
      return NextResponse.json({ 
        error: 'You already have a pending payout request. Please wait for it to be processed.' 
      }, { status: 400 });
    }

    // Get available earnings
    const availableEarnings = await prisma.providerEarnings.findMany({
      where: { 
        providerId: provider.id,
        status: 'APPROVED'
      },
      orderBy: { createdAt: 'asc' } // FIFO
    });

    const totalAvailable = availableEarnings.reduce((sum, earning) => sum + earning.amount, 0);

    if (totalAvailable < amount) {
      return NextResponse.json({ 
        error: `Insufficient balance. Available: ₹${totalAvailable.toFixed(2)}` 
      }, { status: 400 });
    }

    // Create payout request within transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payout
      const payout = await tx.payout.create({
        data: {
          providerId: provider.id,
          bankAccountId: provider.bankAccount!.id,
          requestedAmount: amount,
          status: 'REQUESTED'
        }
      });

      // Select earnings to include in payout (FIFO)
      let remainingAmount = amount;
      const selectedEarnings = [];

      for (const earning of availableEarnings) {
        if (remainingAmount <= 0) break;
        
        const earningAmount = Math.min(earning.amount, remainingAmount);
        selectedEarnings.push({
          earningId: earning.id,
          amount: earningAmount
        });
        
        remainingAmount -= earningAmount;
      }

      // Create payout-earnings relationships
      await tx.payoutEarning.createMany({
        data: selectedEarnings.map(se => ({
          payoutId: payout.id,
          earningId: se.earningId,
          amount: se.amount
        }))
      });

      // Mark earnings as paid out
      await tx.providerEarnings.updateMany({
        where: { 
          id: { in: selectedEarnings.map(se => se.earningId) }
        },
        data: { status: 'PAID_OUT' }
      });

      // Create payout log
      await tx.payoutLog.create({
        data: {
          payoutId: payout.id,
          action: 'REQUESTED',
          details: `Provider requested payout of ₹${amount}`,
          performedBy: session.user.id
        }
      });

      return payout;
    });

    return NextResponse.json({
      success: true,
      message: 'Payout request submitted successfully. It will be reviewed by our team.',
      payout: {
        id: result.id,
        amount: result.requestedAmount,
        status: result.status,
        requestedAt: result.requestedAt
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid payout amount', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating payout request:', error);
    return NextResponse.json(
      { error: 'Failed to create payout request' },
      { status: 500 }
    );
  }
}

// Get payout history
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

    // Get payout history
    const payouts = await prisma.payout.findMany({
      where: { providerId: provider.id },
      include: {
        bankAccount: {
          select: {
            accountHolderName: true,
            bankName: true,
            accountNumber: true
          }
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { requestedAt: 'desc' },
      take: 20
    });

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
        bankAccount: {
          accountHolderName: payout.bankAccount.accountHolderName,
          bankName: payout.bankAccount.bankName,
          accountNumber: payout.bankAccount.accountNumber.replace(/(.{4})(.*)(.{4})/, '$1****$3')
        },
        recentLogs: payout.logs.map(log => ({
          action: log.action,
          details: log.details,
          createdAt: log.createdAt
        }))
      }))
    });

  } catch (error) {
    console.error('Error fetching payout history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payout history' },
      { status: 500 }
    );
  }
}