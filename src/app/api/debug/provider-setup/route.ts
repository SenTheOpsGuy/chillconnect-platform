import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// Debug endpoint to help troubleshoot provider profile setup issues
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get comprehensive user data
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

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified
      },
      profile: user.profile ? {
        id: user.profile.id,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        bio: user.profile.bio
      } : null,
      providerProfile: user.providerProfile ? {
        id: user.providerProfile.id,
        expertise: user.providerProfile.expertise,
        yearsExperience: user.providerProfile.yearsExperience,
        hourlyRate: user.providerProfile.hourlyRate,
        bio: user.providerProfile.bio,
        verificationStatus: user.providerProfile.verificationStatus
      } : null,
      canCreateProvider: user.role === 'PROVIDER' && !user.providerProfile
    });

  } catch (error) {
    console.error('Error in provider setup debug:', error);
    return NextResponse.json(
      { 
        error: 'Debug endpoint error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Test endpoint to simulate provider profile creation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { testData = false, ...body } = await request.json();
    
    if (testData) {
      // Use test data for debugging
      body.expertise = ['TAX', 'LEGAL'];
      body.yearsExperience = 5;
      body.hourlyRate = 100;
      body.bio = 'Test provider bio';
    }

    console.log('Debug: Attempting provider profile creation/update with:', {
      userId: session.user.id,
      userRole: session.user.role,
      data: body
    });

    // Attempt the same operation as the main profile API
    if (session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'User role is not PROVIDER' }, { status: 400 });
    }

    // Check current state
    const existingProvider = await prisma.provider.findUnique({
      where: { userId: session.user.id }
    });

    console.log('Debug: Existing provider profile:', existingProvider);

    // Try creating/updating provider profile
    const result = await prisma.provider.upsert({
      where: { userId: session.user.id },
      update: {
        expertise: body.expertise || [],
        yearsExperience: body.yearsExperience || 0,
        hourlyRate: body.hourlyRate || 0,
        bio: body.bio || ''
      },
      create: {
        userId: session.user.id,
        expertise: body.expertise || [],
        yearsExperience: body.yearsExperience || 0,
        hourlyRate: body.hourlyRate || 0,
        bio: body.bio || '',
        verificationStatus: 'PENDING'
      }
    });

    console.log('Debug: Provider profile operation successful:', result);

    return NextResponse.json({
      success: true,
      message: 'Provider profile operation completed',
      result: {
        id: result.id,
        expertise: result.expertise,
        yearsExperience: result.yearsExperience,
        hourlyRate: result.hourlyRate,
        bio: result.bio
      }
    });

  } catch (error) {
    console.error('Debug: Provider profile operation failed:', error);
    return NextResponse.json(
      { 
        error: 'Provider profile operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack'
      },
      { status: 500 }
    );
  }
}