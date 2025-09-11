import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().optional(),
  expertise: z.string().optional(),
  minRate: z.coerce.number().optional(),
  maxRate: z.coerce.number().optional(),
  availability: z.string().optional()
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const params = searchSchema.parse(Object.fromEntries(searchParams));
    
    // Build search conditions
    const searchConditions: any[] = [
      { verificationStatus: 'VERIFIED' }
    ];

    // Handle text-based query search (case-insensitive partial matching)
    if (params.query) {
      const queryLower = params.query.toLowerCase();
      // This will be handled in the application layer since PostgreSQL array search is complex
      // For now, we'll do a simple text search in bio
      searchConditions.push({
        bio: {
          contains: params.query,
          mode: 'insensitive'
        }
      });
    }

    // Handle exact expertise match
    if (params.expertise) {
      searchConditions.push({
        expertise: { has: params.expertise }
      });
    }

    // Handle rate filters
    if (params.minRate) {
      searchConditions.push({
        hourlyRate: { gte: params.minRate }
      });
    }
    if (params.maxRate) {
      searchConditions.push({
        hourlyRate: { lte: params.maxRate }
      });
    }
    
    const providers = await prisma.provider.findMany({
      where: {
        AND: searchConditions
      },
      include: {
        user: {
          include: { profile: true }
        },
        availability: true
      },
      orderBy: [
        { rating: 'desc' },
        { totalSessions: 'desc' }
      ],
      take: 20
    });
    
    // If no providers found, create unmatched request
    if (providers.length === 0 && params.query && session?.user) {
      await prisma.unmatchedRequest.create({
        data: {
          seekerEmail: session.user.email!,
          expertise: params.query,
          budget: params.maxRate
        }
      });
      
      return NextResponse.json({
        providers: [],
        message: 'No matches found. We\'re finding an expert for you.'
      });
    }
    
    return NextResponse.json({ providers });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}