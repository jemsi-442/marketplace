'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BriefcaseBusiness, LayoutDashboard, LogIn, Menu, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { InstallCtaButton } from '@/components/pwa/install-cta-button';
import { cn } from '@/lib/utils';

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navItems = [
    { href: '/', label: 'Home', icon: BriefcaseBusiness, description: 'Return to the public overview.' },
    { href: '/login', label: 'Sign in', icon: LogIn, description: 'Open your saved workspace.' },
    { href: '/register', label: 'Create account', icon: UserPlus, description: 'Start a client or vendor lane.' },
    { href: '/dashboard', label: 'Preview dashboards', icon: LayoutDashboard, description: 'See the product before entry.' },
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
      <header className="sticky top-0 z-40 border-b border-[rgba(191,219,254,0.14)] bg-[color:var(--shell-dark-blue)]/95 shadow-[0_18px_42px_rgba(2,8,23,0.18)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-[rgba(191,219,254,0.16)] bg-[rgba(255,255,255,0.08)] text-white transition hover:bg-[rgba(255,255,255,0.12)] min-[761px]:hidden"
              aria-label="Open navigation"
              title="Open navigation"
            >
              <Menu className="size-4" />
              <span className="sr-only">Open navigation</span>
            </button>
            <div className="flex min-w-0 items-center gap-3">
              <div className="overflow-hidden rounded-[12px] border border-[rgba(191,219,254,0.14)] bg-[rgba(255,255,255,0.06)]">
                <Image src="/brand/wolfix-logo.svg" alt="WOLFIX DIGITAL AGENCY logo" width={44} height={44} className="h-11 w-11 object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.28em] text-white">WOLFIX DIGITAL AGENCY</p>
                <p className="mt-1 truncate text-sm text-white/85">Marketplace workspace</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <InstallCtaButton
              variant="ghost"
              size="sm"
              className="hidden rounded-[10px] border-[rgba(191,219,254,0.12)] bg-[rgba(255,255,255,0.05)] text-white hover:bg-[rgba(255,255,255,0.08)] hover:text-white md:inline-flex"
            />
            <Link
              href="/login"
              className="hidden h-9 items-center justify-center rounded-[10px] border border-[rgba(191,219,254,0.12)] bg-[rgba(255,255,255,0.05)] px-4 text-xs font-semibold text-white transition hover:bg-[rgba(255,255,255,0.08)] md:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="hidden h-9 items-center justify-center rounded-[10px] border border-[rgba(96,165,250,0.18)] bg-[rgba(37,99,235,0.92)] px-4 text-xs font-semibold text-white transition hover:bg-[rgba(37,99,235,1)] md:inline-flex"
            >
              Create account
            </Link>
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(4,10,28,0.62)] backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close navigation overlay"
          />
          <div className="animate-slide-in-left absolute left-0 top-0 h-full w-[min(92vw,340px)] overflow-hidden border-r border-[rgba(191,219,254,0.18)] bg-[image:var(--nav-shell-bg)] text-[var(--nav-shell-text)] shadow-[0_26px_60px_rgba(2,8,23,0.42)]">
            <div className="flex h-full flex-col">
              <div className="border-b border-[rgba(191,219,254,0.14)] px-4 pb-4 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center overflow-hidden rounded-xl border border-[rgba(191,219,254,0.18)] bg-[rgba(255,255,255,0.1)] shadow-[0_12px_28px_rgba(2,8,23,0.18)]">
                      <Image src="/brand/wolfix-logo.svg" alt="WOLFIX DIGITAL AGENCY logo" width={30} height={30} className="h-7 w-7 object-cover" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(191,219,254,0.18)] bg-[rgba(255,255,255,0.1)] text-white"
                    aria-label="Close navigation"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
                <div className="space-y-1.5">
                  {navItems.map(({ href, label, icon: Icon, description }) => {
                    const active = pathname === href;

                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition',
                          active
                            ? 'bg-[image:var(--nav-shell-active)] text-white shadow-[var(--nav-shell-active-shadow)]'
                            : 'text-[var(--nav-shell-text)] hover:bg-[var(--nav-shell-hover)] hover:text-white',
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-9 items-center justify-center rounded-xl',
                            active ? 'bg-[rgba(255,255,255,0.16)]' : 'bg-[var(--nav-shell-icon)] text-[var(--nav-shell-muted)]',
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{label}</span>
                          <span className="mt-1 block text-xs text-[rgba(226,232,240,0.78)]">{description}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-[rgba(191,219,254,0.14)] px-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    <span className="inline-flex h-11 w-full items-center justify-center rounded-[16px] border border-[rgba(191,219,254,0.16)] bg-[rgba(255,255,255,0.08)] text-sm font-semibold text-white transition hover:bg-[rgba(255,255,255,0.12)]">Sign in</span>
                  </Link>
                  <Link href="/register" onClick={() => setOpen(false)}>
                    <span className="inline-flex h-11 w-full items-center justify-center rounded-[16px] border border-[rgba(96,165,250,0.22)] bg-[linear-gradient(180deg,#2d6fd2_0%,#1d4f9a_52%,#163d79_100%)] text-sm font-semibold text-white shadow-[0_14px_26px_rgba(8,29,68,0.22)]">Create account</span>
                  </Link>
                </div>
                <div className="mt-3">
                  <InstallCtaButton
                    variant="ghost"
                    className="w-full justify-center rounded-[16px] border-[rgba(191,219,254,0.16)] bg-[rgba(255,255,255,0.08)] text-white hover:bg-[rgba(255,255,255,0.12)] hover:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
