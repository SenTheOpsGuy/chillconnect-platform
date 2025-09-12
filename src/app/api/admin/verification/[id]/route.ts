import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const verificationSchema = z.object({
  action: z.enum(['approve', 'reject'])
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = verificationSchema.parse(body);
    const { id: providerId } = await params;

    // Check if provider exists and is pending
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        user: {
          include: { profile: true }
        }
      }
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    if (provider.verificationStatus !== 'PENDING') {
      return NextResponse.json(
        { error: 'Provider verification is not pending' },
        { status: 400 }
      );
    }

    // Update verification status
    const newStatus = action === 'approve' ? 'VERIFIED' : 'REJECTED';
    
    await prisma.provider.update({
      where: { id: providerId },
      data: { verificationStatus: newStatus }
    });

    // Log the action
    console.log(`Provider verification ${action}d:`, {
      providerId,
      userId: provider.userId,
      email: provider.user.email,
      name: `${provider.user.profile?.firstName} ${provider.user.profile?.lastName}`,
      adminId: session.user.id
    });

    // In a real application, you would:
    // 1. Send email notification to the provider
    // 2. Create a notification record
    // 3. Log the admin action for audit purposes

    return NextResponse.json({
      message: `Provider verification ${action}d successfully`,
      providerId,
      newStatus
    });
  } catch (error) {
    console.error('Verification update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid action specified' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update verification status' },
      { status: 500 }
    );
  }
}