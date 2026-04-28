'use client';

import {
  Boxes,
  BrushCleaning,
  Landmark,
  Layers3,
  ShieldCheck,
  ShieldEllipsis,
  Sparkles,
  Workflow,
} from 'lucide-react';

import type { ServiceGroupRecord } from '@/lib/types';

export const SERVICE_DISCOVERY_STALE_MS = 60_000;

export const requestServiceIconMap: Record<string, typeof Boxes> = {
  'software-development': Boxes,
  'design-creative': BrushCleaning,
  'social-media-marketing': Workflow,
  'cybersecurity-infrastructure': ShieldEllipsis,
  'government-consultancy': Landmark,
  'automation-operations': ShieldCheck,
};

export function normalizeServiceLaneSearch(value: string): string {
  return value.trim().toLowerCase();
}

export function filterRequestServiceGroups(
  groups: ServiceGroupRecord[],
  search: string,
): ServiceGroupRecord[] {
  const term = normalizeServiceLaneSearch(search);

  if (!term) {
    return groups;
  }

  return groups.filter((group) => {
    const haystack = `${group.title} ${group.description} ${group.hero_title} ${group.hero_description} ${group.featured_services.join(' ')}`.toLowerCase();
    return haystack.includes(term);
  });
}

export function getDensestServiceGroup(
  groups: ServiceGroupRecord[],
): ServiceGroupRecord | null {
  return groups.reduce<ServiceGroupRecord | null>((best, current) => {
    if (!best || current.service_count > best.service_count) {
      return current;
    }

    return best;
  }, null);
}

export const requestServiceGuidanceItems = [
  {
    title: 'Start with the lane',
    detail: 'Choose the lane that matches the outcome first.',
    icon: <Layers3 className="size-4" />,
  },
  {
    title: 'Open the exact service',
    detail: 'Then narrow to the service that fits the request.',
    icon: <Sparkles className="size-4" />,
  },
  {
    title: 'Move through one path',
    detail: 'Requests still follow one managed review flow.',
    icon: <ShieldCheck className="size-4" />,
  },
];
