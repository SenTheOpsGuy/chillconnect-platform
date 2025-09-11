import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email/brevo';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const communicateSchema = z.object({
  message: z.string().min(1),
  isInternal: z.boolean().default(false),
  toUserId: z.string().optional()
});

interface RouteParams {
  disputeId: string;
}

export async function POST(req: NextRequest, { params }: { params: RouteParams }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { disputeId } = params;
    const body = await req.json();
    const { message, isInternal, toUserId } = communicateSchema.parse(body);

    // Find the dispute using the new dispute system
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
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
        }
      }
    });

    if (!dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this dispute
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    const hasAccess = dispute.booking.seekerId === session.user.id || 
                     dispute.booking.providerId === session.user.id ||
                     (user?.role === 'EMPLOYEE' || user?.role === 'SUPER_ADMIN');

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Determine recipient
    let recipientId = toUserId;
    if (!recipientId && !isInternal) {
      // Auto-determine recipient (the other party in the booking)
      recipientId = dispute.booking.seekerId === session.user.id ? dispute.booking.providerId : dispute.booking.seekerId;
    }

    // Create message
    if (recipientId && !isInternal) {
      await prisma.message.create({
        data: {
          bookingId: dispute.booking.id,
          senderId: session.user.id,
          receiverId: recipientId,
          content: message
        }
      });

      // Send email notification
      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
        include: { profile: true }
      });

      const sender = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { profile: true }
      });

      if (recipient && sender) {
        await sendEmail(
          recipient.email,
          'New Message in Dispute',
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>New Message in Your Dispute</h2>
              <p>Dear ${recipient.profile?.firstName},</p>
              <p>You have received a new message from ${sender.profile?.firstName} ${sender.profile?.lastName} regarding your dispute.</p>
              <div style="background: #f9f9f9; padding: 15px; margin: 15px 0; border-left: 4px solid #2563eb;">
                <p><strong>Message:</strong></p>
                <p>${message}</p>
              </div>
              <p><a href="https://chillconnect.in/disputes" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Dispute</a></p>
            </div>
          `
        );
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Message sent successfully' 
    });
  } catch (error) {
    console.error('Dispute communication error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: RouteParams }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { disputeId } = params;

    // Find the dispute first to get the booking ID
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId }
    });

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // Get messages for the dispute
    const messages = await prisma.message.findMany({
      where: { bookingId: dispute.bookingId },
      include: {
        sender: {
          include: { profile: true }
        },
        receiver: {
          include: { profile: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Get dispute messages error:', error);
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
}