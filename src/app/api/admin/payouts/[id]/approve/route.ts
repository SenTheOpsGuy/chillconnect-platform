import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { processProviderPayout } from '@/lib/payments/cashfree-payouts';
import { z } from 'zod';

const approvalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().min(1).max(500).optional(),
  rejectionReason: z.string().min(1).max(500).optional(),
  transactionFee: z.number().min(0).max(100).optional() // Platform fee in rupees
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['EMPLOYEE', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, notes, rejectionReason, transactionFee } = approvalSchema.parse(body);

    // Get payout with details
    const payout = await prisma.payout.findUnique({
      where: { id },
      include: {
        provider: {
          include: {
            user: { include: { profile: true } }
          }
        },
        bankAccount: true,
        logs: true
      }
    });

    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }

    if (payout.status !== 'REQUESTED') {
      return NextResponse.json({ 
        error: 'Payout is not in a state that can be approved/rejected' 
      }, { status: 400 });
    }

    if (action === 'reject') {
      if (!rejectionReason) {
        return NextResponse.json({ 
          error: 'Rejection reason is required' 
        }, { status: 400 });
      }

      // Reject payout and restore earnings
      await prisma.$transaction(async (tx) => {
        // Update payout status
        await tx.payout.update({
          where: { id },
          data: {
            status: 'REJECTED',
            rejectedAt: new Date(),
            rejectionReason,
            notes
          }
        });

        // Restore earnings status to APPROVED (make them available again)
        const payoutEarnings = await tx.payoutEarning.findMany({
          where: { payoutId: id }
        });

        await tx.providerEarnings.updateMany({
          where: { 
            id: { in: payoutEarnings.map(pe => pe.earningId) }
          },
          data: { status: 'APPROVED' }
        });

        // Create log
        await tx.payoutLog.create({
          data: {
            payoutId: id,
            action: 'REJECTED',
            details: `Payout rejected by ${session.user.role.toLowerCase()}: ${rejectionReason}`,
            performedBy: session.user.id
          }
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Payout rejected successfully',
        payout: {
          id,
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason
        }
      });
    }

    // Approve payout
    const actualAmount = payout.requestedAmount - (transactionFee || 0);

    if (actualAmount <= 0) {
      return NextResponse.json({ 
        error: 'Transaction fee cannot be greater than requested amount' 
      }, { status: 400 });
    }

    // Update payout to approved status first
    await prisma.$transaction(async (tx) => {
      await tx.payout.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: session.user.id,
          actualAmount,
          transactionFee: transactionFee || 0,
          notes
        }
      });

      // Create approval log
      await tx.payoutLog.create({
        data: {
          payoutId: id,
          action: 'APPROVED',
          details: `Payout approved by ${session.user.role.toLowerCase()}. Amount: ₹${actualAmount} (Fee: ₹${transactionFee || 0})`,
          performedBy: session.user.id
        }
      });
    });

    // Process actual payout via Cashfree
    const transferId = `payout_${id}_${Date.now()}`;
    const payoutResult = await processProviderPayout(
      transferId,
      actualAmount,
      {
        accountHolderName: payout.bankAccount.accountHolderName,
        accountNumber: payout.bankAccount.accountNumber,
        ifscCode: payout.bankAccount.ifscCode,
        bankName: payout.bankAccount.bankName
      },
      payout.providerId
    );

    // Update payout with Cashfree response
    await prisma.$transaction(async (tx) => {
      if (payoutResult.success) {
        await tx.payout.update({
          where: { id },
          data: {
            status: 'PROCESSING',
            cashfreeTransferId: payoutResult.transferId,
            cashfreeResponse: payoutResult.fullResponse
          }
        });

        await tx.payoutLog.create({
          data: {
            payoutId: id,
            action: 'PROCESSING',
            details: `Payout sent to Cashfree. Transfer ID: ${payoutResult.transferId}`,
            performedBy: 'SYSTEM',
            metadata: payoutResult
          }
        });
      } else {
        await tx.payout.update({
          where: { id },
          data: {
            status: 'FAILED',
            notes: (notes || '') + ` | Cashfree Error: ${payoutResult.error}`
          }
        });

        await tx.payoutLog.create({
          data: {
            payoutId: id,
            action: 'FAILED',
            details: `Cashfree payout failed: ${payoutResult.error}`,
            performedBy: 'SYSTEM',
            metadata: payoutResult
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: payoutResult.success 
        ? 'Payout approved and processing via Cashfree'
        : 'Payout approved but Cashfree processing failed',
      payout: {
        id,
        status: payoutResult.success ? 'PROCESSING' : 'FAILED',
        actualAmount,
        cashfreeTransferId: payoutResult.success ? payoutResult.transferId : null,
        error: payoutResult.success ? null : payoutResult.error
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid approval data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error processing payout approval:', error);
    return NextResponse.json(
      { error: 'Failed to process payout approval' },
      { status: 500 }
    );
  }
}