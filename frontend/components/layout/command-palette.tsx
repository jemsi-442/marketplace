'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Command, LayoutDashboard, MessagesSquare, Search, ShieldCheck, WalletCards, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';

interface CommandPaletteProps {
  roles: string[];
}

interface CommandItem {
  href: string;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
  keywords: string;
}

const commandItems: CommandItem[] = [
  {
    href: '/dashboard',
    label: 'Overview',
    description: 'Open the main workspace summary and quick routes.',
    icon: LayoutDashboard,
    keywords: 'overview home summary dashboard',
  },
  {
    href: '/dashboard/client',
    label: 'Client desk',
    description: 'Open service discovery, bookings, escrow actions, and delivery follow-up.',
    icon: WalletCards,
    roles: ['ROLE_USER'],
    keywords: 'client bookings escrow services buy',
  },
  {
    href: '/dashboard/vendor',
    label: 'Service studio',
    description: 'Manage services, profile, wallet, and delivery work.',
    icon: WalletCards,
    roles: ['ROLE_VENDOR'],
    keywords: 'vendor studio services payouts profile',
  },
  {
    href: '/dashboard/admin',
    label: 'Operations',
    description: 'Review metrics, disputes, risk, and account controls.',
    icon: ShieldCheck,
    roles: ['ROLE_ADMIN'],
    keywords: 'admin operations risk disputes metrics',
  },
  {
    href: '/dashboard/communications',
    label: 'Inbox',
    description: 'Review conversations and reply quickly.',
    icon: MessagesSquare,
    keywords: 'communications inbox messages',
  },
  {
    href: '/dashboard/notifications',
    label: 'Notifications',
    description: 'Check alerts, unread items, and operational signals.',
    icon: Command,
    keywords: 'notifications alerts unread risk finance',
  },
];

export function CommandPalette({ roles }: CommandPaletteProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const shortcutLabel = 'Ctrl/Cmd K';

  function openPalette() {
    setQuery('');
    setOpen(true);
  }

  function closePalette() {
    setQuery('');
    setOpen(false);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (open) {
          closePalette();
        } else {
          openPalette();
        }
      }

      if (event.key === 'Escape') {
        closePalette();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return commandItems
      .filter((item) => !item.roles || item.roles.some((role) => roles.includes(role)))
      .filter((item) => {
        if (!normalized) {
          return true;
        }

        const haystack = `${item.label} ${item.description} ${item.keywords}`.toLowerCase();
        return haystack.includes(normalized);
      });
  }, [query, roles]);
  const isAdmin = roles.includes('ROLE_ADMIN');
  const isVendor = roles.includes('ROLE_VENDOR');
  const paletteHint = isAdmin
    ? 'Search operations routes, watchlists, inbox, and alerts.'
    : isVendor
      ? 'Search studio routes, delivery work, inbox, and alerts.'
      : 'Search booking routes, service discovery, inbox, and alerts.';

  return (
    <>
      <Button variant="ghost" size="sm" onClick={openPalette}>
        <Command className="mr-2 size-4" />
        Quick search
        <span className="ml-2 rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.06)] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          {shortcutLabel}
        </span>
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-[rgba(2,9,23,0.58)] p-4 backdrop-blur-sm">
          <div className="mx-auto mt-16 max-w-2xl rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(10,24,70,0.96),rgba(16,38,96,0.9))] p-5 shadow-[var(--shadow-panel)]">
            <div className="flex items-center gap-3 border-b border-[var(--line)] pb-4">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-[var(--panel-strong)] text-[var(--brand-secondary)]">
                <Search className="size-4" />
              </div>
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search routes, tasks, and workspace areas..."
                className="border-none bg-transparent px-0"
              />
              <Button variant="quiet" size="sm" onClick={closePalette} aria-label="Close quick search">
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              <span className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.05)] px-3 py-1.5">Type to filter routes</span>
              <span className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.05)] px-3 py-1.5">{shortcutLabel} to reopen</span>
              <span className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.05)] px-3 py-1.5">Esc to close</span>
            </div>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">{paletteHint}</p>

            <div className="mt-4 space-y-3">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closePalette}
                    className={`flex items-start gap-4 rounded-[22px] border px-4 py-4 transition ${
                      active
                        ? 'border-[var(--brand-primary)] bg-[rgba(78,137,255,0.14)]'
                        : 'border-[var(--line)] bg-[var(--panel-muted)] hover:bg-[var(--panel-strong)]'
                    }`}
                  >
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-[var(--panel-strong)] text-[var(--brand-secondary)]">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="font-display text-lg text-[var(--text-primary)]">{item.label}</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.description}</p>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{item.keywords}</p>
                    </div>
                  </Link>
                );
              })}

              {!visibleItems.length ? (
                <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-5 text-sm text-[var(--text-secondary)]">
                  No workspace route matches that search yet.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
