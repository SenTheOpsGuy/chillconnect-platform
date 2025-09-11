import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/config';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is employee or super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user || (user.role !== 'EMPLOYEE' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const disputes = await prisma.dispute.findMany({
      where: { 
        status: { in: ['OPEN', 'UNDER_REVIEW'] }
      },
      include: {
        booking: {
          include: {
            seeker: {
              include: {
                profile: true
              }
            },
            provider: {
              include: {
                profile: true
              }
            }
          }
        },
        initiator: {
          include: {
            profile: true
          }
        },
        assignee: {
          include: {
            profile: true
          }
        },
        communications: {
          include: {
            from: {
              include: {
                profile: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ disputes });
  } catch (error) {
    console.error('Get disputes error:', error);
    return NextResponse.json(
      { error: 'Failed to get disputes' },
      { status: 500 }
    );
  }
}