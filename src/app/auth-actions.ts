'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function createSession(accessToken: string) {
  try {
    const cookieStore = await cookies();
    cookieStore.set('gcp-access-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
  } catch (error) {
    console.error('Error in createSession:', error);
    throw error;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('gcp-access-token');
  redirect('/login');
}

export async function getUserProfile() {
  const cookieStore = await cookies();
  const token = cookieStore.get('gcp-access-token')?.value;

  if (!token) {
    return null;
  }

  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch user profile:', response.statusText);
      return null;
    }

    const userData = await response.json();
    return {
      name: userData.name,
      email: userData.email,
      picture: userData.picture,
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}
