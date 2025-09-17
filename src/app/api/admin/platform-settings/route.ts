import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const settingsSchema = z.object({
  commissionRate: z.number().min(0).max(1).optional(),
  platformName: z.string().min(1).max(100).optional(),
  supportEmail: z.string().email().optional(),
  maintenanceMode: z.boolean().optional(),
  maxBookingDuration: z.number().min(30).max(1440).optional(),
  minBookingDuration: z.number().min(15).max(240).optional()
});

export async function GET() {
  // Temporarily disabled due to database schema migration issue
  return NextResponse.json({ 
    error: 'Platform settings temporarily unavailable during database migration',
    defaultCommissionRate: 0.5 
  }, { status: 503 });
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get or create platform settings
    let settings = await prisma.platformSettings.findFirst();
    
    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.platformSettings.create({
        data: {
          commissionRate: 0.5,
          platformName: 'ChillConnect',
          supportEmail: 'support@chillconnect.com',
          maintenanceMode: false,
          maxBookingDuration: 480,
          minBookingDuration: 30
        }
      });
    }

    return NextResponse.json({ settings });

  } catch (error) {
    console.error('Error fetching platform settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform settings' },
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

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = settingsSchema.parse(body);

    // Get existing settings or create if none exist
    let settings = await prisma.platformSettings.findFirst();
    
    if (!settings) {
      settings = await prisma.platformSettings.create({
        data: {
          commissionRate: validatedData.commissionRate || 0.5,
          platformName: validatedData.platformName || 'ChillConnect',
          supportEmail: validatedData.supportEmail || 'support@chillconnect.com',
          maintenanceMode: validatedData.maintenanceMode || false,
          maxBookingDuration: validatedData.maxBookingDuration || 480,
          minBookingDuration: validatedData.minBookingDuration || 30
        }
      });
    } else {
      settings = await prisma.platformSettings.update({
        where: { id: settings.id },
        data: {
          ...validatedData,
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({ 
      message: 'Platform settings updated successfully',
      settings 
    });

  } catch (error) {
    console.error('Error updating platform settings:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update platform settings' },
      { status: 500 }
    );
  }
}