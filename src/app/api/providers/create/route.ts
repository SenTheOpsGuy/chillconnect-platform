import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const createProviderSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
  expertise: z.array(z.string()).min(1, 'At least one expertise is required'),
  bio: z.string().min(1),
  hourlyRate: z.number().min(1),
  yearsExperience: z.number().min(0),
  education: z.string().optional(),
  certifications: z.string().optional()
});

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const validatedData = createProviderSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { phone: validatedData.phone }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email or phone already exists' },
        { status: 400 }
      );
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Create user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: validatedData.email,
          phone: validatedData.phone,
          password: hashedPassword,
          role: 'PROVIDER',
          emailVerified: true, // Auto-verify since created by employee
          phoneVerified: true,
        }
      });

      // Create profile
      const profile = await tx.profile.create({
        data: {
          userId: newUser.id,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          address: validatedData.address,
          city: validatedData.city,
          state: validatedData.state,
          pincode: validatedData.pincode,
          bio: validatedData.bio,
          education: validatedData.education,
          certifications: validatedData.certifications
        }
      });

      // Create provider profile
      const providerProfile = await tx.provider.create({
        data: {
          userId: newUser.id,
          expertise: validatedData.expertise,
          hourlyRate: validatedData.hourlyRate,
          yearsExperience: validatedData.yearsExperience,
          verificationStatus: 'PENDING', // Will need verification
          rating: 0,
          totalSessions: 0
        }
      });

      return { newUser, profile, providerProfile, tempPassword };
    });

    // Here you would typically send an email with login credentials
    // For now, we'll just log it (in production, use proper email service)
    console.log(`New provider created: ${validatedData.email}, temp password: ${result.tempPassword}`);

    return NextResponse.json({
      success: true,
      message: 'Provider created successfully',
      provider: {
        id: result.newUser.id,
        email: result.newUser.email,
        name: `${result.profile.firstName} ${result.profile.lastName}`,
        tempPassword: result.tempPassword // In production, don't return this
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Create provider error:', error);
    return NextResponse.json(
      { error: 'Failed to create provider' },
      { status: 500 }
    );
  }
}