import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Skip auth for testing configuration
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Check environment variables without exposing sensitive data
    const hasAppId = !!process.env.CASHFREE_APP_ID;
    const hasSecretKey = !!process.env.CASHFREE_SECRET_KEY;
    const baseUrl = process.env.CASHFREE_BASE_URL || 'https://api.cashfree.com/pg';
    const hasNextAuthUrl = !!process.env.NEXTAUTH_URL;

    const appIdPreview = process.env.CASHFREE_APP_ID 
      ? `${process.env.CASHFREE_APP_ID.substring(0, 6)}...`
      : 'undefined';

    return NextResponse.json({
      configured: hasAppId && hasSecretKey,
      hasAppId,
      hasSecretKey,
      hasNextAuthUrl,
      baseUrl,
      appIdPreview,
      callbackUrl: hasNextAuthUrl ? `${process.env.NEXTAUTH_URL}/api/payments/cashfree/callback` : 'undefined',
      webhookUrl: hasNextAuthUrl ? `${process.env.NEXTAUTH_URL}/api/payments/cashfree/webhook` : 'undefined',
      environment: baseUrl.includes('sandbox') ? 'sandbox' : 'production'
    });
  } catch (error) {
    console.error('Configuration check error:', error);
    return NextResponse.json(
      { error: 'Failed to check configuration' },
      { status: 500 }
    );
  }
}