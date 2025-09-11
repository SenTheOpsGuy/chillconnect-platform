import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const provider = await prisma.provider.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            profile: true,
            feedbackReceived: {
              include: {
                giver: {
                  include: { profile: true }
                }
              },
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        },
        availability: {
          orderBy: { dayOfWeek: 'asc' }
        }
      }
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Calculate average rating from feedback
    const feedbacks = provider.user.feedbackReceived;
    const averageRating = feedbacks.length > 0 
      ? feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0) / feedbacks.length
      : 0;

    // Update provider rating if needed
    if (Math.abs(provider.rating - averageRating) > 0.1) {
      await prisma.provider.update({
        where: { id },
        data: { rating: averageRating }
      });
    }

    const response = {
      id: provider.id,
      expertise: provider.expertise,
      yearsExperience: provider.yearsExperience,
      hourlyRate: provider.hourlyRate,
      bio: provider.bio,
      rating: averageRating || provider.rating,
      totalSessions: provider.totalSessions,
      verificationStatus: provider.verificationStatus,
      user: {
        email: provider.user.email,
        profile: {
          firstName: provider.user.profile?.firstName,
          lastName: provider.user.profile?.lastName,
          avatar: provider.user.profile?.avatar,
          timezone: provider.user.profile?.timezone
        }
      },
      availability: provider.availability,
      reviews: feedbacks.map(feedback => ({
        id: feedback.id,
        rating: feedback.rating,
        comment: feedback.comment,
        createdAt: feedback.createdAt,
        giver: {
          name: `${feedback.giver.profile?.firstName} ${feedback.giver.profile?.lastName}`,
          avatar: feedback.giver.profile?.avatar
        }
      }))
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Provider fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider' },
      { status: 500 }
    );
  }
}