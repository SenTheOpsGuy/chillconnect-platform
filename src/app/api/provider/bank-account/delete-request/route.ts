import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const deleteRequestSchema = z.object({
  reason: z.string().min(10).max(500).optional()
});

// Create bank account deletion request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reason } = deleteRequestSchema.parse(body);

    // Get provider's bank account
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
      include: { 
        bankAccount: {
          include: {
            deleteRequests: {
              where: { status: 'PENDING' }
            }
          }
        }
      }
    });

    if (!provider?.bankAccount) {
      return NextResponse.json({ 
        error: 'No bank account found to delete' 
      }, { status: 404 });
    }

    // Check if there's already a pending delete request
    if (provider.bankAccount.deleteRequests.length > 0) {
      return NextResponse.json({ 
        error: 'Delete request already pending' 
      }, { status: 400 });
    }

    // Create delete request
    const deleteRequest = await prisma.bankAccountDeleteRequest.create({
      data: {
        bankAccountId: provider.bankAccount.id,
        providerId: provider.id,
        reason: reason || 'Provider requested account deletion'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Delete request submitted successfully. An admin will review it shortly.',
      deleteRequest: {
        id: deleteRequest.id,
        status: deleteRequest.status,
        createdAt: deleteRequest.createdAt
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating delete request:', error);
    return NextResponse.json(
      { error: 'Failed to create delete request' },
      { status: 500 }
    );
  }
}

// Get delete request status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get provider's delete requests
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
      include: { 
        deleteRequests: {
          orderBy: { createdAt: 'desc' },
          take: 5 // Last 5 requests
        }
      }
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({
      deleteRequests: provider.deleteRequests.map(req => ({
        id: req.id,
        reason: req.reason,
        status: req.status,
        createdAt: req.createdAt,
        resolvedAt: req.resolvedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching delete requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delete requests' },
      { status: 500 }
    );
  }
}