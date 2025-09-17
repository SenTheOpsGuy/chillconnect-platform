import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const resolveSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(500).optional()
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
    const { action, notes } = resolveSchema.parse(body);

    // Get deletion request
    const deleteRequest = await prisma.bankAccountDeleteRequest.findUnique({
      where: { id },
      include: {
        bankAccount: true,
        provider: {
          include: {
            payouts: {
              where: {
                status: { in: ['REQUESTED', 'PENDING', 'APPROVED', 'PROCESSING'] }
              }
            }
          }
        }
      }
    });

    if (!deleteRequest) {
      return NextResponse.json({ error: 'Delete request not found' }, { status: 404 });
    }

    if (deleteRequest.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Delete request already resolved' 
      }, { status: 400 });
    }

    // Check if provider has pending payouts
    if (action === 'approve' && deleteRequest.provider.payouts.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete bank account with pending payouts. Please process or reject pending payouts first.' 
      }, { status: 400 });
    }

    // Resolve the request
    await prisma.$transaction(async (tx) => {
      // Update delete request
      await tx.bankAccountDeleteRequest.update({
        where: { id },
        data: {
          status: action === 'approve' ? 'APPROVED' : 'REJECTED',
          resolvedAt: new Date(),
          resolvedBy: session.user.id,
          assignedTo: session.user.id // Assign to resolver if not already assigned
        }
      });

      // If approved, mark bank account as deleted
      if (action === 'approve') {
        await tx.providerBankAccount.update({
          where: { id: deleteRequest.bankAccountId },
          data: {
            verificationStatus: 'DELETED',
            isActive: false
          }
        });
      }
    });

    const message = action === 'approve' 
      ? 'Bank account deletion approved and account marked as deleted'
      : 'Bank account deletion request rejected';

    return NextResponse.json({
      success: true,
      message,
      deleteRequest: {
        id,
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        resolvedAt: new Date(),
        resolvedBy: session.user.id
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error resolving bank account deletion request:', error);
    return NextResponse.json(
      { error: 'Failed to resolve deletion request' },
      { status: 500 }
    );
  }
}