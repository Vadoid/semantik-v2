import { getOAuthClient, generateAuthUrl } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  let url: string;
  try {
    const client = await getOAuthClient();
    // In a real app, generate a random state string and store it in a cookie to verify in callback
    // For now we skip state verification or use static for simplicity, but strictly should implement it.
    url = generateAuthUrl(client);
  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({
      error: 'Failed to initiate login',
      details: error.message,
      hint: 'Check your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env'
    }, { status: 500 });
  }
  return redirect(url);
}
