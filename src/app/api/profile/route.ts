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
      bio: user.profile?.bio || '',
      createdAt: user.createdAt.toISOString(),
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
  let session;
  try {
    session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, phone, timezone, bio, expertise, yearsExperience, hourlyRate } = body;
    
    console.log('Profile update request:', {
      userId: session.user.id,
      userRole: session.user.role,
      requestData: { firstName, lastName, phone, timezone, bio, expertise, yearsExperience, hourlyRate }
    });

    // Update user profile
    await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(timezone !== undefined && { timezone }),
        ...(bio !== undefined && { bio })
      },
      create: {
        userId: session.user.id,
        firstName: firstName || '',
        lastName: lastName || '',
        timezone: timezone || 'Asia/Kolkata',
        bio: bio || ''
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
    if (session.user.role === 'PROVIDER') {
      // Validate provider-specific data
      if (expertise && (!Array.isArray(expertise) || expertise.length === 0)) {
        return NextResponse.json(
          { error: 'Expertise must be a non-empty array' },
          { status: 400 }
        );
      }
      
      if (yearsExperience !== undefined && (typeof yearsExperience !== 'number' || yearsExperience < 0)) {
        return NextResponse.json(
          { error: 'Years of experience must be a non-negative number' },
          { status: 400 }
        );
      }
      
      if (hourlyRate !== undefined && (typeof hourlyRate !== 'number' || hourlyRate <= 0)) {
        return NextResponse.json(
          { error: 'Hourly rate must be a positive number' },
          { status: 400 }
        );
      }

      const updateData: any = {};
      const createData: any = {
        userId: session.user.id,
        expertise: [],
        yearsExperience: 0,
        hourlyRate: 0,
        bio: '',
        verificationStatus: 'PENDING'
      };
      
      console.log('Creating/updating provider profile with data:', { updateData, createData });

      // Handle expertise array
      if (expertise !== undefined) {
        updateData.expertise = expertise;
        createData.expertise = expertise;
      }

      // Handle years experience
      if (yearsExperience !== undefined) {
        updateData.yearsExperience = yearsExperience;
        createData.yearsExperience = yearsExperience;
      }

      // Handle hourly rate
      if (hourlyRate !== undefined) {
        updateData.hourlyRate = hourlyRate;
        createData.hourlyRate = hourlyRate;
      }

      // Handle bio
      if (bio !== undefined) {
        updateData.bio = bio;
        createData.bio = bio;
      }

      await prisma.provider.upsert({
        where: { userId: session.user.id },
        update: updateData,
        create: createData
      });
    }

    return NextResponse.json({ message: 'Profile updated successfully' });

  } catch (error) {
    console.error('Error updating profile:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      userId: session?.user?.id
    });
    return NextResponse.json(
      { 
        error: 'Failed to update profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}