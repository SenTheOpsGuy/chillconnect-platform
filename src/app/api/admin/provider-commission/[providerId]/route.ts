import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const commissionSchema = z.object({
  commissionRate: z.number().min(0).max(1).optional(),
  commissionNote: z.string().max(500).optional()
});

export async function GET(request: NextRequest, { params }: { params: { providerId: string } }) {
  // Temporarily disabled due to database schema migration issue
  return NextResponse.json({ 
    error: 'Provider commission settings temporarily unavailable during database migration',
    commissionRate: null,
    commissionNote: null
  }, { status: 503 });
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const providerId = params.providerId;

    // Get provider with commission info
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Get platform default commission rate
    const platformSettings = await prisma.platformSettings.findFirst();
    const defaultCommissionRate = platformSettings?.commissionRate || 0.5;

    return NextResponse.json({ 
      provider: {
        id: provider.id,
        userId: provider.userId,
        name: `${provider.user.profile?.firstName || ''} ${provider.user.profile?.lastName || ''}`.trim(),
        email: provider.user.email,
        hourlyRate: provider.hourlyRate,
        commissionRate: provider.commissionRate,
        commissionNote: provider.commissionNote,
        defaultCommissionRate
      }
    });

  } catch (error) {
    console.error('Error fetching provider commission:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider commission details' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { providerId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const providerId = params.providerId;
    const body = await request.json();
    const validatedData = commissionSchema.parse(body);

    // Check if provider exists
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Update provider commission
    const updatedProvider = await prisma.provider.update({
      where: { id: providerId },
      data: {
        commissionRate: validatedData.commissionRate,
        commissionNote: validatedData.commissionNote,
        updatedAt: new Date()
      },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    });

    return NextResponse.json({ 
      message: 'Provider commission updated successfully',
      provider: {
        id: updatedProvider.id,
        userId: updatedProvider.userId,
        name: `${updatedProvider.user.profile?.firstName || ''} ${updatedProvider.user.profile?.lastName || ''}`.trim(),
        email: updatedProvider.user.email,
        hourlyRate: updatedProvider.hourlyRate,
        commissionRate: updatedProvider.commissionRate,
        commissionNote: updatedProvider.commissionNote
      }
    });

  } catch (error) {
    console.error('Error updating provider commission:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update provider commission' },
      { status: 500 }
    );
  }
}