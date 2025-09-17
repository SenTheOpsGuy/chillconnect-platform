import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// Get pending bank account deletion requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['EMPLOYEE', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';
    const assignedTo = searchParams.get('assignedTo');

    // Build where clause
    const whereClause: any = { status };
    
    if (session.user.role === 'EMPLOYEE') {
      // Employees can only see requests assigned to them or unassigned pending requests
      if (status === 'PENDING') {
        whereClause.OR = [
          { assignedTo: null },
          { assignedTo: session.user.id }
        ];
      } else {
        whereClause.resolvedBy = session.user.id;
      }
    } else if (assignedTo) {
      whereClause.assignedTo = assignedTo;
    }

    const deleteRequests = await prisma.bankAccountDeleteRequest.findMany({
      where: whereClause,
      include: {
        provider: {
          include: {
            user: {
              include: { profile: true }
            }
          }
        },
        bankAccount: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      deleteRequests: deleteRequests.map(request => ({
        id: request.id,
        reason: request.reason,
        status: request.status,
        createdAt: request.createdAt,
        resolvedAt: request.resolvedAt,
        provider: {
          id: request.provider.id,
          name: `${request.provider.user.profile?.firstName || ''} ${request.provider.user.profile?.lastName || ''}`.trim(),
          email: request.provider.user.email
        },
        bankAccount: {
          id: request.bankAccount.id,
          accountHolderName: request.bankAccount.accountHolderName,
          bankName: request.bankAccount.bankName,
          accountNumber: request.bankAccount.accountNumber.replace(/(.{4})(.*)(.{4})/, '$1****$3'),
          verificationStatus: request.bankAccount.verificationStatus,
          verifiedAt: request.bankAccount.verifiedAt
        }
      }))
    });

  } catch (error) {
    console.error('Error fetching bank account deletion requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deletion requests' },
      { status: 500 }
    );
  }
}