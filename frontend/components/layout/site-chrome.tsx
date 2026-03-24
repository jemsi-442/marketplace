'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';

import { MarketingFooter } from '@/components/layout/marketing-footer';

export function SiteChrome() {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard') ?? false;
  const footerVariant = isDashboard ? 'compact' : 'full';

  return (
    <>
      {!isDashboard ? (
        <Link
          href="https://wa.me/255622670772"
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-3 rounded-full border border-[rgba(184,208,255,0.28)] bg-[linear-gradient(135deg,rgba(47,107,255,0.96),rgba(22,53,154,0.94))] px-4 py-3 text-sm font-medium text-white shadow-[0_16px_36px_rgba(16,41,110,0.36)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(16,41,110,0.44)]"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-[rgba(255,255,255,0.16)]">
            <MessageCircle className="size-4" />
          </span>
          WhatsApp
        </Link>
      ) : null}

      <div className="mx-auto max-w-7xl px-6 pb-8 lg:px-8">
        <MarketingFooter variant={footerVariant} />
      </div>
    </>
  );
}
