'use client';

import { create } from 'zustand';

export type ToastTone = 'success' | 'info' | 'warning' | 'danger';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  tone: ToastTone;
}

interface ToastState {
  items: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>) => string;
  remove: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({
      items: [...state.items, { ...toast, id }].slice(-4),
    }));
    return id;
  },
  remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  clear: () => set({ items: [] }),
}));
