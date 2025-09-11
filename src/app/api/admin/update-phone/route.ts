import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow super admin to update admin phone
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { email, phone } = body;

    if (!email || !phone) {
      return NextResponse.json(
        { error: 'Email and phone are required' },
        { status: 400 }
      );
    }

    // Update the user's phone number and mark it as verified
    const result = await prisma.user.update({
      where: { email },
      data: {
        phone,
        phoneVerified: true
      }
    });

    return NextResponse.json({
      message: 'Phone number updated and verified successfully',
      user: {
        id: result.id,
        email: result.email,
        phone: result.phone,
        phoneVerified: result.phoneVerified
      }
    });
  } catch (error) {
    console.error('Update phone error:', error);
    return NextResponse.json(
      { error: 'Failed to update phone' },
      { status: 500 }
    );
  }
}