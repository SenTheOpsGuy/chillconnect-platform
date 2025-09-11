import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email/brevo';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const createDisputeSchema = z.object({
  bookingId: z.string(),
  reason: z.string(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { bookingId, reason, description, priority } = createDisputeSchema.parse(body);

    // Check if booking exists and user is part of it
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        seeker: {
          include: { profile: true }
        },
        provider: {
          include: { profile: true }
        }
      }
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify user is either seeker or provider
    if (booking.seekerId !== session.user.id && booking.providerId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only create disputes for your own bookings' },
        { status: 403 }
      );
    }

    // Check if dispute already exists for this booking
    const existingDispute = await prisma.dispute.findUnique({
      where: { bookingId }
    });

    if (existingDispute) {
      return NextResponse.json(
        { error: 'Dispute already exists for this booking' },
        { status: 400 }
      );
    }

    // Create dispute
    const dispute = await prisma.dispute.create({
      data: {
        bookingId,
        initiatedBy: session.user.id,
        reason,
        description,
        priority,
        status: 'OPEN'
      },
      include: {
        booking: {
          include: {
            seeker: { include: { profile: true } },
            provider: { include: { profile: true } }
          }
        },
        initiator: {
          include: { profile: true }
        }
      }
    });

    // Update booking status to disputed
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'DISPUTED' }
    });

    // Send notification emails
    const initiatorName = `${dispute.initiator.profile?.firstName} ${dispute.initiator.profile?.lastName}`;
    const seekerName = `${dispute.booking.seeker.profile?.firstName} ${dispute.booking.seeker.profile?.lastName}`;
    const providerName = `${dispute.booking.provider.profile?.firstName} ${dispute.booking.provider.profile?.lastName}`;
    
    const isInitiatorSeeker = dispute.initiatedBy === booking.seekerId;
    const otherPartyEmail = isInitiatorSeeker ? booking.provider.email : booking.seeker.email;
    const otherPartyName = isInitiatorSeeker ? providerName : seekerName;

    // Notify the other party
    await sendEmail(
      otherPartyEmail,
      'Dispute Opened for Your Booking',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Dispute Notification</h2>
          <p>Dear ${otherPartyName},</p>
          <p>A dispute has been opened for your booking with ${initiatorName}.</p>
          <p><strong>Booking Details:</strong></p>
          <ul>
            <li>Date: ${new Date(booking.startTime).toLocaleDateString()}</li>
            <li>Amount: ₹${booking.amount}</li>
            <li>Reason: ${reason}</li>
          </ul>
          ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
          <p>Our support team will review this dispute and contact both parties for resolution.</p>
          <p>You can provide additional information or respond to this dispute by logging into your dashboard.</p>
        </div>
      `
    );

    // Notify all employees about the new dispute
    const employees = await prisma.user.findMany({
      where: { role: { in: ['EMPLOYEE', 'SUPER_ADMIN'] } }
    });

    for (const employee of employees) {
      await sendEmail(
        employee.email,
        `New ${priority.toUpperCase()} Priority Dispute Created`,
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Dispute Requires Attention</h2>
            <p><strong>Priority:</strong> ${priority.toUpperCase()}</p>
            <p><strong>Dispute ID:</strong> ${dispute.id}</p>
            <p><strong>Booking:</strong> ${seekerName} ↔ ${providerName}</p>
            <p><strong>Amount:</strong> ₹${booking.amount}</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p><strong>Initiated By:</strong> ${initiatorName}</p>
            <p><a href="https://chillconnect.in/disputes" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Review Dispute</a></p>
          </div>
        `
      );
    }

    return NextResponse.json({ 
      success: true, 
      dispute: {
        id: dispute.id,
        status: dispute.status,
        reason: dispute.reason
      }
    });
  } catch (error) {
    console.error('Create dispute error:', error);
    return NextResponse.json(
      { error: 'Failed to create dispute' },
      { status: 500 }
    );
  }
}