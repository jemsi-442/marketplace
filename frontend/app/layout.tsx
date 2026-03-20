import type { Metadata } from 'next';

import { AppProviders } from '@/components/providers/app-providers';
import { appConfig } from '@/lib/config';

import './globals.css';

export const metadata: Metadata = {
  title: `${appConfig.name} | Enterprise SaaS`,
  description: appConfig.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
