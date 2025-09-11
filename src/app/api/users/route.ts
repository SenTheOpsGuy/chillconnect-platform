import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build where clause for filtering
    let whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { profile: { firstName: { contains: search, mode: 'insensitive' } } },
        { profile: { lastName: { contains: search, mode: 'insensitive' } } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (role && role !== 'ALL') {
      whereClause.role = role;
    }

    // Get total count for pagination
    const totalCount = await prisma.user.count({ where: whereClause });

    // Fetch paginated users with their provider profiles
    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        profile: true,
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
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    // Transform the data to match the expected format
    const transformedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.profile?.firstName || 'N/A',
      lastName: user.profile?.lastName || 'N/A',
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.updatedAt?.toISOString(), // Using updatedAt as proxy for last login
      status: 'ACTIVE' as const, // Default status since we don't have this field in schema
      phone: user.phone,
      timezone: user.profile?.timezone || 'Asia/Kolkata',
      bio: user.providerProfile?.bio || '',
      phoneVerified: user.phoneVerified,
      providerProfile: user.providerProfile ? {
        expertise: user.providerProfile.expertise,
        hourlyRate: user.providerProfile.hourlyRate,
        rating: user.providerProfile.rating || 0,
        totalSessions: user.providerProfile.totalSessions || 0,
        yearsExperience: user.providerProfile.yearsExperience || 0,
        bio: user.providerProfile.bio || '',
        verificationStatus: user.providerProfile.verificationStatus
      } : undefined
    }));

    return NextResponse.json({ 
      users: transformedUsers,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}