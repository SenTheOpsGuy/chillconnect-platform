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

    // Get user with profile and provider profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
        providerProfile: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userProfile = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      timezone: user.profile?.timezone || 'Asia/Kolkata',
      avatar: user.profile?.avatar || null,
      bio: '', // Can be added to profile table if needed
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      role: user.role
    };

    const providerProfile = user.providerProfile ? {
      expertise: user.providerProfile.expertise,
      yearsExperience: user.providerProfile.yearsExperience,
      hourlyRate: user.providerProfile.hourlyRate,
      rating: user.providerProfile.rating,
      totalSessions: user.providerProfile.totalSessions,
      bio: user.providerProfile.bio,
      verificationStatus: user.providerProfile.verificationStatus
    } : null;

    return NextResponse.json({
      profile: userProfile,
      providerProfile
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, phone, timezone, bio, expertise, yearsExperience, hourlyRate } = body;

    // Update user profile
    await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: {
        firstName,
        lastName,
        timezone
      },
      create: {
        userId: session.user.id,
        firstName,
        lastName,
        timezone
      }
    });

    // Update user phone if provided
    if (phone !== undefined) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { phone }
      });
    }

    // Update provider profile if user is a provider
    if (session.user.role === 'PROVIDER' && (expertise || yearsExperience || hourlyRate || bio)) {
      await prisma.provider.upsert({
        where: { userId: session.user.id },
        update: {
          ...(expertise && { expertise }),
          ...(yearsExperience && { yearsExperience }),
          ...(hourlyRate && { hourlyRate }),
          ...(bio && { bio })
        },
        create: {
          userId: session.user.id,
          expertise: expertise || [],
          yearsExperience: yearsExperience || 0,
          hourlyRate: hourlyRate || 0,
          bio: bio || ''
        }
      });
    }

    return NextResponse.json({ message: 'Profile updated successfully' });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}