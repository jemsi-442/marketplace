'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Command, LayoutDashboard, MessagesSquare, Pencil, Search, ShieldCheck, Sparkles, Star, WalletCards, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { getFavoriteIcon, getFavoriteToneClasses } from '@/lib/ui/favorite-route-style';
import { getSuggestedFavoriteRoute, getWorkItemLabel, useRecentWorkStore } from '@/lib/ui/recent-work-store';
import { getWorkspaceViewLabel, useWorkspaceViewStore } from '@/lib/ui/workspace-view-store';

interface CommandPaletteProps {
  roles: string[];
  userKey: string;
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
    description: 'Open lane discovery, bookings, escrow actions, and delivery follow-up.',
    icon: WalletCards,
    roles: ['ROLE_USER'],
    keywords: 'client bookings escrow lanes services buy',
  },
  {
    href: '/dashboard/vendor',
    label: 'Capability studio',
    description: 'Manage capabilities, profile, wallet, and delivery work.',
    icon: WalletCards,
    roles: ['ROLE_VENDOR'],
    keywords: 'vendor studio capability capabilities payouts profile',
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

export function CommandPalette({ roles, userKey }: CommandPaletteProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [editingFavoriteHref, setEditingFavoriteHref] = useState<string | null>(null);
  const [favoriteLabelDraft, setFavoriteLabelDraft] = useState('');
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [viewLabelDraft, setViewLabelDraft] = useState('');
  const recentItems = useRecentWorkStore((state) => state.items);
  const favoriteItems = useRecentWorkStore((state) => state.favorites);
  const routeStats = useRecentWorkStore((state) => state.routeStats);
  const clearRecentForUser = useRecentWorkStore((state) => state.clearRecent);
  const clearFavoritesForUser = useRecentWorkStore((state) => state.clearFavorites);
  const toggleFavorite = useRecentWorkStore((state) => state.toggleFavorite);
  const renameFavorite = useRecentWorkStore((state) => state.renameFavorite);
  const workspaceViews = useWorkspaceViewStore((state) => state.items);
  const renameView = useWorkspaceViewStore((state) => state.renameView);
  const clearViews = useWorkspaceViewStore((state) => state.clearViews);
  const shortcutLabel = 'Ctrl/Cmd K';

  function openPalette() {
    setQuery('');
    setOpen(true);
  }

  function closePalette() {
    setQuery('');
    setEditingFavoriteHref(null);
    setFavoriteLabelDraft('');
    setEditingViewId(null);
    setViewLabelDraft('');
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
  const recentWorkItems = useMemo(
    () => recentItems.filter((item) => item.userKey === userKey && item.href !== pathname).slice(0, 4),
    [pathname, recentItems, userKey],
  );
  const favoriteWorkItems = useMemo(
    () => favoriteItems.filter((item) => item.userKey === userKey).slice(0, 4),
    [favoriteItems, userKey],
  );
  const suggestedFavorite = useMemo(
    () => getSuggestedFavoriteRoute({ routeStats, favorites: favoriteItems, userKey }),
    [favoriteItems, routeStats, userKey],
  );
  const savedViews = useMemo(
    () => workspaceViews.filter((item) => item.userKey === userKey).slice(0, 4),
    [userKey, workspaceViews],
  );

  function isFavorite(href: string) {
    return favoriteWorkItems.some((item) => item.href === href);
  }

  function startRenaming(href: string, currentLabel: string) {
    setEditingFavoriteHref(href);
    setFavoriteLabelDraft(currentLabel);
  }

  function submitFavoriteRename(href: string) {
    renameFavorite(userKey, href, favoriteLabelDraft);
    setEditingFavoriteHref(null);
    setFavoriteLabelDraft('');
  }

  function startViewRename(id: string, currentLabel: string) {
    setEditingViewId(id);
    setViewLabelDraft(currentLabel);
  }

  function submitViewRename(id: string) {
    renameView(userKey, id, viewLabelDraft);
    setEditingViewId(null);
    setViewLabelDraft('');
  }

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
              <span className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.05)] px-3 py-1.5">
                {recentWorkItems.length ? `${recentWorkItems.length} recent` : 'role routes'}
              </span>
              {recentWorkItems.length ? (
                <button
                  type="button"
                  onClick={() => clearRecentForUser(userKey)}
                  className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.05)] px-3 py-1.5 transition hover:bg-[rgba(255,255,255,0.1)]"
                >
                  Clear recent
                </button>
              ) : null}
              {favoriteWorkItems.length ? (
                <button
                  type="button"
                  onClick={() => clearFavoritesForUser(userKey)}
                  className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.05)] px-3 py-1.5 transition hover:bg-[rgba(255,255,255,0.1)]"
                >
                  Clear favorites
                </button>
              ) : null}
              {savedViews.length ? (
                <button
                  type="button"
                  onClick={() => clearViews(userKey)}
                  className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.05)] px-3 py-1.5 transition hover:bg-[rgba(255,255,255,0.1)]"
                >
                  Clear views
                </button>
              ) : null}
            </div>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">{paletteHint}</p>

            {savedViews.length ? (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Saved views</p>
                <div className="mt-3 space-y-3">
                  {savedViews.map((item) => {
                    const ViewIcon = getFavoriteIcon(item.icon);
                    const viewTone = getFavoriteToneClasses(item.tone);

                    return (
                      <div key={item.id}>
                        <div className="flex items-start gap-3">
                          <Link
                            href={item.href}
                            onClick={closePalette}
                            className="flex flex-1 items-start gap-4 rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-4 transition hover:bg-[rgba(255,255,255,0.08)]"
                          >
                            <div className={`flex size-10 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.08)] ${viewTone.text}`}>
                              <ViewIcon className="size-4" />
                            </div>
                            <div>
                              <p className="font-display text-lg text-[var(--text-primary)]">{getWorkspaceViewLabel(item)}</p>
                              <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.subtitle ?? 'Saved workspace shortcut.'}</p>
                            </div>
                          </Link>
                          <Button
                            type="button"
                            variant="quiet"
                            size="sm"
                            onClick={() => startViewRename(item.id, item.customLabel ?? item.title)}
                            aria-label={`Rename ${getWorkspaceViewLabel(item)} saved view`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </div>
                        {editingViewId === item.id ? (
                          <div className="mt-3 rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] p-4">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Rename view</p>
                            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                              <input
                                value={viewLabelDraft}
                                onChange={(event) => setViewLabelDraft(event.target.value)}
                                placeholder="Type a short custom label..."
                                className="border-none bg-[rgba(255,255,255,0.08)]"
                              />
                              <div className="flex gap-2">
                                <Button type="button" size="sm" onClick={() => submitViewRename(item.id)}>
                                  <Check className="mr-2 size-4" />
                                  Save label
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingViewId(null);
                                    setViewLabelDraft('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {!favoriteWorkItems.length && suggestedFavorite ? (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Suggested favorite</p>
                <div className="mt-3 flex items-start gap-3">
                  <Link
                    href={suggestedFavorite.href}
                    onClick={closePalette}
                    className="flex flex-1 items-start gap-4 rounded-[22px] border border-[rgba(245,158,11,0.14)] bg-[rgba(245,158,11,0.08)] px-4 py-4 transition hover:bg-[rgba(245,158,11,0.12)]"
                  >
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.08)] text-[var(--accent-amber)]">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <p className="font-display text-lg text-[var(--text-primary)]">{suggestedFavorite.title}</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {suggestedFavorite.subtitle ?? 'This lane keeps showing up. Pin it for faster return.'}
                      </p>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                        {suggestedFavorite.visitCount} visits recently
                      </p>
                    </div>
                  </Link>
                  <Button
                    type="button"
                    variant="quiet"
                    size="sm"
                    onClick={() => toggleFavorite({
                      href: suggestedFavorite.href,
                      title: suggestedFavorite.title,
                      subtitle: suggestedFavorite.subtitle,
                      userKey,
                    })}
                    aria-label={`Pin ${suggestedFavorite.title} as favorite route`}
                  >
                    <Star className="size-4 text-[var(--accent-amber)]" />
                  </Button>
                </div>
              </div>
            ) : null}

            {favoriteWorkItems.length ? (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Favorite routes</p>
                <div className="mt-3 space-y-3">
                  {favoriteWorkItems.map((item) => {
                    const FavoriteIcon = getFavoriteIcon(item.icon);
                    const favoriteTone = getFavoriteToneClasses(item.tone);

                    return (
                      <div key={`${item.userKey}-${item.href}`} className="flex items-start gap-3">
                        <Link
                          href={item.href}
                          onClick={closePalette}
                          className="flex flex-1 items-start gap-4 rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] px-4 py-4 transition hover:bg-[rgba(255,255,255,0.1)]"
                        >
                          <div className={`flex size-10 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.08)] ${favoriteTone.text}`}>
                            <FavoriteIcon className="size-4" />
                          </div>
                          <div>
                            <p className="font-display text-lg text-[var(--text-primary)]">{getWorkItemLabel(item)}</p>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.subtitle ?? 'Pinned route for fast return.'}</p>
                            <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                              {new Date(item.savedAt).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </Link>
                        <div className="flex flex-col gap-2">
                          <Button
                            type="button"
                            variant="quiet"
                            size="sm"
                            onClick={() => startRenaming(item.href, item.customLabel ?? item.title)}
                            aria-label={`Rename ${getWorkItemLabel(item)} favorite label`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="quiet"
                            size="sm"
                            onClick={() => toggleFavorite({ href: item.href, title: item.title, subtitle: item.subtitle, customLabel: item.customLabel, tone: item.tone, icon: item.icon, userKey })}
                            aria-label={`Remove ${getWorkItemLabel(item)} from favorites`}
                          >
                            <FavoriteIcon className={`size-4 ${favoriteTone.text}`} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {editingFavoriteHref ? (
              <div className="mt-4 rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Rename favorite</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    value={favoriteLabelDraft}
                    onChange={(event) => setFavoriteLabelDraft(event.target.value)}
                    placeholder="Type a short custom label..."
                    className="border-none bg-[rgba(255,255,255,0.08)]"
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => submitFavoriteRename(editingFavoriteHref)}>
                      <Check className="mr-2 size-4" />
                      Save label
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingFavoriteHref(null);
                        setFavoriteLabelDraft('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {recentWorkItems.length ? (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Recent work</p>
                <div className="mt-3 space-y-3">
                  {recentWorkItems.map((item) => (
                    <div key={`${item.userKey}-${item.href}`} className="flex items-start gap-3">
                      <Link
                        href={item.href}
                        onClick={closePalette}
                        className="flex flex-1 items-start gap-4 rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-4 transition hover:bg-[rgba(255,255,255,0.08)]"
                      >
                        <div className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.08)] text-[var(--brand-secondary)]">
                          <Command className="size-4" />
                        </div>
                        <div>
                          <p className="font-display text-lg text-[var(--text-primary)]">{item.title}</p>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.subtitle ?? 'Return to the last active workspace.'}</p>
                          <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                            {new Date(item.visitedAt).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </Link>
                      <Button
                        type="button"
                        variant="quiet"
                        size="sm"
                        onClick={() => toggleFavorite({ href: item.href, title: item.title, subtitle: item.subtitle, userKey })}
                        aria-label={`${isFavorite(item.href) ? 'Remove' : 'Add'} ${item.title} ${isFavorite(item.href) ? 'from' : 'to'} favorites`}
                      >
                        <Star className={`size-4 ${isFavorite(item.href) ? 'fill-current text-[var(--accent-amber)]' : 'text-[var(--text-tertiary)]'}`} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;

                return (
                  <div key={item.href} className="flex items-start gap-3">
                    <Link
                      href={item.href}
                      onClick={closePalette}
                      className={`flex flex-1 items-start gap-4 rounded-[22px] border px-4 py-4 transition ${
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
                    <Button
                      type="button"
                      variant="quiet"
                      size="sm"
                      onClick={() => toggleFavorite({ href: item.href, title: item.label, subtitle: item.description, userKey })}
                      aria-label={`${isFavorite(item.href) ? 'Remove' : 'Add'} ${item.label} ${isFavorite(item.href) ? 'from' : 'to'} favorites`}
                    >
                      <Star className={`size-4 ${isFavorite(item.href) ? 'fill-current text-[var(--accent-amber)]' : 'text-[var(--text-tertiary)]'}`} />
                    </Button>
                  </div>
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
