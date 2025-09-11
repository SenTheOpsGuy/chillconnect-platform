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

    if (session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Only providers can access schedules' }, { status: 403 });
    }

    // Get provider profile to access availability data
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
      include: {
        availability: true
      }
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
    }

    // Get user profile for timezone
    const userProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id }
    });

    // Transform availability to match frontend interface
    const timeSlots = provider.availability.map(slot => ({
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isActive: true // All stored slots are considered active
    }));

    const schedule = {
      timeSlots,
      timezone: userProfile?.timezone || 'Asia/Kolkata',
      bufferTime: 15, // Default buffer time - could be stored in provider table
      maxAdvanceBooking: 30 // Default advance booking - could be stored in provider table
    };

    return NextResponse.json({ schedule });

  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
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

    if (session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Only providers can update schedules' }, { status: 403 });
    }

    const body = await request.json();
    const { timeSlots, timezone, bufferTime, maxAdvanceBooking } = body;

    // Get provider profile
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id }
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
    }

    // Update timezone in user profile if provided
    if (timezone) {
      await prisma.profile.upsert({
        where: { userId: session.user.id },
        update: { timezone },
        create: {
          userId: session.user.id,
          firstName: 'Provider',
          lastName: '',
          timezone
        }
      });
    }

    // Clear existing availability slots
    await prisma.availability.deleteMany({
      where: { providerId: provider.id }
    });

    // Create new availability slots for active time slots only
    if (timeSlots && timeSlots.length > 0) {
      const activeSlots = timeSlots.filter((slot: { isActive: boolean; dayOfWeek: number; startTime: string; endTime: string }) => slot.isActive);
      
      if (activeSlots.length > 0) {
        await prisma.availability.createMany({
          data: activeSlots.map((slot: { dayOfWeek: number; startTime: string; endTime: string }) => ({
            providerId: provider.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime
          }))
        });
      }
    }

    // Note: bufferTime and maxAdvanceBooking could be stored in provider table
    // For now, we'll just return success as these are handled client-side

    return NextResponse.json({ 
      message: 'Schedule updated successfully',
      schedule: {
        timeSlots: timeSlots || [],
        timezone,
        bufferTime,
        maxAdvanceBooking
      }
    });

  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}