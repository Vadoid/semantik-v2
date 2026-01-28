import '@/lib/polyfill-storage';
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

import ExplorerLayout from './ExplorerLayout';

export const metadata: Metadata = {
  title: 'Semantik',
  description: 'Explore and analyze your BigQuery data with the power of AI.',
};

import { getUserProfile } from './auth-actions';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUserProfile();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ExplorerLayout user={user}>
          {children}
        </ExplorerLayout>
        <Toaster />
      </body>
    </html>
  );
}
