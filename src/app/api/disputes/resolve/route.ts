import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email/brevo';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const resolveDisputeSchema = z.object({
  disputeId: z.string(),
  resolution: z.enum(['REFUND_SEEKER', 'FAVOR_PROVIDER', 'PARTIAL_REFUND']),
  notes: z.string().optional(),
  amount: z.number().optional() // for partial refunds
});

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { disputeId, resolution, notes, amount } = resolveDisputeSchema.parse(body);

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        booking: {
          include: {
            seeker: {
              include: {
                profile: true
              }
            },
            provider: {
              include: {
                profile: true
              }
            }
          }
        }
      }
    });

    if (!dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }

    if (dispute.status === 'RESOLVED') {
      return NextResponse.json(
        { error: 'Dispute is already resolved' },
        { status: 400 }
      );
    }

    // Update booking status based on resolution
    const newStatus = resolution === 'REFUND_SEEKER' ? 'CANCELLED' : 
                      resolution === 'FAVOR_PROVIDER' ? 'COMPLETED' : 
                      'COMPLETED'; // PARTIAL_REFUND still marks as completed
    
    // Update booking status
    await prisma.booking.update({
      where: { id: dispute.bookingId },
      data: {
        status: newStatus
      }
    });

    // Mark dispute as resolved
    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'RESOLVED'
      }
    });

    // Create dispute resolution record
    await prisma.disputeResolutionRecord.create({
      data: {
        disputeId,
        resolvedBy: session.user.id,
        resolution,
        amount: amount || dispute.booking.amount,
        notes: notes || ''
      }
    });

    // Send notification emails
    const seekerName = `${dispute.booking.seeker.profile?.firstName} ${dispute.booking.seeker.profile?.lastName}`;
    const providerName = `${dispute.booking.provider.profile?.firstName} ${dispute.booking.provider.profile?.lastName}`;

    if (resolution === 'REFUND_SEEKER' || resolution === 'PARTIAL_REFUND') {
      // Notify seeker about refund
      await sendEmail(
        dispute.booking.seeker.email,
        'Dispute Resolved - Refund Issued',
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Dispute Resolution Update</h2>
            <p>Dear ${seekerName},</p>
            <p>Your dispute for the consultation with ${providerName} has been resolved in your favor.</p>
            <p><strong>Resolution:</strong> ${resolution === 'REFUND_SEEKER' ? 'Full' : 'Partial'} refund of ₹${amount || dispute.booking.amount} has been processed.</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            <p>The refund will be processed within 3-5 business days.</p>
            <p>Thank you for your patience.</p>
          </div>
        `
      );

      // Notify provider about dispute resolution
      await sendEmail(
        dispute.booking.provider.email,
        'Dispute Resolution Update',
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Dispute Resolution Update</h2>
            <p>Dear ${providerName},</p>
            <p>The dispute for your consultation with ${seekerName} has been resolved.</p>
            <p><strong>Resolution:</strong> ${resolution === 'REFUND_SEEKER' ? 'Full' : 'Partial'} refund of ₹${amount || dispute.booking.amount} issued to seeker.</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            <p>No payment will be processed for this session.</p>
          </div>
        `
      );
    } else {
      // Notify provider about favorable resolution
      await sendEmail(
        dispute.booking.provider.email,
        'Dispute Resolved - Payment Confirmed',
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Dispute Resolution Update</h2>
            <p>Dear ${providerName},</p>
            <p>Your dispute for the consultation with ${seekerName} has been resolved in your favor.</p>
            <p><strong>Resolution:</strong> Payment of ₹${dispute.booking.amount} confirmed.</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            <p>Your payment will be processed as scheduled.</p>
          </div>
        `
      );

      // Notify seeker about dispute resolution
      await sendEmail(
        dispute.booking.seeker.email,
        'Dispute Resolution Update',
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Dispute Resolution Update</h2>
            <p>Dear ${seekerName},</p>
            <p>Your dispute for the consultation with ${providerName} has been resolved.</p>
            <p><strong>Resolution:</strong> Payment to provider confirmed.</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            <p>Thank you for using our platform.</p>
          </div>
        `
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Dispute resolved successfully' 
    });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve dispute' },
      { status: 500 }
    );
  }
}