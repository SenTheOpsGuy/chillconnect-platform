import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const feedbackSchema = z.object({
  bookingId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(500).optional()
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { bookingId, rating, comment } = feedbackSchema.parse(body);

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        feedback: true,
        provider: true
      }
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if user is the seeker (only seekers can give feedback)
    if (booking.seekerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if booking is completed
    if (booking.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Booking not completed yet' },
        { status: 400 }
      );
    }

    // Check if feedback already exists
    if (booking.feedback) {
      return NextResponse.json(
        { error: 'Feedback already submitted' },
        { status: 400 }
      );
    }

    // Create feedback
    await prisma.feedback.create({
      data: {
        bookingId,
        giverId: session.user.id,
        receiverId: booking.providerId,
        rating,
        comment
      }
    });

    // Update provider's rating
    const feedbacks = await prisma.feedback.findMany({
      where: { receiverId: booking.providerId }
    });

    const totalRating = feedbacks.reduce((sum, fb) => sum + fb.rating, 0);
    const averageRating = totalRating / feedbacks.length;

    await prisma.provider.update({
      where: { id: booking.provider?.id },
      data: {
        rating: averageRating,
        totalSessions: { increment: 1 }
      }
    });

    return NextResponse.json({
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}