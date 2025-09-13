import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Only providers can create provider profiles' }, { status: 403 });
    }

    // Check if provider profile already exists
    const existingProfile = await prisma.provider.findUnique({
      where: { userId: session.user.id }
    });

    if (existingProfile) {
      return NextResponse.json({ error: 'Provider profile already exists' }, { status: 400 });
    }

    // Create provider profile
    const providerProfile = await prisma.provider.create({
      data: {
        userId: session.user.id,
        expertise: [],
        yearsExperience: 0,
        hourlyRate: 0,
        bio: '',
        verificationStatus: 'PENDING'
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Provider profile created successfully',
      providerProfile
    });

  } catch (error) {
    console.error('Error creating provider profile:', error);
    return NextResponse.json(
      { error: 'Failed to create provider profile' },
      { status: 500 }
    );
  }
}