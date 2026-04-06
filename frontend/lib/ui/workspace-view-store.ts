'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { FavoriteRouteIcon, FavoriteRouteTone } from '@/lib/ui/favorite-route-style';

export interface WorkspaceViewItem {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  customLabel?: string;
  userKey: string;
  tone?: FavoriteRouteTone;
  icon?: FavoriteRouteIcon;
  savedAt: string;
}

interface WorkspaceViewState {
  items: WorkspaceViewItem[];
  saveView: (item: Omit<WorkspaceViewItem, 'id' | 'savedAt'>) => void;
  renameView: (userKey: string, id: string, customLabel: string) => void;
  removeView: (id: string) => void;
  clearViews: (userKey: string) => void;
}

export function getWorkspaceViewLabel(item: Pick<WorkspaceViewItem, 'customLabel' | 'title'>) {
  return item.customLabel?.trim() || item.title;
}

export const useWorkspaceViewStore = create<WorkspaceViewState>()(
  persist(
    (set) => ({
      items: [],
      saveView: (item) => set((state) => {
        const existing = state.items.find((entry) => entry.href === item.href && entry.userKey === item.userKey);
        const nextItem: WorkspaceViewItem = {
          ...item,
          customLabel: existing?.customLabel ?? item.customLabel,
          id: existing?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          savedAt: new Date().toISOString(),
        };

        return {
          items: [
            nextItem,
            ...state.items.filter((entry) => !(entry.href === item.href && entry.userKey === item.userKey)),
          ].slice(0, 16),
        };
      }),
      renameView: (userKey, id, customLabel) => set((state) => ({
        items: state.items.map((item) => (
          item.id === id && item.userKey === userKey
            ? {
                ...item,
                customLabel: customLabel.trim() || undefined,
              }
            : item
        )),
      })),
      removeView: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      })),
      clearViews: (userKey) => set((state) => ({
        items: state.items.filter((item) => item.userKey !== userKey),
      })),
    }),
    {
      name: 'wolfix-workspace-views',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
