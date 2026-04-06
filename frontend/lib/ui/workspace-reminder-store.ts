'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type WorkspaceReminderPreset = 'later_today' | 'tomorrow' | 'next_week';

export interface WorkspaceReminderItem {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  note?: string;
  userKey: string;
  dueAt: string;
  status: 'open' | 'done';
  createdAt: string;
}

interface WorkspaceReminderState {
  items: WorkspaceReminderItem[];
  upsertReminder: (item: Omit<WorkspaceReminderItem, 'id' | 'dueAt' | 'status' | 'createdAt'>, preset: WorkspaceReminderPreset) => void;
  snoozeReminder: (id: string, preset: WorkspaceReminderPreset) => void;
  updateReminderNote: (id: string, note: string) => void;
  markDone: (id: string) => void;
  reopenReminder: (id: string) => void;
  removeReminder: (id: string) => void;
  clearDone: (userKey: string) => void;
}

export function getReminderDueAt(preset: WorkspaceReminderPreset) {
  const now = new Date();

  if (preset === 'later_today') {
    const due = new Date(now);
    due.setHours(Math.max(now.getHours() + 3, 18), 0, 0, 0);
    return due.toISOString();
  }

  if (preset === 'tomorrow') {
    const due = new Date(now);
    due.setDate(due.getDate() + 1);
    due.setHours(9, 0, 0, 0);
    return due.toISOString();
  }

  const due = new Date(now);
  due.setDate(due.getDate() + 7);
  due.setHours(9, 0, 0, 0);
  return due.toISOString();
}

export function getReminderPresetLabel(preset: WorkspaceReminderPreset) {
  switch (preset) {
    case 'later_today':
      return 'Later today';
    case 'tomorrow':
      return 'Tomorrow';
    case 'next_week':
      return 'Next week';
    default:
      return 'Later';
  }
}

export function getReminderDueLabel(dueAt: string) {
  const due = new Date(dueAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfNextWeek = new Date(startOfToday);
  startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);

  if (due < now) {
    return 'Overdue';
  }

  if (due < startOfTomorrow) {
    return 'Due today';
  }

  if (due < startOfNextWeek) {
    return 'Due this week';
  }

  return due.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export const useWorkspaceReminderStore = create<WorkspaceReminderState>()(
  persist(
    (set) => ({
      items: [],
      upsertReminder: (item, preset) => set((state) => {
        const now = new Date().toISOString();
        const dueAt = getReminderDueAt(preset);
        const existing = state.items.find((entry) => entry.href === item.href && entry.userKey === item.userKey && entry.status === 'open');

        if (existing) {
          return {
            items: state.items.map((entry) => (
              entry.id === existing.id
                ? {
                  ...entry,
                    title: item.title,
                    subtitle: item.subtitle,
                    note: item.note ?? entry.note,
                    dueAt,
                  }
                : entry
            )),
          };
        }

        const nextItem: WorkspaceReminderItem = {
          ...item,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          dueAt,
          status: 'open',
          createdAt: now,
        };

        return {
          items: [nextItem, ...state.items].slice(0, 32),
        };
      }),
      snoozeReminder: (id, preset) => set((state) => ({
        items: state.items.map((item) => (
          item.id === id
            ? {
                ...item,
                dueAt: getReminderDueAt(preset),
                status: 'open',
              }
            : item
        )),
      })),
      updateReminderNote: (id, note) => set((state) => ({
        items: state.items.map((item) => (
          item.id === id
            ? {
                ...item,
                note: note.trim().length ? note.trim() : undefined,
              }
            : item
        )),
      })),
      markDone: (id) => set((state) => ({
        items: state.items.map((item) => item.id === id ? { ...item, status: 'done' } : item),
      })),
      reopenReminder: (id) => set((state) => ({
        items: state.items.map((item) => item.id === id ? { ...item, status: 'open' } : item),
      })),
      removeReminder: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      })),
      clearDone: (userKey) => set((state) => ({
        items: state.items.filter((item) => !(item.userKey === userKey && item.status === 'done')),
      })),
    }),
    {
      name: 'wolfix-workspace-reminders',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
