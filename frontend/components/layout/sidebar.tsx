'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BellRing, BriefcaseBusiness, LayoutDashboard, MessagesSquare, ShieldCheck, WalletCards, X } from 'lucide-react';

import { useAuthStore } from '@/lib/auth/store';
import { cn } from '@/lib/utils';

interface SidebarItem {
  href: string;
  label: string;
  helper: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
}

function buildItems(roles: string[]): SidebarItem[] {
  const isAdmin = roles.includes('ROLE_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');
  const isClient = !isAdmin && !isVendor;

  return [
    {
      href: '/dashboard',
      label: 'Overview',
      helper: 'Read the command center first.',
      icon: LayoutDashboard,
    },
    {
      href: '/dashboard/client',
      label: isClient ? 'Client desk' : 'Bookings',
      helper: isClient ? 'Browse services and manage protected work.' : 'Open buyer-side booking flow.',
      icon: Activity,
      roles: ['ROLE_USER'],
    },
    {
      href: '/dashboard/vendor',
      label: isVendor ? 'Service studio' : 'Provider lane',
      helper: isVendor ? 'Run listings, delivery, and payout work.' : 'Open provider-side studio controls.',
      icon: WalletCards,
      roles: ['ROLE_VENDOR'],
    },
    {
      href: '/dashboard/admin',
      label: isAdmin ? 'Operations desk' : 'Operations',
      helper: isAdmin ? 'Review disputes, watchlists, and account controls.' : 'Open platform-wide operations lane.',
      icon: ShieldCheck,
      roles: ['ROLE_ADMIN'],
    },
    {
      href: '/dashboard/communications',
      label: 'Inbox',
      helper: isVendor ? 'Client delivery conversations.' : isAdmin ? 'Context before intervention.' : 'Provider replies and follow-up.',
      icon: MessagesSquare,
    },
    {
      href: '/dashboard/notifications',
      label: 'Alerts',
      helper: isAdmin ? 'Operational risk and finance alerts.' : isVendor ? 'Studio alerts and payout signals.' : 'Booking and payment alerts.',
      icon: BellRing,
    },
    {
      href: '/login',
      label: 'Sign In',
      helper: 'Return to secure access.',
      icon: BriefcaseBusiness,
    },
  ].filter((item) => !item.roles || item.roles.some((role) => roles.includes(role)));
}

interface SidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}

export function Sidebar({ mobile = false, onNavigate, onClose }: SidebarProps) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes('ROLE_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');
  const items = buildItems(roles);
  const workspaceLabel = isAdmin ? 'Operations workspace' : isVendor ? 'Vendor studio' : 'Client workspace';
  const workspaceDetail = isAdmin
    ? 'Platform control and risk review'
    : isVendor
      ? 'Listings, delivery, and earnings'
      : 'Bookings, escrow, and delivery';

  return (
    <aside
      className={cn(
        'rounded-[32px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(8,20,48,0.94),rgba(13,30,74,0.86))] p-4 shadow-[var(--shadow-panel)] backdrop-blur-2xl',
        mobile ? 'h-full' : 'xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]',
      )}
    >
      {mobile ? (
        <div className="mb-4 flex items-center justify-between rounded-3xl border border-[var(--line)] bg-[linear-gradient(180deg,rgba(15,34,82,0.9),rgba(14,31,74,0.72))] px-4 py-3">
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--brand-secondary)]">Navigation</p>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] text-[var(--text-primary)] transition hover:bg-[var(--panel-strong)]"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <div className="mb-8 flex items-center gap-3 rounded-3xl border border-[var(--line)] bg-[linear-gradient(180deg,rgba(15,34,82,0.9),rgba(14,31,74,0.72))] px-4 py-4">
        <div className="flex size-11 items-center justify-center overflow-hidden rounded-2xl bg-[rgba(255,255,255,0.94)] shadow-[0_10px_26px_rgba(8,29,94,0.18)]">
          <Image src="/brand/wolfix-logo.svg" alt="WOLFIX DIGITAL AGENCY logo" width={44} height={44} className="h-full w-full object-cover" />
        </div>
        <div>
          <p className="font-display text-lg text-[var(--text-primary)]">WOLFIX DIGITAL AGENCY</p>
          <p className="text-sm text-[var(--text-secondary)]">{workspaceLabel}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{workspaceDetail}</p>
        </div>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-start gap-3 rounded-2xl px-4 py-3 text-sm transition',
                active
                  ? 'bg-[linear-gradient(135deg,rgba(47,107,255,0.28),rgba(22,53,154,0.2))] text-white shadow-[inset_0_0_0_1px_rgba(184,208,255,0.24)]'
                  : 'text-[var(--text-secondary)] hover:bg-[rgba(18,40,92,0.72)] hover:text-[var(--text-primary)]',
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">
                <span className="block">{item.label}</span>
                <span className={cn('mt-1 block text-xs leading-5', active ? 'text-[rgba(226,236,255,0.82)]' : 'text-[var(--text-tertiary)]')}>
                  {item.helper}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-3xl border border-[var(--line)] bg-[linear-gradient(180deg,rgba(18,40,92,0.86),rgba(14,31,74,0.72))] p-4 text-sm text-[var(--text-secondary)]">
        {isAdmin
          ? 'Keep disputes, risk, and account controls inside one deliberate operations surface.'
          : isVendor
            ? 'Keep listings, live delivery, payouts, and client communication inside one studio surface.'
            : 'Keep service discovery, protected payment, and delivery follow-up inside one buyer surface.'}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          <span className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.06)] px-2.5 py-1">Quick search</span>
          <span className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.06)] px-2.5 py-1">Ctrl/Cmd K</span>
        </div>
      </div>
    </aside>
  );
}
