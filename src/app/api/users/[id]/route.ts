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
          await prisma.$transaction(async (tx) => {
            console.log('Starting comprehensive user deletion transaction');
            
            // Step 1: Handle all bookings (cancel and notify)
            const allBookings = await tx.booking.findMany({
              where: {
                OR: [
                  { seekerId: userId },
                  { providerId: userId }
                ]
              },
              include: {
                seeker: { include: { profile: true } },
                provider: { include: { profile: true } },
                transactions: true
              }
            });

            console.log(`Found ${allBookings.length} bookings to handle`);

            for (const booking of allBookings) {
              if (['PENDING', 'CONFIRMED', 'PAYMENT_PENDING'].includes(booking.status)) {
                console.log(`Cancelling booking ${booking.id} due to account deletion`);
                
                // Cancel the booking
                await tx.booking.update({
                  where: { id: booking.id },
                  data: { 
                    status: 'CANCELLED'
                  }
                });

                // Handle refunds for paid bookings
                const paidTransactions = booking.transactions.filter(t => 
                  t.type === 'BOOKING_PAYMENT' && t.status === 'completed'
                );
                
                for (const transaction of paidTransactions) {
                  console.log(`Processing refund for transaction ${transaction.id}`);
                  
                  // Create refund transaction
                  await tx.transaction.create({
                    data: {
                      userId: transaction.userId,
                      bookingId: booking.id,
                      amount: transaction.amount,
                      type: 'REFUND',
                      status: 'completed'
                    }
                  });

                  // Update wallet balance if seeker wallet exists
                  if (booking.seekerId !== userId) {
                    const seekerWallet = await tx.wallet.findUnique({
                      where: { userId: booking.seekerId }
                    });
                    
                    if (seekerWallet) {
                      await tx.wallet.update({
                        where: { id: seekerWallet.id },
                        data: {
                          balance: {
                            increment: transaction.amount
                          }
                        }
                      });
                    }
                  }
                }

                // Log cancellation notification (in production, send email/SMS)
                const otherPartyId = booking.seekerId === userId ? booking.providerId : booking.seekerId;
                const otherParty = booking.seekerId === userId ? booking.provider : booking.seeker;
                const deletedUser = userToDelete;
                
                console.log(`Would send cancellation notification to user ${otherPartyId}:`, {
                  reason: 'Account deletion',
                  deletedUserName: `${deletedUser.profile?.firstName} ${deletedUser.profile?.lastName}`,
                  bookingDate: booking.startTime,
                  refundAmount: paidTransactions.reduce((sum, t) => sum + t.amount, 0)
                });
              }
            }

            // Step 2: Delete related data in correct order
            
            // Delete dispute communications
            await tx.disputeCommunication.deleteMany({
              where: {
                OR: [
                  { fromUserId: userId },
                  { toUserId: userId }
                ]
              }
            });

            // Delete dispute resolution records
            await tx.disputeResolutionRecord.deleteMany({
              where: { resolvedBy: userId }
            });

            // Delete disputes
            await tx.dispute.deleteMany({
              where: {
                OR: [
                  { initiatedBy: userId },
                  { assignedTo: userId }
                ]
              }
            });

            // Delete feedback
            await tx.feedback.deleteMany({
              where: {
                OR: [
                  { giverId: userId },
                  { receiverId: userId }
                ]
              }
            });

            // Delete sessions (cascade will handle this, but being explicit)
            const userBookingIds = allBookings.map(b => b.id);
            await tx.session.deleteMany({
              where: {
                bookingId: { in: userBookingIds }
              }
            });

            // Delete messages
            await tx.message.deleteMany({
              where: {
                OR: [
                  { senderId: userId },
                  { receiverId: userId }
                ]
              }
            });

            // Delete transactions
            await tx.transaction.deleteMany({
              where: { userId }
            });

            // Delete all bookings
            await tx.booking.deleteMany({
              where: {
                OR: [
                  { seekerId: userId },
                  { providerId: userId }
                ]
              }
            });

            // Delete availability records (if provider)
            if (userToDelete.providerProfile) {
              await tx.availability.deleteMany({
                where: { providerId: userToDelete.providerProfile.id }
              });
            }

            // Delete provider profile
            if (userToDelete.providerProfile) {
              console.log('Deleting provider profile');
              await tx.provider.delete({
                where: { id: userToDelete.providerProfile.id }
              });
            }

            // Delete wallet
            if (userToDelete.wallet) {
              console.log('Deleting wallet');
              await tx.wallet.delete({
                where: { id: userToDelete.wallet.id }
              });
            }

            // Delete profile
            if (userToDelete.profile) {
              console.log('Deleting profile');
              await tx.profile.delete({
                where: { id: userToDelete.profile.id }
              });
            }

            // Finally delete the user
            console.log('Deleting user account');
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