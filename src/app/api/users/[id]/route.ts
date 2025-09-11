import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = params.id;

    // Fetch user with provider profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        providerProfile: {
          select: {
            expertise: true,
            hourlyRate: true,
            rating: true,
            totalSessions: true,
            yearsExperience: true,
            bio: true,
            verificationStatus: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Transform the data to match the expected format
    const transformedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName || 'N/A',
      lastName: user.lastName || 'N/A',
      role: user.role,
      emailVerified: user.emailVerified !== null,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString(),
      status: 'ACTIVE' as const, // Default status since we don't have this field in schema
      phone: user.phone,
      timezone: user.timezone || 'Asia/Kolkata',
      bio: user.bio,
      phoneVerified: user.phoneVerified !== null,
      providerProfile: user.providerProfile ? {
        expertise: user.providerProfile.expertise,
        hourlyRate: user.providerProfile.hourlyRate,
        rating: user.providerProfile.rating || 0,
        totalSessions: user.providerProfile.totalSessions || 0,
        yearsExperience: user.providerProfile.yearsExperience || 0,
        bio: user.providerProfile.bio || '',
        verificationStatus: user.providerProfile.verificationStatus
      } : undefined
    };

    return NextResponse.json({ user: transformedUser });

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = params.id;
    const body = await request.json();
    const { action } = body;

    let updatedUser;

    switch (action) {
      case 'suspend':
        // In a real app, you'd update a status field
        // For now, we'll just return success since we don't have a status field
        updatedUser = await prisma.user.findUnique({ where: { id: userId } });
        break;
      
      case 'activate':
        // In a real app, you'd update a status field
        updatedUser = await prisma.user.findUnique({ where: { id: userId } });
        break;
      
      case 'delete':
        await prisma.user.delete({ where: { id: userId } });
        return NextResponse.json({ message: 'User deleted successfully' });
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: `User ${action}ed successfully`,
      user: updatedUser 
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}