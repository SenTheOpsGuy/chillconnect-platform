import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email/brevo';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is employee or super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user || (user.role !== 'EMPLOYEE' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const unmatchedRequests = await prisma.unmatchedRequest.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 50
    });

    return NextResponse.json({ requests: unmatchedRequests });
  } catch (error) {
    console.error('Get unmatched requests error:', error);
    return NextResponse.json(
      { error: 'Failed to get requests' },
      { status: 500 }
    );
  }
}

const requestActionSchema = z.object({
  requestId: z.string(),
  action: z.enum(['assign_provider', 'reject']),
  providerId: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { requestId, action, providerId } = requestActionSchema.parse(body);

    const request = await prisma.unmatchedRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    if (action === 'reject') {
      // Handle reject action
      await prisma.unmatchedRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          assignedTo: session.user.id,
          resolvedAt: new Date()
        }
      });

      // Notify seeker about rejection
      await sendEmail(
        request.seekerEmail,
        'Request Update',
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Request Status Update</h2>
            <p>We're sorry, but we were unable to find a suitable expert for your ${request.expertise} consultation request at this time.</p>
            <p>Please feel free to submit a new request or browse our available experts directly.</p>
            <p><a href="https://chillconnect.in/search" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Browse Experts</a></p>
          </div>
        `
      );

      return NextResponse.json({ success: true, message: 'Request rejected successfully' });
    }

    if (action === 'assign_provider') {
      if (!providerId) {
        return NextResponse.json(
          { error: 'Provider ID is required for assignment' },
          { status: 400 }
        );
      }

      // Get provider details
      const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        include: { user: { include: { profile: true } } }
      });

      if (!provider) {
        return NextResponse.json(
          { error: 'Provider not found' },
          { status: 404 }
        );
      }

      // Notify seeker about match
      await sendEmail(
        request.seekerEmail,
        'Expert Found!',
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Great news! We found an expert for you</h2>
            <p>We've matched you with ${provider.user.profile?.firstName} ${provider.user.profile?.lastName} for ${request.expertise}.</p>
            <p><strong>Expert Details:</strong></p>
            <ul>
              <li>Experience: ${provider.yearsExperience} years</li>
              <li>Rate: ₹${provider.hourlyRate}/hour</li>
              <li>Rating: ${provider.rating}/5</li>
            </ul>
            <p><a href="https://chillconnect.in/provider/${provider.id}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Book Now</a></p>
          </div>
        `
      );

      // Update request status
      await prisma.unmatchedRequest.update({
        where: { id: requestId },
        data: {
          status: 'resolved',
          assignedTo: session.user.id,
          resolvedAt: new Date()
        }
      });

      return NextResponse.json({ success: true, message: 'Provider assigned successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Assign provider error:', error);
    return NextResponse.json(
      { error: 'Failed to assign provider' },
      { status: 500 }
    );
  }
}