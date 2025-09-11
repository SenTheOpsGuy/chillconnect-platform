import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/config';

export async function GET(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.bookingId },
      include: { 
        session: true,
        messages: {
          include: {
            sender: {
              include: { profile: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
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

    // Check if chat is available
    const chatAvailable = booking.session?.chatExpiresAt && 
      new Date() <= booking.session.chatExpiresAt;

    return NextResponse.json({
      messages: booking.messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt,
        senderName: msg.sender.profile 
          ? `${msg.sender.profile.firstName} ${msg.sender.profile.lastName}`
          : 'Unknown',
        isOwn: msg.senderId === session.user.id
      })),
      chatAvailable,
      expiresAt: booking.session?.chatExpiresAt
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
}