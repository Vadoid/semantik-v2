import { getOAuthClient } from '@/lib/auth';
import { createSession } from '@/app/auth-actions';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  try {
    const client = await getOAuthClient();
    const { tokens } = await client.getToken(code);

    // We prioritize access_token for GCP API calls.
    // We might also want to store refresh_token if we need long-running offline access.
    // For now, createSession stores the access token.

    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    await createSession(tokens.access_token);

    // Successful login, redirect to home
    return NextResponse.redirect(new URL('/', request.url));
  } catch (err: any) {
    console.error('OAuth Callback Error:', err);
    return NextResponse.json({ error: err.message || 'Authentication failed' }, { status: 500 });
  }
}
