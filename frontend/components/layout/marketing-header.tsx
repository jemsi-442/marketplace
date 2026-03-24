'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <header className="mb-8 flex items-center justify-between rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(8,20,48,0.9),rgba(13,30,74,0.8))] px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur-2xl lg:px-6">
        <div className="flex items-center gap-4">
          <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.94)] shadow-[0_12px_30px_rgba(7,24,84,0.18)]">
            <Image src="/brand/wolfix-logo.svg" alt="WOLFIX DIGITAL AGENCY logo" width={52} height={52} className="h-[52px] w-[52px] object-cover" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-[var(--brand-secondary)]">WOLFIX DIGITAL AGENCY</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Digital services marketplace</p>
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link href="/register">
            <Button>Create account</Button>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex size-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] text-[var(--text-primary)] transition hover:bg-[var(--panel-strong)] md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(4,10,28,0.62)] backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close navigation overlay"
          />
          <div className="animate-slide-in-right absolute right-0 top-0 h-full w-[min(90vw,360px)] border-l border-[var(--line)] bg-[linear-gradient(180deg,rgba(8,20,48,0.96),rgba(13,30,74,0.9))] p-5 shadow-[var(--shadow-panel)]">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">Navigation</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Browse WOLFIX quickly</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] text-[var(--text-primary)]"
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              <Link href="/" onClick={() => setOpen(false)} className="block rounded-[20px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4 text-[var(--text-primary)]">
                Home
              </Link>
              <Link href="/login" onClick={() => setOpen(false)} className="block rounded-[20px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4 text-[var(--text-primary)]">
                Sign in
              </Link>
              <Link href="/register" onClick={() => setOpen(false)} className="block rounded-[20px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4 text-[var(--text-primary)]">
                Create account
              </Link>
              <Link href="/dashboard" onClick={() => setOpen(false)} className="block rounded-[20px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4 text-[var(--text-primary)]">
                Preview dashboards
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
