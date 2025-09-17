import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { sendPennyTest } from '@/lib/payments/cashfree-payouts';
import { z } from 'zod';

const bankAccountSchema = z.object({
  accountHolderName: z.string().min(2).max(100),
  accountNumber: z.string().min(9).max(18),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format'),
  bankName: z.string().min(2).max(100),
  branchName: z.string().min(2).max(100).optional(),
  accountType: z.enum(['SAVINGS', 'CURRENT']).default('SAVINGS')
});

// Get provider's bank account details
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get provider ID
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
      include: {
        bankAccount: {
          include: {
            deleteRequests: {
              where: { status: 'PENDING' }
            }
          }
        }
      }
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
    }

    if (!provider.bankAccount) {
      return NextResponse.json({ 
        bankAccount: null,
        canAddAccount: true
      });
    }

    // Return bank account details (mask sensitive info)
    return NextResponse.json({
      bankAccount: {
        id: provider.bankAccount.id,
        accountHolderName: provider.bankAccount.accountHolderName,
        accountNumber: provider.bankAccount.accountNumber.replace(/(.{4})(.*)(.{4})/, '$1****$3'),
        ifscCode: provider.bankAccount.ifscCode,
        bankName: provider.bankAccount.bankName,
        branchName: provider.bankAccount.branchName,
        accountType: provider.bankAccount.accountType,
        verificationStatus: provider.bankAccount.verificationStatus,
        isActive: provider.bankAccount.isActive,
        verifiedAt: provider.bankAccount.verifiedAt,
        pennyTestAttempts: provider.bankAccount.pennyTestAttempts,
        createdAt: provider.bankAccount.createdAt
      },
      pendingDeleteRequest: provider.bankAccount.deleteRequests.length > 0,
      canAddAccount: false
    });

  } catch (error) {
    console.error('Error fetching bank account:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bank account details' },
      { status: 500 }
    );
  }
}

// Add or update bank account
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = bankAccountSchema.parse(body);

    // Get provider
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
      include: { bankAccount: true }
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
    }

    // Check if provider already has a bank account
    if (provider.bankAccount && provider.bankAccount.verificationStatus !== 'DELETED') {
      return NextResponse.json({ 
        error: 'Bank account already exists. Please request deletion to add a new one.' 
      }, { status: 400 });
    }

    // Create bank account
    const bankAccount = await prisma.providerBankAccount.create({
      data: {
        providerId: provider.id,
        accountHolderName: validatedData.accountHolderName,
        accountNumber: validatedData.accountNumber,
        ifscCode: validatedData.ifscCode,
        bankName: validatedData.bankName,
        branchName: validatedData.branchName,
        accountType: validatedData.accountType,
        verificationStatus: 'PENDING'
      }
    });

    // Send penny test
    const transferId = `penny_${bankAccount.id}_${Date.now()}`;
    const pennyResult = await sendPennyTest(transferId, {
      accountHolderName: bankAccount.accountHolderName,
      accountNumber: bankAccount.accountNumber,
      ifscCode: bankAccount.ifscCode,
      bankName: bankAccount.bankName
    });

    if (pennyResult.success) {
      // Update bank account with penny test details
      await prisma.providerBankAccount.update({
        where: { id: bankAccount.id },
        data: {
          verificationStatus: 'PENNY_TEST_SENT',
          pennyTestAmount: pennyResult.pennyAmount,
          pennyTestReference: pennyResult.referenceId,
          pennyTestAttempts: 1
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Bank account added and penny test sent',
        bankAccount: {
          id: bankAccount.id,
          verificationStatus: 'PENNY_TEST_SENT',
          pennyAmount: pennyResult.pennyAmount
        }
      });
    } else {
      // Delete the bank account if penny test failed
      await prisma.providerBankAccount.delete({
        where: { id: bankAccount.id }
      });

      return NextResponse.json({
        error: 'Failed to send penny test. Please check your bank details.',
        details: pennyResult.error
      }, { status: 400 });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid bank account details', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error adding bank account:', error);
    return NextResponse.json(
      { error: 'Failed to add bank account' },
      { status: 500 }
    );
  }
}