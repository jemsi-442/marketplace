'use client';

import { BriefcaseBusiness, MessageSquareMore, ShieldCheck, Star, Wallet } from 'lucide-react';

export type FavoriteRouteTone = 'amber' | 'indigo' | 'teal' | 'cyan' | 'coral';
export type FavoriteRouteIcon = 'star' | 'briefcase' | 'wallet' | 'shield' | 'message';

export const favoriteToneOptions: Array<{ value: FavoriteRouteTone; label: string; className: string }> = [
  {
    value: 'amber',
    label: 'Amber',
    className: 'border-[rgba(245,158,11,0.2)] bg-[rgba(255,251,235,0.96)] text-[var(--accent-amber)]',
  },
  {
    value: 'indigo',
    label: 'Indigo',
    className: 'border-[rgba(99,102,241,0.18)] bg-[rgba(245,247,255,0.96)] text-[var(--brand-primary)]',
  },
  {
    value: 'teal',
    label: 'Teal',
    className: 'border-[rgba(20,184,166,0.18)] bg-[rgba(240,253,250,0.96)] text-[var(--accent-teal)]',
  },
  {
    value: 'cyan',
    label: 'Cyan',
    className: 'border-[rgba(56,189,248,0.18)] bg-[rgba(239,249,255,0.96)] text-[var(--accent-cyan)]',
  },
  {
    value: 'coral',
    label: 'Coral',
    className: 'border-[rgba(249,115,22,0.18)] bg-[rgba(255,247,237,0.96)] text-[var(--accent-coral)]',
  },
];

export const favoriteIconOptions: Array<{ value: FavoriteRouteIcon; label: string }> = [
  { value: 'star', label: 'Star' },
  { value: 'briefcase', label: 'Work' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'shield', label: 'Guard' },
  { value: 'message', label: 'Inbox' },
];

export function getFavoriteToneClasses(tone: FavoriteRouteTone = 'amber') {
  switch (tone) {
    case 'indigo':
      return {
        text: 'text-[var(--brand-primary)]',
        chip: 'border-[rgba(99,102,241,0.18)] bg-[rgba(245,247,255,0.96)] text-[var(--brand-primary)]',
      };
    case 'teal':
      return {
        text: 'text-[var(--accent-teal)]',
        chip: 'border-[rgba(20,184,166,0.18)] bg-[rgba(240,253,250,0.96)] text-[var(--accent-teal)]',
      };
    case 'cyan':
      return {
        text: 'text-[var(--accent-cyan)]',
        chip: 'border-[rgba(56,189,248,0.18)] bg-[rgba(239,249,255,0.96)] text-[var(--accent-cyan)]',
      };
    case 'coral':
      return {
        text: 'text-[var(--accent-coral)]',
        chip: 'border-[rgba(249,115,22,0.18)] bg-[rgba(255,247,237,0.96)] text-[var(--accent-coral)]',
      };
    case 'amber':
    default:
      return {
        text: 'text-[var(--accent-amber)]',
        chip: 'border-[rgba(245,158,11,0.18)] bg-[rgba(255,251,235,0.96)] text-[var(--accent-amber)]',
      };
  }
}

export function getFavoriteIcon(icon: FavoriteRouteIcon = 'star') {
  switch (icon) {
    case 'briefcase':
      return BriefcaseBusiness;
    case 'wallet':
      return Wallet;
    case 'shield':
      return ShieldCheck;
    case 'message':
      return MessageSquareMore;
    case 'star':
    default:
      return Star;
  }
}
