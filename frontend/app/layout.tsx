import type { Metadata } from 'next';

import { SiteChrome } from '@/components/layout/site-chrome';
import { AppProviders } from '@/components/providers/app-providers';
import { appConfig } from '@/lib/config';

import './globals.css';

export const metadata: Metadata = {
  title: `${appConfig.name} | Digital Marketplace`,
  description: appConfig.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppProviders>
          <div className="min-h-screen">
            {children}
            <SiteChrome />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
