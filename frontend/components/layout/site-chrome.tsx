'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';

import { MarketingFooter } from '@/components/layout/marketing-footer';
import { InstallPrompt } from '@/components/pwa/install-prompt';

export function SiteChrome() {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard') ?? false;
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const hasCustomMarketingShell = pathname === '/';

  return (
    <>
      <InstallPrompt />

      {!isDashboard ? (
        <Link
          href="https://wa.me/255622670772"
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-3 rounded-full border border-[rgba(13,148,136,0.18)] bg-[rgba(255,255,255,0.96)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] shadow-[0_16px_36px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(15,23,42,0.18)]"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-[rgba(13,148,136,0.1)] text-[var(--accent-teal)]">
            <MessageCircle className="size-4" />
          </span>
          WhatsApp
        </Link>
      ) : null}

      {!isDashboard && !hasCustomMarketingShell ? (
        <MarketingFooter variant={isAuthPage ? 'auth' : 'full'} />
      ) : null}
    </>
  );
}
