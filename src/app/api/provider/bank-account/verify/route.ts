import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const verificationSchema = z.object({
  pennyAmount: z.number().min(1).max(10) // Amount in rupees
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pennyAmount } = verificationSchema.parse(body);

    // Get provider's bank account
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
      include: { bankAccount: true }
    });

    if (!provider?.bankAccount) {
      return NextResponse.json({ 
        error: 'No bank account found' 
      }, { status: 404 });
    }

    const bankAccount = provider.bankAccount;

    // Check if bank account is in penny test state
    if (bankAccount.verificationStatus !== 'PENNY_TEST_SENT') {
      return NextResponse.json({ 
        error: 'Bank account is not awaiting penny test verification' 
      }, { status: 400 });
    }

    // Check if too many attempts
    if (bankAccount.pennyTestAttempts >= 3) {
      return NextResponse.json({ 
        error: 'Too many verification attempts. Please add a new bank account.' 
      }, { status: 400 });
    }

    // Verify penny amount
    const isCorrect = Math.abs(pennyAmount - (bankAccount.pennyTestAmount || 0)) < 0.01;

    if (isCorrect) {
      // Verification successful
      await prisma.providerBankAccount.update({
        where: { id: bankAccount.id },
        data: {
          verificationStatus: 'VERIFIED',
          isActive: true,
          verifiedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Bank account verified successfully! You can now request payouts.',
        bankAccount: {
          id: bankAccount.id,
          verificationStatus: 'VERIFIED',
          isActive: true,
          verifiedAt: new Date()
        }
      });
    } else {
      // Verification failed - increment attempts
      const newAttempts = bankAccount.pennyTestAttempts + 1;
      const status = newAttempts >= 3 ? 'REJECTED' : 'PENNY_TEST_SENT';

      await prisma.providerBankAccount.update({
        where: { id: bankAccount.id },
        data: {
          pennyTestAttempts: newAttempts,
          verificationStatus: status
        }
      });

      if (newAttempts >= 3) {
        return NextResponse.json({
          error: 'Verification failed. Maximum attempts reached. Please add a new bank account.',
          attemptsRemaining: 0
        }, { status: 400 });
      } else {
        return NextResponse.json({
          error: 'Incorrect amount. Please check your bank statement and try again.',
          attemptsRemaining: 3 - newAttempts
        }, { status: 400 });
      }
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid verification data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error verifying penny test:', error);
    return NextResponse.json(
      { error: 'Failed to verify bank account' },
      { status: 500 }
    );
  }
}