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

    if (session.user.role !== 'EMPLOYEE' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    // Get all providers with their verification data
    const whereCondition: Record<string, any> = {};
    
    if (status && status !== 'all') {
      whereCondition.verificationStatus = status.toUpperCase();
    }

    const providers = await prisma.provider.findMany({
      where: whereCondition,
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    });

    // Transform the data to match the verification interface
    const verifications = providers.map((provider: any) => {
      const submittedAt = new Date(); // Use current date as fallback
      const timeDiff = Date.now() - submittedAt.getTime();
      const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
      
      // Determine priority based on submission time and status
      let priority = 'LOW';
      if (provider.verificationStatus === 'PENDING' && hoursAgo < 24) {
        priority = 'HIGH';
      } else if (provider.verificationStatus === 'PENDING' && hoursAgo < 72) {
        priority = 'MEDIUM';
      }

      return {
        id: provider.id,
        providerId: provider.userId,
        provider: {
          name: `${provider.user?.profile?.firstName || ''} ${provider.user?.profile?.lastName || ''}`.trim(),
          email: provider.user?.email || '',
          profile: {
            firstName: provider.user?.profile?.firstName || '',
            lastName: provider.user?.profile?.lastName || '',
            bio: provider.bio || 'No bio provided'
          }
        },
        documentType: provider.certificates.length > 0 ? 'PROFESSIONAL' : 'IDENTITY',
        documentUrl: provider.certificates[0] || provider.governmentId || '/documents/pending.pdf',
        status: provider.verificationStatus,
        submittedAt: submittedAt.toISOString(),
        reviewedAt: provider.verificationStatus !== 'PENDING' ? submittedAt.toISOString() : null,
        reviewedBy: provider.verificationStatus !== 'PENDING' ? session.user.email : null,
        comments: getVerificationComments(provider.verificationStatus),
        priority,
        expertise: provider.expertise,
        yearsExperience: provider.yearsExperience,
        hourlyRate: provider.hourlyRate
      };
    });

    // Filter by type if specified
    const filteredVerifications = type && type !== 'all' 
      ? verifications.filter(v => v.documentType === type.toUpperCase())
      : verifications;

    return NextResponse.json({ verifications: filteredVerifications });
  } catch (error) {
    console.error('Verifications fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'EMPLOYEE' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { verificationId, status, comments } = body;

    if (!verificationId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get provider details for logging
    const provider = await prisma.provider.findUnique({
      where: { id: verificationId },
      include: {
        user: {
          include: { profile: true }
        }
      }
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Update provider verification status
    const updatedProvider = await prisma.provider.update({
      where: { id: verificationId },
      data: {
        verificationStatus: status.toUpperCase()
      }
    });

    // Log verification action
    console.log(`Verification ${status.toLowerCase()} for provider:`, {
      providerId: verificationId,
      providerEmail: provider.user.email,
      providerName: `${provider.user.profile?.firstName || ''} ${provider.user.profile?.lastName || ''}`.trim(),
      status: status.toUpperCase(),
      comments: comments || 'No comments provided',
      reviewedBy: session.user.email,
      reviewedAt: new Date().toISOString()
    });

    // In a production environment, you would send an email notification here
    // await sendVerificationStatusEmail(provider.user.email, status, comments);

    return NextResponse.json({ 
      message: 'Verification status updated successfully',
      provider: updatedProvider
    });
  } catch (error) {
    console.error('Verification update error:', error);
    return NextResponse.json(
      { error: 'Failed to update verification' },
      { status: 500 }
    );
  }
}

function getVerificationComments(status: string): string {
  switch (status) {
    case 'VERIFIED':
      return 'All documents verified successfully';
    case 'REJECTED':
      return 'Documents require clarification or resubmission';
    case 'REQUIRES_REVIEW':
      return 'Additional review requested';
    case 'PENDING':
      return 'Verification in progress';
    default:
      return 'Under review';
  }
}