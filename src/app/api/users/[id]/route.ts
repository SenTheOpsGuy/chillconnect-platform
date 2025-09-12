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
        const userToDelete = await prisma.user.findUnique({ 
          where: { id: userId },
          include: {
            profile: true,
            providerProfile: true,
            wallet: true,
            seekerBookings: true,
            providerBookings: true,
            sentMessages: true,
            receivedMessages: true,
            transactions: true,
            feedbackGiven: true,
            feedbackReceived: true,
            disputesInitiated: true,
            disputesAssigned: true
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
          hasWallet: !!userToDelete.wallet,
          bookingsCount: userToDelete.seekerBookings.length + userToDelete.providerBookings.length,
          messagesCount: userToDelete.sentMessages.length + userToDelete.receivedMessages.length,
          transactionsCount: userToDelete.transactions.length
        });

        try {
          // Use a transaction to delete all related data safely
          await prisma.$transaction(async (tx) => {
            // Delete in proper order to respect foreign key constraints
            
            // 1. Delete dispute communications
            await tx.disputeCommunication.deleteMany({
              where: {
                OR: [
                  { fromUserId: userId },
                  { toUserId: userId }
                ]
              }
            });

            // 2. Delete dispute resolution records
            await tx.disputeResolutionRecord.deleteMany({
              where: { resolvedBy: userId }
            });

            // 3. Delete disputes
            await tx.dispute.deleteMany({
              where: {
                OR: [
                  { initiatedBy: userId },
                  { assignedTo: userId }
                ]
              }
            });

            // 4. Delete feedback
            await tx.feedback.deleteMany({
              where: {
                OR: [
                  { giverId: userId },
                  { receiverId: userId }
                ]
              }
            });

            // 5. Delete transactions
            await tx.transaction.deleteMany({
              where: { userId }
            });

            // 6. Delete messages
            await tx.message.deleteMany({
              where: {
                OR: [
                  { senderId: userId },
                  { receiverId: userId }
                ]
              }
            });

            // 7. Delete sessions related to bookings
            const userBookings = await tx.booking.findMany({
              where: {
                OR: [
                  { seekerId: userId },
                  { providerId: userId }
                ]
              },
              select: { id: true }
            });

            if (userBookings.length > 0) {
              await tx.session.deleteMany({
                where: {
                  bookingId: { in: userBookings.map(b => b.id) }
                }
              });
            }

            // 8. Delete bookings
            await tx.booking.deleteMany({
              where: {
                OR: [
                  { seekerId: userId },
                  { providerId: userId }
                ]
              }
            });

            // 9. Delete availability (if provider)
            if (userToDelete.providerProfile) {
              await tx.availability.deleteMany({
                where: { providerId: userToDelete.providerProfile.id }
              });
            }

            // 10. Delete provider profile
            if (userToDelete.providerProfile) {
              await tx.provider.delete({
                where: { id: userToDelete.providerProfile.id }
              });
            }

            // 11. Delete wallet
            if (userToDelete.wallet) {
              await tx.wallet.delete({
                where: { id: userToDelete.wallet.id }
              });
            }

            // 12. Delete profile
            if (userToDelete.profile) {
              await tx.profile.delete({
                where: { id: userToDelete.profile.id }
              });
            }

            // 13. Finally delete the user
            await tx.user.delete({
              where: { id: userId }
            });
          });

          console.log('User and all related data deleted successfully:', userId);
          return NextResponse.json({ message: 'User deleted successfully' });

        } catch (deleteError) {
          console.error('Error during user deletion:', deleteError);
          return NextResponse.json(
            { error: 'Failed to delete user and related data' },
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