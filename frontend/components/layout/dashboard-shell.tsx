'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { type PropsWithChildren, useEffect } from 'react';

import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth/store';

interface DashboardShellProps extends PropsWithChildren {
  title: string;
  subtitle: string;
}

export function DashboardShell({ children, title, subtitle }: DashboardShellProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (hydrated && !user) {
      router.replace('/login');
    }
  }, [hydrated, router, user]);

  if (!hydrated) {
    return <main className="flex min-h-screen items-center justify-center text-[var(--text-secondary)]">Hydrating workspace...</main>;
  }

  if (!user) {
    return <main className="flex min-h-screen items-center justify-center text-[var(--text-secondary)]">Redirecting to secure login...</main>;
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-[1560px] gap-6 px-4 py-4 xl:grid-cols-[300px_1fr] xl:px-6 xl:py-6">
      <Sidebar />
      <section className="rounded-[32px] border border-[var(--line)] bg-[rgba(9,21,37,0.72)] p-6 shadow-[0_24px_90px_rgba(2,6,23,0.2)] backdrop-blur lg:p-8">
        <div className="mb-8 flex flex-col gap-5 border-b border-[var(--line)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.24em] text-[var(--brand-secondary)]">Operational dashboard</p>
            <h1 className="font-display text-4xl text-[var(--text-primary)]">{title}</h1>
            <p className="mt-3 max-w-3xl text-[var(--text-secondary)]">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-sm text-[var(--text-secondary)]">
              {user.email}
            </div>
            <Link href="/">
              <Button variant="ghost">Marketing view</Button>
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
      </section>
    </main>
  );
}
