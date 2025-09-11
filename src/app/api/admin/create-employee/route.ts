import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const createEmployeeSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['EMPLOYEE', 'SUPER_ADMIN'])
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only Super Admins can create employee accounts' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, password, firstName, lastName, role } = createEmployeeSchema.parse(body);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create employee user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        emailVerified: true, // Employees don't need email verification
        profile: {
          create: {
            firstName,
            lastName
          }
        },
        wallet: {
          create: {
            balance: 0,
            pendingAmount: 0
          }
        }
      }
    });
    
    return NextResponse.json({
      message: `${role.toLowerCase()} account created successfully`,
      userId: user.id,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('Employee creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create employee account' },
      { status: 500 }
    );
  }
}