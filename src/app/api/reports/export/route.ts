import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['EMPLOYEE', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { reportType, format = 'csv' } = await request.json();

    let csvData = '';
    let filename = '';

    switch (reportType) {
      case 'financial':
        const transactions = await prisma.transaction.findMany({
          include: {
            user: {
              include: { profile: true }
            },
            booking: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1000 // Limit for performance
        });

        csvData = [
          'Transaction ID,User Email,User Name,Amount,Type,Status,Created At,Booking ID',
          ...transactions.map(t => [
            t.id,
            t.user.email,
            `"${t.user.profile?.firstName || ''} ${t.user.profile?.lastName || ''}"`,
            t.amount,
            t.type,
            t.status,
            t.createdAt.toISOString(),
            t.bookingId || ''
          ].join(','))
        ].join('\n');
        filename = `financial_report_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'bookings':
        const bookings = await prisma.booking.findMany({
          include: {
            seeker: {
              include: { profile: true }
            },
            provider: {
              include: { profile: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 1000
        });

        csvData = [
          'Booking ID,Seeker Email,Seeker Name,Provider Email,Provider Name,Amount,Status,Start Time,Created At',
          ...bookings.map(b => [
            b.id,
            b.seeker.email,
            `"${b.seeker.profile?.firstName || ''} ${b.seeker.profile?.lastName || ''}"`,
            b.provider.email,
            `"${b.provider.profile?.firstName || ''} ${b.provider.profile?.lastName || ''}"`,
            b.amount,
            b.status,
            b.startTime.toISOString(),
            b.createdAt.toISOString()
          ].join(','))
        ].join('\n');
        filename = `bookings_report_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'users':
        const users = await prisma.user.findMany({
          include: {
            profile: true,
            providerProfile: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1000
        });

        csvData = [
          'User ID,Email,Name,Role,Verified,Created At,Provider Rating,Provider Sessions',
          ...users.map(u => [
            u.id,
            u.email,
            `"${u.profile?.firstName || ''} ${u.profile?.lastName || ''}"`,
            u.role,
            u.emailVerified,
            u.createdAt.toISOString(),
            u.providerProfile?.rating || '',
            u.providerProfile?.totalSessions || ''
          ].join(','))
        ].join('\n');
        filename = `users_report_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'performance':
        const providers = await prisma.provider.findMany({
          include: {
            user: {
              include: { profile: true }
            }
          },
          orderBy: { rating: 'desc' },
          take: 1000
        });

        csvData = [
          'Provider ID,Email,Name,Rating,Total Sessions,Hourly Rate,Verification Status,Years Experience',
          ...providers.map(p => [
            p.id,
            p.user.email,
            `"${p.user.profile?.firstName || ''} ${p.user.profile?.lastName || ''}"`,
            p.rating,
            p.totalSessions,
            p.hourlyRate,
            p.verificationStatus,
            p.yearsExperience
          ].join(','))
        ].join('\n');
        filename = `performance_report_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // Return CSV data with proper headers
    const response = new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });

    return response;

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export report' },
      { status: 500 }
    );
  }
}