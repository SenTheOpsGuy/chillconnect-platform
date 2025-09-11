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

    // Get user profile with settings
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Default settings structure to match frontend expectations
    const settings = {
      notifications: {
        email: user.emailVerified,
        sms: false,
        push: true,
        bookingReminders: true,
        messageAlerts: true,
        promotions: false
      },
      privacy: {
        profileVisibility: 'public',
        allowDirectBooking: true,
        showOnlineStatus: true
      },
      preferences: {
        language: 'en',
        timezone: user.profile?.timezone || 'Asia/Kolkata',
        theme: 'light',
        currency: 'INR'
      },
      security: {
        twoFactorEnabled: false,
        sessionTimeout: 30,
        loginAlerts: true
      },
      // Keep profile data separate for other uses
      profile: {
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        timezone: user.profile?.timezone || 'Asia/Kolkata',
        avatar: user.profile?.avatar || null
      }
    };

    return NextResponse.json({ settings });

  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
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
    const { profile: profileSettings, notifications, privacy, preferences, security } = body;

    // Update or create user profile
    const timezoneToUpdate = preferences?.timezone || profileSettings?.timezone;
    
    if (profileSettings || preferences?.timezone) {
      await prisma.profile.upsert({
        where: { userId: session.user.id },
        update: {
          firstName: profileSettings?.firstName,
          lastName: profileSettings?.lastName,
          timezone: timezoneToUpdate,
          avatar: profileSettings?.avatar
        },
        create: {
          userId: session.user.id,
          firstName: profileSettings?.firstName || 'User',
          lastName: profileSettings?.lastName || '',
          timezone: timezoneToUpdate || 'Asia/Kolkata',
          avatar: profileSettings?.avatar
        }
      });
    }

    // Note: In a real application, you might want to store notification and privacy preferences
    // in a separate UserSettings table. For now, we'll just return success.
    // TODO: Implement UserSettings table for notification/privacy preferences

    return NextResponse.json({ 
      message: 'Settings saved successfully',
      settings: body 
    });

  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}