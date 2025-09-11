import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'
import type { User } from '@prisma/client'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function signToken(payload: any): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

export async function createUser(data: {
  email: string
  password: string
  role?: 'SEEKER' | 'PROVIDER' | 'EMPLOYEE' | 'SUPER_ADMIN'
}) {
  const hashedPassword = await hashPassword(data.password)
  
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: hashedPassword,
      role: data.role || 'SEEKER',
      profile: {
        create: {}
      },
      wallet: {
        create: {}
      }
    },
    include: {
      profile: true,
      wallet: true
    }
  })

  return user
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      profile: true,
      wallet: true
    }
  })

  if (!user || !await verifyPassword(password, user.passwordHash)) {
    return null
  }

  return user
}