import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all bookings where the user is involved and has messages
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { seekerId: session.user.id },
          { providerId: session.user.id }
        ],
        messages: {
          some: {} // Only bookings that have messages
        }
      },
      include: {
        seeker: {
          include: { profile: true }
        },
        provider: {
          include: { profile: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1 // Get the latest message for preview
        }
      },
      orderBy: {
        messages: {
          _count: 'desc' // Order by conversation activity
        }
      }
    });

    const conversations = bookings.map(booking => {
      const isProvider = booking.providerId === session.user.id;
      const otherUser = isProvider ? booking.seeker : booking.provider;
      const latestMessage = booking.messages[0];
      
      return {
        id: booking.id,
        participantId: otherUser.id,
        participantName: `${otherUser.profile?.firstName || ''} ${otherUser.profile?.lastName || ''}`.trim() || otherUser.email,
        participantRole: isProvider ? 'SEEKER' : 'PROVIDER',
        participantAvatar: otherUser.profile?.avatar,
        lastMessage: latestMessage ? {
          content: latestMessage.content,
          timestamp: latestMessage.createdAt,
          isOwn: latestMessage.senderId === session.user.id
        } : null,
        isActive: booking.status === 'CONFIRMED',
        unreadCount: 0 // This would require tracking read status
      };
    });

    return NextResponse.json({ conversations });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}