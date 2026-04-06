'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { FavoriteRouteIcon, FavoriteRouteTone } from '@/lib/ui/favorite-route-style';

export interface RecentWorkItem {
  href: string;
  title: string;
  subtitle?: string;
  userKey: string;
  visitedAt: string;
}

export interface FavoriteWorkItem {
  href: string;
  title: string;
  subtitle?: string;
  customLabel?: string;
  tone?: FavoriteRouteTone;
  icon?: FavoriteRouteIcon;
  userKey: string;
  savedAt: string;
}

export interface RouteVisitStat {
  href: string;
  title: string;
  subtitle?: string;
  userKey: string;
  visitCount: number;
  lastVisitedAt: string;
}

interface RecentWorkState {
  items: RecentWorkItem[];
  favorites: FavoriteWorkItem[];
  routeStats: RouteVisitStat[];
  addVisit: (item: Omit<RecentWorkItem, 'visitedAt'>) => void;
  toggleFavorite: (item: Omit<FavoriteWorkItem, 'savedAt'>) => void;
  renameFavorite: (userKey: string, href: string, customLabel: string) => void;
  updateFavoriteAppearance: (userKey: string, href: string, tone: FavoriteRouteTone, icon: FavoriteRouteIcon) => void;
  removeRecent: (userKey: string, href: string) => void;
  removeFavorite: (userKey: string, href: string) => void;
  clearRecent: (userKey: string) => void;
  clearUser: (userKey: string) => void;
  clearFavorites: (userKey: string) => void;
}

interface SuggestedFavoriteOptions {
  routeStats: RouteVisitStat[];
  favorites: FavoriteWorkItem[];
  userKey: string;
  minimumVisits?: number;
}

export function getSuggestedFavoriteRoute({
  routeStats,
  favorites,
  userKey,
  minimumVisits = 3,
}: SuggestedFavoriteOptions) {
  const favoriteHrefs = new Set(
    favorites.filter((item) => item.userKey === userKey).map((item) => item.href),
  );

  return routeStats
    .filter((item) => item.userKey === userKey && item.visitCount >= minimumVisits && !favoriteHrefs.has(item.href))
    .sort((left, right) => {
      if (right.visitCount !== left.visitCount) {
        return right.visitCount - left.visitCount;
      }

      return new Date(right.lastVisitedAt).getTime() - new Date(left.lastVisitedAt).getTime();
    })[0];
}

export function getWorkItemLabel(item: { title: string; customLabel?: string }) {
  const normalized = item.customLabel?.trim();
  return normalized && normalized.length > 0 ? normalized : item.title;
}

export const useRecentWorkStore = create<RecentWorkState>()(
  persist(
    (set) => ({
      items: [],
      favorites: [],
      routeStats: [],
      addVisit: (item) => set((state) => {
        const now = new Date().toISOString();
        const nextVisit = {
          ...item,
          visitedAt: now,
        };
        const existingStat = state.routeStats.find((entry) => entry.href === item.href && entry.userKey === item.userKey);
        const nextStat = {
          ...item,
          visitCount: (existingStat?.visitCount ?? 0) + 1,
          lastVisitedAt: now,
        };

        return {
          items: [
            nextVisit,
            ...state.items.filter((existing) => !(existing.href === item.href && existing.userKey === item.userKey)),
          ].slice(0, 24),
          routeStats: [
            nextStat,
            ...state.routeStats.filter((existing) => !(existing.href === item.href && existing.userKey === item.userKey)),
          ].slice(0, 48),
        };
      }),
      toggleFavorite: (item) => set((state) => {
        const existingFavorite = state.favorites.find((favorite) => favorite.href === item.href && favorite.userKey === item.userKey);
        const exists = Boolean(existingFavorite);

        if (exists) {
          return {
            favorites: state.favorites.filter((favorite) => !(favorite.href === item.href && favorite.userKey === item.userKey)),
          };
        }

        return {
          favorites: [
            {
              ...item,
              customLabel: existingFavorite?.customLabel,
              tone: existingFavorite?.tone ?? item.tone ?? 'amber',
              icon: existingFavorite?.icon ?? item.icon ?? 'star',
              savedAt: new Date().toISOString(),
            },
            ...state.favorites.filter((favorite) => !(favorite.href === item.href && favorite.userKey === item.userKey)),
          ].slice(0, 8),
        };
      }),
      renameFavorite: (userKey, href, customLabel) => set((state) => ({
        favorites: state.favorites.map((item) => {
          if (item.userKey !== userKey || item.href !== href) {
            return item;
          }

          const nextLabel = customLabel.trim();
          return {
            ...item,
            customLabel: nextLabel.length ? nextLabel : undefined,
          };
        }),
      })),
      updateFavoriteAppearance: (userKey, href, tone, icon) => set((state) => ({
        favorites: state.favorites.map((item) => {
          if (item.userKey !== userKey || item.href !== href) {
            return item;
          }

          return {
            ...item,
            tone,
            icon,
          };
        }),
      })),
      removeRecent: (userKey, href) => set((state) => ({
        items: state.items.filter((item) => !(item.userKey === userKey && item.href === href)),
      })),
      removeFavorite: (userKey, href) => set((state) => ({
        favorites: state.favorites.filter((item) => !(item.userKey === userKey && item.href === href)),
      })),
      clearRecent: (userKey) => set((state) => ({
        items: state.items.filter((item) => item.userKey !== userKey),
      })),
      clearUser: (userKey) => set((state) => ({
        items: state.items.filter((item) => item.userKey !== userKey),
        favorites: state.favorites.filter((item) => item.userKey !== userKey),
        routeStats: state.routeStats.filter((item) => item.userKey !== userKey),
      })),
      clearFavorites: (userKey) => set((state) => ({
        favorites: state.favorites.filter((item) => item.userKey !== userKey),
      })),
    }),
    {
      name: 'wolfix-recent-work',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        favorites: state.favorites,
        routeStats: state.routeStats,
      }),
    },
  ),
);
