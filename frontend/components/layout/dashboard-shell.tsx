'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';
import { type PropsWithChildren, type ReactNode, useEffect, useState } from 'react';

import { CommandPalette } from '@/components/layout/command-palette';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth/store';

interface DashboardShellProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  mobileQuickActions?: ReactNode;
}

export function DashboardShell({ children, title, subtitle, mobileQuickActions }: DashboardShellProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const logout = useAuthStore((state) => state.logout);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = user?.roles.includes('ROLE_ADMIN') ?? false;
  const isVendor = user?.roles.includes('ROLE_VENDOR') ?? false;
  const workspaceLabel = isAdmin ? 'Operations workspace' : isVendor ? 'Vendor studio' : 'Client workspace';

  useEffect(() => {
    if (hydrated && !user) {
      router.replace('/login');
    }
  }, [hydrated, router, user]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  if (!hydrated) {
    return <main className="flex min-h-screen items-center justify-center text-[var(--text-secondary)]">Hydrating workspace...</main>;
  }

  if (!user) {
    return <main className="flex min-h-screen items-center justify-center text-[var(--text-secondary)]">Redirecting to secure login...</main>;
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-[1560px] gap-6 px-4 py-4 xl:grid-cols-[300px_1fr] xl:px-6 xl:py-6">
      <div className="hidden xl:block">
        <Sidebar />
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(4,10,28,0.62)] backdrop-blur-sm"
            aria-label="Close menu overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="animate-slide-in-left relative h-full max-w-[320px] p-4">
            <Sidebar mobile onNavigate={() => setMobileMenuOpen(false)} onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      ) : null}

      <section
        className={`rounded-[32px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(8,20,48,0.88),rgba(13,30,74,0.8))] p-6 shadow-[var(--shadow-panel)] backdrop-blur-2xl lg:p-8 ${mobileQuickActions ? 'pb-28 lg:pb-8' : ''}`}
      >
        <div className="mb-6 flex items-center justify-between gap-4 rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(15,34,82,0.84),rgba(14,31,74,0.68))] px-4 py-3 xl:hidden">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-secondary)]">WOLFIX workspace</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex size-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] text-[var(--text-primary)] transition hover:bg-[var(--panel-strong)]"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
        </div>

        <div className="mb-8 flex flex-col gap-5 border-b border-[var(--line)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.24em] text-[var(--brand-secondary)]">{workspaceLabel}</p>
            <h1 className="font-display text-4xl text-[var(--text-primary)]">{title}</h1>
            <p className="mt-3 max-w-3xl text-[var(--text-secondary)]">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-[var(--line)] bg-[rgba(18,40,92,0.68)] px-4 py-2 text-sm text-[var(--text-secondary)]">
              {user.email}
            </div>
            <CommandPalette roles={user.roles} />
            <Link href="/">
              <Button variant="ghost">Home</Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                logout();
                router.push('/login');
              }}
            >
              <LogOut className="mr-2 size-4" />
              Log out
            </Button>
          </div>
        </div>
        {children}
        <div className="mt-8 border-t border-[var(--line)] pt-5 text-sm text-[var(--text-tertiary)]">
          {isAdmin
            ? 'WOLFIX operations keeps disputes, watchlists, and account controls inside one deliberate operating surface.'
            : isVendor
              ? 'WOLFIX studio keeps listings, delivery, communication, and payout readiness inside one business surface.'
              : 'WOLFIX bookings keeps discovery, protected payment, communication, and delivery follow-up inside one buyer surface.'}
        </div>
      </section>

      {mobileQuickActions ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 px-4 xl:hidden">
          <div className="pointer-events-auto mx-auto max-w-[720px] rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(12,29,72,0.94),rgba(11,26,60,0.92))] p-3 shadow-[0_24px_64px_rgba(2,8,24,0.52)] backdrop-blur-2xl">
            {mobileQuickActions}
          </div>
        </div>
      ) : null}
    </main>
  );
}
