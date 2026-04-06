'use client';

import { useQuery } from '@tanstack/react-query';
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
    <main className="mx-auto min-h-screen max-w-[1420px] px-4 py-4 lg:px-5">
      <div className="hidden lg:fixed lg:top-4 lg:left-[max(1.25rem,calc((100vw-1420px)/2+1.25rem))] lg:block lg:h-[calc(100vh-2rem)] lg:w-[272px]">
        <Sidebar badgeCounts={sidebarBadgeCounts} footerActions={sidebarFooter} />
      </div>

      <section className="flex min-h-[calc(100vh-2rem)] flex-col rounded-[30px] border border-[#e5e7eb] bg-white px-5 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:px-6 sm:py-6 lg:ml-[292px]">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#eef2f7] pb-4 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavigationOpen(true)}
              className="inline-flex size-10 items-center justify-center rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] text-[#0f172a]"
              aria-expanded={mobileNavigationOpen}
              aria-controls="dashboard-navigation-panel"
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <p className="text-base font-semibold text-[#0f172a]">{title}</p>
              <p className="text-xs text-[#64748b]">WOLFIX</p>
            </div>
          </div>
          <NetworkStatusChip />
        </div>

        {mobileNavigationOpen ? (
          <div className="lg:hidden">
            <div className="fixed inset-0 z-40 bg-[rgba(15,23,42,0.34)]" onClick={() => setMobileNavigationOpen(false)} aria-hidden="true" />
            <div id="dashboard-navigation-panel" className="fixed inset-y-4 left-4 z-50 w-[min(18rem,calc(100vw-2rem))]">
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

        <header className="mb-5 border-b border-[#eef2f7] pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[1.9rem] font-semibold text-[#0f172a] sm:text-[2.2rem]">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64748b]">{subtitle}</p>
            </div>
            <div className="hidden items-center gap-3 lg:flex">
              <NetworkStatusChip />
              <div className="rounded-full border border-[#e5e7eb] bg-[#f8fafc] px-4 py-2 text-sm text-[#475569]">{user.email}</div>
            </div>
          </div>
        </header>

        {mobileQuickActions ? <div className="mb-5 lg:hidden">{mobileQuickActions}</div> : null}

        <div className="flex-1 space-y-6">{children}</div>

        <MarketingFooter variant="compact" />
      </section>
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
