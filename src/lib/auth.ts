import type { OAuth2Client } from 'google-auth-library';

export const getOAuthClient = async () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/api/auth/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }

  const { OAuth2Client } = await import('google-auth-library');
  return new OAuth2Client(clientId, clientSecret, redirectUri);
};

export const generateAuthUrl = (client: OAuth2Client, state?: string) => {
  return client.generateAuthUrl({
    access_type: 'offline', // Requests a refresh token
    scope: [
      'https://www.googleapis.com/auth/bigquery',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/cloud-platform', // Needed for project listing usually, or specific APIs
      'openid', // Required for getting ID token
    ],
    state,
    include_granted_scopes: true,
  });
};
