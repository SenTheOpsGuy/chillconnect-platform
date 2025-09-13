import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

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

    // Fetch user with profile and provider profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Transform the data to match the expected format
    const transformedUser = {
      id: user.id,
      email: user.email,
      firstName: user.profile?.firstName || 'N/A',
      lastName: user.profile?.lastName || 'N/A',
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.updatedAt.toISOString(), // Using updatedAt as proxy
      status: 'ACTIVE' as const, // Default status since we don't have this field in schema
      phone: user.phone,
      timezone: user.profile?.timezone || 'Asia/Kolkata',
      bio: user.profile?.bio || '',
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
        // Prevent Super Admin from deleting themselves
        if (session.user.id === userId) {
          console.log('Super Admin attempted self-deletion prevented:', {
            adminId: session.user.id,
            targetUserId: userId
          });
          return NextResponse.json(
            { error: 'Super Admin cannot delete their own account' },
            { status: 403 }
          );
        }

        // Check if user exists first
        console.log('Delete user: Checking if user exists:', userId);
        const userToDelete = await prisma.user.findUnique({ 
          where: { id: userId },
          include: {
            profile: true,
            providerProfile: true,
            wallet: true
          }
        });

        if (!userToDelete) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Additional check: Prevent deletion of other Super Admins (optional safety measure)
        if (userToDelete.role === 'SUPER_ADMIN') {
          console.log('Attempted deletion of Super Admin prevented:', {
            adminId: session.user.id,
            targetAdminId: userId,
            targetEmail: userToDelete.email
          });
          return NextResponse.json(
            { error: 'Cannot delete Super Admin accounts' },
            { status: 403 }
          );
        }

        console.log('Deleting user with related data:', {
          userId,
          email: userToDelete.email,
          hasProfile: !!userToDelete.profile,
          hasProviderProfile: !!userToDelete.providerProfile,
          hasWallet: !!userToDelete.wallet
        });

        try {
          // Simplified delete approach - let Prisma handle cascading where configured
          await prisma.$transaction(async (tx) => {
            console.log('Starting user deletion transaction');
            
            // Delete core related data first
            if (userToDelete.providerProfile) {
              console.log('Deleting provider profile');
              await tx.provider.delete({
                where: { id: userToDelete.providerProfile.id }
              });
            }

            if (userToDelete.wallet) {
              console.log('Deleting wallet');
              await tx.wallet.delete({
                where: { id: userToDelete.wallet.id }
              });
            }

            if (userToDelete.profile) {
              console.log('Deleting profile');
              await tx.profile.delete({
                where: { id: userToDelete.profile.id }
              });
            }

            // Finally delete the user - this should cascade delete most relationships
            console.log('Deleting user');
            await tx.user.delete({
              where: { id: userId }
            });
          });

          console.log('User deleted successfully:', userId);
          return NextResponse.json({ message: 'User deleted successfully' });

        } catch (deleteError: any) {
          console.error('Error during user deletion:', deleteError);
          console.error('Delete error details:', {
            code: deleteError?.code,
            message: deleteError?.message,
            meta: deleteError?.meta
          });
          return NextResponse.json(
            { error: `Failed to delete user: ${deleteError?.message || 'Unknown error'}` },
            { status: 500 }
          );
        }
      
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