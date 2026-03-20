'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BellRing, BriefcaseBusiness, LayoutDashboard, MessagesSquare, ShieldCheck, WalletCards } from 'lucide-react';

import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/client', label: 'Client Ops', icon: Activity },
  { href: '/dashboard/vendor', label: 'Vendor Rail', icon: WalletCards },
  { href: '/dashboard/admin', label: 'Admin Control', icon: ShieldCheck },
  { href: '/dashboard/communications', label: 'Inbox', icon: MessagesSquare },
  { href: '/dashboard/notifications', label: 'Notifications', icon: BellRing },
  { href: '/login', label: 'Access Portal', icon: BriefcaseBusiness },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="rounded-[32px] border border-[var(--line)] bg-[rgba(8,15,28,0.72)] p-4 shadow-[0_24px_90px_rgba(2,6,23,0.28)] backdrop-blur xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
      <div className="mb-8 flex items-center gap-3 rounded-3xl border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--brand-primary)] text-[var(--ink-strong)]">NM</div>
        <div>
          <p className="font-display text-lg text-[var(--text-primary)]">Nexus Market Rail</p>
          <p className="text-sm text-[var(--text-secondary)]">Trust-first enterprise cockpit</p>
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
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition',
                active
                  ? 'bg-[var(--brand-primary)] text-[var(--ink-strong)] shadow-[0_15px_40px_rgba(204,184,122,0.18)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--panel-muted)] hover:text-[var(--text-primary)]',
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
