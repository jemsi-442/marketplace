'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BriefcaseBusiness, LayoutDashboard, LogIn, Menu, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { InstallCtaButton } from '@/components/pwa/install-cta-button';
import { Button } from '@/components/ui/button';

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const navItems = [
    { href: '/', label: 'Home', icon: BriefcaseBusiness, tone: 'text-[var(--brand-primary)] bg-[rgba(79,70,229,0.08)]' },
    { href: '/login', label: 'Sign in', icon: LogIn, tone: 'text-[var(--accent-cyan)] bg-[rgba(14,165,233,0.1)]' },
    { href: '/register', label: 'Create account', icon: UserPlus, tone: 'text-[var(--accent-teal)] bg-[rgba(13,148,136,0.1)]' },
    { href: '/dashboard', label: 'Preview dashboards', icon: LayoutDashboard, tone: 'text-[var(--accent-amber)] bg-[rgba(245,158,11,0.12)]' },
  ];

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

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <header className="mb-8 flex items-center justify-between gap-4 rounded-[28px] border border-[var(--line)] bg-[rgba(255,255,255,0.94)] px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur-2xl lg:px-6">
        <div className="flex items-center gap-4">
          <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.94)] shadow-[0_12px_30px_rgba(7,24,84,0.18)]">
            <Image src="/brand/wolfix-logo.svg" alt="WOLFIX DIGITAL AGENCY logo" width={52} height={52} className="h-[52px] w-[52px] object-cover" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-[var(--brand-secondary)]">WOLFIX DIGITAL AGENCY</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Digital services marketplace</p>
          </div>
        </div>

        <nav className="hidden flex-1 items-center justify-center gap-2 lg:flex">
          {navItems.map(({ href, label, icon: Icon, tone }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(15,23,42,0.08)]"
            >
              <div className={`flex size-9 items-center justify-center rounded-2xl transition group-hover:scale-[1.03] ${tone}`}>
                <Icon className="size-4" />
              </div>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex lg:hidden">
          <InstallCtaButton variant="ghost" />
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
          className="flex size-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] text-[var(--text-primary)] transition hover:bg-[var(--panel-strong)] lg:hidden"
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
          <div className="animate-slide-in-right absolute right-0 top-0 h-full w-[min(92vw,380px)] overflow-hidden border-l border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.985),rgba(248,250,252,0.98))] shadow-[var(--shadow-panel)]">
            <div className="flex h-full flex-col">
              <div className="border-b border-[var(--line)] px-5 pb-5 pt-5">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
                      <Image src="/brand/wolfix-logo.svg" alt="WOLFIX DIGITAL AGENCY logo" width={44} height={44} className="h-11 w-11 object-cover" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--brand-secondary)]">Navigation</p>
                      <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Browse WOLFIX quickly</p>
                    </div>
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[20px] border border-[var(--line)] bg-white px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Start here</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">Open the lane you need without hunting through the page.</p>
                  </div>
                  <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Best on phone</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">Short labels, larger tap targets, and one close point.</p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-3">
                  {navItems.map(({ href, label, icon: Icon, tone }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="block rounded-[22px] border border-[var(--line)] bg-white px-4 py-4 text-[var(--text-primary)] shadow-[0_14px_30px_rgba(15,23,42,0.05)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex size-11 items-center justify-center rounded-2xl ${tone}`}>
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-sm font-medium">{label}</span>
                          <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                            {href === '/'
                              ? 'Back to the public overview.'
                              : href === '/dashboard'
                                ? 'See all lanes before signing in.'
                                : href === '/login'
                                  ? 'Return to your saved lane.'
                                  : 'Create a client or vendor workspace.'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="border-t border-[var(--line)] bg-[rgba(248,250,252,0.92)] px-5 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="w-full justify-center">
                      Sign in
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setOpen(false)}>
                    <Button className="w-full justify-center">Create account</Button>
                  </Link>
                </div>
                <div className="mt-3">
                  <InstallCtaButton variant="ghost" className="w-full justify-center" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
