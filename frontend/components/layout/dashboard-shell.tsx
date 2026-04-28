'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, LogOut, Menu } from 'lucide-react';
import {
  createContext,
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { Sidebar } from '@/components/layout/sidebar';
import { MarketingFooter } from '@/components/layout/marketing-footer';
import { NetworkStatusChip } from '@/components/pwa/network-status-chip';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { toLoginHref } from '@/lib/auth/login-link';

interface DashboardShellProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  mobileQuickActions?: ReactNode;
}

interface DashboardShellConfig {
  title: string;
  subtitle: string;
}

interface DashboardFrameProps extends PropsWithChildren<DashboardShellConfig> {
  mobileQuickActions?: ReactNode;
}

const DEFAULT_DASHBOARD_CONFIG: DashboardShellConfig = {
  title: 'Workspace',
  subtitle: 'Move through one page at a time from the menu on the left.',
};
const SHELL_SUMMARY_STALE_MS = 60_000;

const DashboardShellContext = createContext<{
  config: DashboardShellConfig;
  setConfig: (config: DashboardShellConfig) => void;
  mobileActionsHost: HTMLDivElement | null;
} | null>(null);

function DashboardFrame({ children, title, subtitle, mobileQuickActions }: DashboardFrameProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const hydrated = useAuthStore((state) => state.hydrated);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const logout = useAuthStore((state) => state.logout);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  const shellSummaryQuery = useQuery({
    queryKey: ['dashboard-shell-summary', token],
    queryFn: () => apiClient.getDashboardShellSummary(token ?? ''),
    enabled: hydrated && !!token,
    staleTime: SHELL_SUMMARY_STALE_MS,
    refetchOnMount: false,
  });

  const sidebarBadgeCounts = useMemo(() => {
    const notificationUnread = shellSummaryQuery.data?.notifications_unread ?? 0;
    const threadUnread = shellSummaryQuery.data?.inbox_total_unread ?? 0;
    const pendingCapabilities = shellSummaryQuery.data?.admin_pending_capabilities ?? 0;
    const disputedEscrows = shellSummaryQuery.data?.admin_disputed_escrows ?? 0;

    return {
      '/dashboard/admin-capabilities': pendingCapabilities,
      '/dashboard/admin-escrows': disputedEscrows,
      '/dashboard/notifications': notificationUnread,
      '/dashboard/communications': threadUnread,
    };
  }, [shellSummaryQuery.data]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace(toLoginHref({ reason: 'signed-out' }));
  }, [logout, router]);

  useEffect(() => {
    if (!hydrated) {
      void bootstrap();
    }
  }, [bootstrap, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!user) {
      router.replace(
        toLoginHref({
          reason: 'session-required',
          next: pathname?.startsWith('/dashboard') ? pathname : null,
        }),
      );
      return;
    }

    if (!user.is_verified) {
      void (async () => {
        await logout();
        router.replace(
          toLoginHref({
            reason: 'verify-required',
            email: user.email,
          }),
        );
      })();
    }
  }, [hydrated, logout, pathname, router, user]);

  if (!hydrated) {
    return <main className="flex min-h-screen items-center justify-center text-[var(--text-secondary)]">Loading workspace...</main>;
  }

  if (!user?.is_verified) {
    return <main className="flex min-h-screen items-center justify-center text-[var(--text-secondary)]">Redirecting to secure login...</main>;
  }

  const sidebarFooter = (
    <div className="grid grid-cols-2 gap-3">
      <Link href="/">
        <Button variant="ghost" className="w-full justify-center">
          <Home className="mr-2 size-4" />
          Home
        </Button>
      </Link>
      <Button variant="ghost" className="w-full justify-center" onClick={() => void handleLogout()}>
        <LogOut className="mr-2 size-4" />
        Log out
      </Button>
    </div>
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#e7edf5_0%,#f5f7fb_22%,#f8fafc_100%)]">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[248px_minmax(0,1fr)]">
        <div className="hidden lg:block lg:border-r lg:border-[rgba(191,219,254,0.16)] lg:bg-[image:var(--nav-shell-bg)]">
          <div className="sticky top-0 h-screen">
            <Sidebar badgeCounts={sidebarBadgeCounts} footerActions={sidebarFooter} />
          </div>
        </div>

        <section className="flex min-h-screen flex-col bg-[rgba(255,255,255,0.72)] backdrop-blur-[2px]">
          <div className="sticky top-0 z-30 border-b border-[rgba(191,219,254,0.16)] bg-[color:var(--shell-dark-blue)] shadow-[0_18px_42px_rgba(2,8,23,0.18)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8 xl:px-10">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileNavigationOpen(true)}
                  className="inline-flex size-10 items-center justify-center rounded-2xl border border-[rgba(191,219,254,0.18)] bg-[rgba(255,255,255,0.1)] text-white lg:hidden"
                  aria-expanded={mobileNavigationOpen}
                  aria-controls="dashboard-navigation-panel"
                  aria-label="Open navigation"
                >
                  <Menu className="size-5" />
                </button>

                <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 items-center justify-center overflow-hidden rounded-2xl border border-[rgba(191,219,254,0.18)] bg-[rgba(255,255,255,0.08)] shadow-[0_10px_24px_rgba(2,8,23,0.18)]">
                    <Image src="/brand/wolfix-logo.svg" alt="WOLFIX DIGITAL AGENCY logo" width={34} height={34} className="h-8 w-8 object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-[rgba(191,219,254,0.82)]">WOLFIX</p>
                    <p className="truncate text-sm font-medium text-white">{title}</p>
                  </div>
                </Link>
              </div>

              <div className="flex items-center gap-3">
                <NetworkStatusChip variant="dark" />
                <div className="hidden rounded-full border border-[rgba(191,219,254,0.18)] bg-[rgba(255,255,255,0.08)] px-4 py-2 text-sm text-white shadow-[0_10px_24px_rgba(2,8,23,0.12)] lg:block">
                  {user.email}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-6 xl:px-10">

            {mobileNavigationOpen ? (
              <div className="lg:hidden">
                <div className="fixed inset-0 z-40 bg-[rgba(15,23,42,0.34)]" onClick={() => setMobileNavigationOpen(false)} aria-hidden="true" />
                <div id="dashboard-navigation-panel" className="fixed inset-y-3 left-3 z-50 w-[min(18rem,calc(100vw-1.5rem))]">
                  <Sidebar
                    mobile
                    badgeCounts={sidebarBadgeCounts}
                    onNavigate={() => setMobileNavigationOpen(false)}
                    onClose={() => setMobileNavigationOpen(false)}
                    footerActions={sidebarFooter}
                  />
                </div>
              </div>
            ) : null}

            <header className="mb-8 lg:mb-10">
              <div className="relative overflow-hidden rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.96))] px-5 py-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)] sm:px-6 sm:py-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.14),rgba(255,255,255,0)_72%)]" />
                <div className="pointer-events-none absolute left-6 top-0 h-1.5 w-28 rounded-b-full bg-[linear-gradient(90deg,rgba(37,99,235,0.34),#2563eb)] shadow-[0_12px_24px_rgba(37,99,235,0.16)]" />

                <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(37,99,235,0.12)] bg-white/82 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#2563eb] shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                      <span className="size-2 rounded-full bg-[#2563eb]" />
                      Workspace shell
                    </div>
                    <h1 className="mt-4 text-[1.9rem] font-semibold tracking-[-0.04em] text-[#0f172a] sm:text-[2.2rem]">{title}</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64748b]">{subtitle}</p>
                  </div>
                  <div className="hidden lg:flex items-center gap-2 rounded-full border border-[rgba(148,163,184,0.18)] bg-white/78 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)] shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                    <span className="size-2 rounded-full bg-[var(--accent-cyan)]" />
                    Live dashboard
                  </div>
                </div>
              </div>
            </header>

            {mobileQuickActions ? <div className="mb-6 lg:hidden animate-fade-up">{mobileQuickActions}</div> : null}

            <div className="flex-1 space-y-8">{children}</div>
          </div>

          <MarketingFooter variant="compact" />
        </section>
      </div>
    </main>
  );
}

export function DashboardLayoutFrame({ children }: PropsWithChildren) {
  const [config, setConfig] = useState<DashboardShellConfig>(DEFAULT_DASHBOARD_CONFIG);
  const [mobileActionsHost, setMobileActionsHost] = useState<HTMLDivElement | null>(null);

  const updateConfig = useCallback((nextConfig: DashboardShellConfig) => {
    setConfig((current) => {
      if (current.title === nextConfig.title && current.subtitle === nextConfig.subtitle) {
        return current;
      }

      return nextConfig;
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      config,
      setConfig: updateConfig,
      mobileActionsHost,
    }),
    [config, mobileActionsHost, updateConfig],
  );

  return (
    <DashboardShellContext.Provider value={contextValue}>
      <DashboardFrame title={config.title} subtitle={config.subtitle}>
        <div ref={setMobileActionsHost} className="lg:hidden" />
        {children}
      </DashboardFrame>
    </DashboardShellContext.Provider>
  );
}

export function DashboardShell({ children, title, subtitle, mobileQuickActions }: DashboardShellProps) {
  const context = useContext(DashboardShellContext);

  useLayoutEffect(() => {
    if (!context) {
      return;
    }

    context.setConfig({ title, subtitle });
  }, [context, subtitle, title]);

  if (context) {
    return (
      <>
        {mobileQuickActions && context.mobileActionsHost ? createPortal(<div className="mb-5">{mobileQuickActions}</div>, context.mobileActionsHost) : null}
        {children}
      </>
    );
  }

  return (
    <DashboardFrame title={title} subtitle={subtitle} mobileQuickActions={mobileQuickActions}>
      {children}
    </DashboardFrame>
  );
}
