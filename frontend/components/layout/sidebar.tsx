'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BellRing, ClipboardList, LayoutDashboard, MessagesSquare, ShieldCheck, Users, WalletCards, X } from 'lucide-react';
import { type ReactNode } from 'react';
import { useAuthStore } from '@/lib/auth/store';
import { cn } from '@/lib/utils';

interface SidebarItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
}

function buildItems(roles: string[]): SidebarItem[] {
  const isAdmin = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');
  const isClient = !isAdmin && !isVendor;

  if (isClient) {
    return [
      { href: '/dashboard/client', label: 'Welcome', icon: LayoutDashboard },
      { href: '/dashboard/request-services', label: 'Business Lanes', icon: Activity },
      { href: '/dashboard/requests', label: 'Requests', icon: ClipboardList },
      { href: '/dashboard', label: 'Bookings', icon: WalletCards },
      { href: '/dashboard/communications', label: 'Inbox', icon: MessagesSquare },
      { href: '/dashboard/notifications', label: 'Alerts', icon: BellRing },
    ];
  }

  if (isVendor) {
    return [
      { href: '/dashboard/vendor', label: 'Welcome', icon: LayoutDashboard },
      { href: '/dashboard/vendor-capabilities', label: 'Capability Lanes', icon: Activity },
      { href: '/dashboard/vendor-requests', label: 'Requests', icon: ClipboardList },
      { href: '/dashboard/vendor-withdrawals', label: 'Withdrawals', icon: WalletCards },
      { href: '/dashboard', label: 'Bookings', icon: WalletCards },
      { href: '/dashboard/communications', label: 'Inbox', icon: MessagesSquare },
      { href: '/dashboard/notifications', label: 'Alerts', icon: BellRing },
    ];
  }

  return [
    { href: '/dashboard/admin', label: 'Welcome', icon: LayoutDashboard, roles: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
    { href: '/dashboard/admin-requests', label: 'Requests', icon: ClipboardList, roles: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
    { href: '/dashboard/admin-capabilities', label: 'Capability Lanes', icon: Activity, roles: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
    { href: '/dashboard/admin-users', label: 'Users', icon: Users, roles: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
    { href: '/dashboard/admin-escrows', label: 'Disputes', icon: ShieldCheck, roles: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
    { href: '/dashboard', label: 'Bookings', icon: WalletCards, roles: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
    { href: '/dashboard/communications', label: 'Inbox', icon: MessagesSquare },
    { href: '/dashboard/notifications', label: 'Alerts', icon: BellRing },
  ].filter((item) => !item.roles || item.roles.some((role) => roles.includes(role)));
}

interface SidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
  footerActions?: ReactNode;
  badgeCounts?: Partial<Record<string, number>>;
}

function isItemActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname.startsWith('/dashboard/bookings/');
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ mobile = false, onNavigate, onClose, footerActions, badgeCounts = {} }: SidebarProps) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const items = buildItems(roles);

  return (
    <aside
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-[30px] border bg-[image:var(--nav-shell-bg)] text-[var(--nav-shell-text)]',
        'border-[color:var(--nav-shell-border)]',
        mobile ? 'shadow-[var(--nav-shell-shadow-mobile)]' : 'shadow-[var(--nav-shell-shadow)]',
      )}
    >
      <div className="flex items-center justify-between border-b border-[color:var(--nav-shell-line)] px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--nav-shell-line)] bg-[var(--nav-shell-chip)] backdrop-blur">
            <Image src="/brand/wolfix-logo.svg" alt="WOLFIX DIGITAL AGENCY logo" width={40} height={40} className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-base font-semibold text-[var(--nav-shell-text)]">WOLFIX</p>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--nav-shell-muted)]">Menu</p>
          </div>
        </div>
        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-2xl border border-[color:var(--nav-shell-line)] bg-[var(--nav-shell-chip)] text-[var(--nav-shell-text)]"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1.5">
          {items.map((item) => {
            const active = isItemActive(pathname, item.href);
            const Icon = item.icon;
            const badgeCount = badgeCounts[item.href] ?? 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-medium transition',
                  active
                    ? 'bg-[image:var(--nav-shell-active)] text-white shadow-[var(--nav-shell-active-shadow)]'
                    : 'text-[var(--nav-shell-text)] hover:bg-[var(--nav-shell-hover)] hover:text-[#0f172a]',
                )}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-xl',
                      active ? 'bg-[rgba(255,255,255,0.16)]' : 'bg-[var(--nav-shell-icon)] text-[var(--nav-shell-muted)]',
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span>{item.label}</span>
                </span>
                {badgeCount > 0 ? (
                  <span
                    className={cn(
                      'min-w-[1.6rem] rounded-full px-2 py-1 text-center text-[11px] font-semibold',
                      active ? 'bg-[rgba(255,255,255,0.18)] text-white' : 'bg-[var(--nav-shell-badge-bg)] text-[var(--nav-shell-badge)]',
                    )}
                  >
                    {badgeCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      {footerActions ? <div className="border-t border-[color:var(--nav-shell-line)] px-4 py-4">{footerActions}</div> : null}
    </aside>
  );
}
