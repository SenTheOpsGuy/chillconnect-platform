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

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const issues = [];

    // Get pending provider verifications
    const pendingVerifications = await prisma.provider.findMany({
      where: { verificationStatus: 'PENDING' },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      },
      orderBy: { user: { createdAt: 'desc' } }
    });

    // Convert verifications to issues
    for (const provider of pendingVerifications) {
      issues.push({
        id: `verification_${provider.id}`,
        type: 'verification',
        title: `Provider Verification Pending`,
        description: `${provider.user.profile?.firstName} ${provider.user.profile?.lastName} has submitted their provider profile and is waiting for verification.`,
        severity: 'medium',
        createdAt: provider.user.createdAt,
        data: {
          id: provider.id,
          userId: provider.userId,
          email: provider.user.email,
          firstName: provider.user.profile?.firstName,
          lastName: provider.user.profile?.lastName,
          expertise: provider.expertise,
          yearsExperience: provider.yearsExperience,
          hourlyRate: provider.hourlyRate,
          bio: provider.bio,
          verificationStatus: provider.verificationStatus,
          governmentId: provider.governmentId,
          certificates: provider.certificates
        }
      });
    }

    // Get disputed bookings
    const disputedBookings = await prisma.dispute.findMany({
      where: { 
        status: { in: ['OPEN', 'UNDER_REVIEW'] }
      },
      include: {
        booking: {
          include: {
            seeker: {
              include: { profile: true }
            },
            provider: {
              include: { profile: true }
            }
          }
        },
        initiator: {
          include: { profile: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Convert disputes to issues
    for (const dispute of disputedBookings) {
      const severity = dispute.priority === 'high' ? 'high' : 
                      dispute.priority === 'medium' ? 'medium' : 'low';
      
      issues.push({
        id: `dispute_${dispute.id}`,
        type: 'dispute',
        title: `Booking Dispute - ${dispute.reason}`,
        description: `A dispute has been raised for booking ${dispute.bookingId}. Initiated by ${dispute.initiator.profile?.firstName} ${dispute.initiator.profile?.lastName}.`,
        severity,
        createdAt: dispute.createdAt,
        data: {
          id: dispute.id,
          bookingId: dispute.bookingId,
          reason: dispute.reason,
          description: dispute.description,
          status: dispute.status,
          priority: dispute.priority,
          initiatorName: `${dispute.initiator.profile?.firstName} ${dispute.initiator.profile?.lastName}`,
          seekerName: `${dispute.booking.seeker.profile?.firstName} ${dispute.booking.seeker.profile?.lastName}`,
          providerName: `${dispute.booking.provider.profile?.firstName} ${dispute.booking.provider.profile?.lastName}`,
          bookingAmount: dispute.booking.amount
        }
      });
    }

    // Sort issues by creation date (newest first)
    issues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ issues });
  } catch (error) {
    console.error('Admin issues fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system issues' },
      { status: 500 }
    );
  }
}