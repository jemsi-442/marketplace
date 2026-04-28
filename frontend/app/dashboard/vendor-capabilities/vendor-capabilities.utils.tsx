'use client';

import {
  Boxes,
  BrushCleaning,
  FileText,
  Landmark,
  Layers3,
  MessageSquareMore,
  ShieldCheck,
  ShieldEllipsis,
  Sparkles,
  Wallet,
  Workflow,
} from 'lucide-react';

import { resolveCapabilityGroupSlug } from '@/lib/services/vendor-capability-flow';
import type {
  ServiceGroupRecord,
  ServiceTypeRecord,
  VendorServiceCapabilityRecord,
} from '@/lib/types';

export const CAPABILITY_PAGE_STALE_MS = 60_000;

export const capabilityIconMap: Record<string, typeof Boxes> = {
  'software-development': Boxes,
  'design-creative': BrushCleaning,
  'business-finance-support': Wallet,
  'social-media-marketing': Workflow,
  'content-media-communications': MessageSquareMore,
  'cybersecurity-infrastructure': ShieldEllipsis,
  'training-research-documentation': FileText,
  'government-consultancy': Landmark,
  'automation-operations': ShieldCheck,
};

export interface GroupMetrics {
  active: number;
  approved: number;
  pending: number;
  returned: number;
  configured: number;
}

export const defaultGroupMetrics = (): GroupMetrics => ({
  active: 0,
  approved: 0,
  pending: 0,
  returned: 0,
  configured: 0,
});

export function normalizeCapabilitySearch(value: string): string {
  return value.trim().toLowerCase();
}

export function buildMetricsByGroup(
  capabilities: VendorServiceCapabilityRecord[],
  serviceTypes: ServiceTypeRecord[],
  serviceGroups: ServiceGroupRecord[],
): Map<string, GroupMetrics> {
  const map = new Map<string, GroupMetrics>();

  for (const group of serviceGroups) {
    map.set(group.slug, defaultGroupMetrics());
  }

  for (const capability of capabilities) {
    const slug = resolveCapabilityGroupSlug(
      capability,
      serviceTypes,
      serviceGroups,
    );

    if (!slug) {
      continue;
    }

    const bucket = map.get(slug) ?? defaultGroupMetrics();
    bucket.configured += 1;

    if (capability.is_active) {
      bucket.active += 1;
    }

    if (capability.approved_by_admin) {
      bucket.approved += 1;
    } else if (capability.review_state === 'returned') {
      bucket.returned += 1;
    } else {
      bucket.pending += 1;
    }

    map.set(slug, bucket);
  }

  return map;
}

export function filterServiceGroups(
  groups: ServiceGroupRecord[],
  search: string,
): ServiceGroupRecord[] {
  const term = normalizeCapabilitySearch(search);

  if (!term) {
    return groups;
  }

  return groups.filter((group) => {
    const haystack = `${group.title} ${group.description} ${group.hero_title} ${group.hero_description} ${group.featured_services.join(' ')}`.toLowerCase();
    return haystack.includes(term);
  });
}

export function getDensestGroup(
  groups: ServiceGroupRecord[],
): ServiceGroupRecord | null {
  return groups.reduce<ServiceGroupRecord | null>((best, current) => {
    if (!best || current.service_count > best.service_count) {
      return current;
    }

    return best;
  }, null);
}

export const capabilityGuidanceItems = [
  {
    title: 'Start with the business lane',
    detail:
      'Choose the lane your team can deliver well first. That keeps the rest of the setup focused and believable.',
    icon: <Layers3 className="size-4" />,
  },
  {
    title: 'Write one strong capability brief',
    detail:
      'Inside each lane, set price, scope, turnaround, and portfolio notes that help admin review the lane quickly.',
    icon: <Sparkles className="size-4" />,
  },
  {
    title: 'Wait for one managed review path',
    detail:
      'Saved capability lanes go through review before they start feeding the matched request queue.',
    icon: <ShieldCheck className="size-4" />,
  },
];
