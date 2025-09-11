import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/config';
import pusher from '@/lib/pusher/server';
import { z } from 'zod';

const sendMessageSchema = z.object({
  bookingId: z.string(),
  content: z.string().min(1).max(1000)
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { bookingId, content } = sendMessageSchema.parse(body);

    // Get booking with session info
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { session: true }
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if user is part of this booking
    if (booking.seekerId !== session.user.id && booking.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if chat is enabled and not expired
    if (!booking.session?.chatExpiresAt) {
      return NextResponse.json(
        { error: 'Chat not available' },
        { status: 400 }
      );
    }

    if (new Date() > booking.session.chatExpiresAt) {
      return NextResponse.json(
        { error: 'Chat has expired' },
        { status: 400 }
      );
    }

    // Determine receiver
    const receiverId = booking.seekerId === session.user.id 
      ? booking.providerId 
      : booking.seekerId;

    // Create message
    const message = await prisma.message.create({
      data: {
        bookingId,
        senderId: session.user.id,
        receiverId,
        content
      },
      include: {
        sender: {
          include: { profile: true }
        }
      }
    });

    // Send real-time notification via Pusher
    try {
      await pusher.trigger(`booking-${bookingId}`, 'new-message', {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        receiverId: message.receiverId,
        createdAt: message.createdAt,
        senderName: `${message.sender.profile?.firstName || ''} ${message.sender.profile?.lastName || ''}`.trim() || 'User'
      });
    } catch (pusherError) {
      console.error('Pusher error:', pusherError);
      // Don't fail the request if Pusher fails
    }

    return NextResponse.json({
      messageId: message.id,
      createdAt: message.createdAt
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}