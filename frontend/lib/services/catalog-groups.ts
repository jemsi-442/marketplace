import type { ServiceGroupRecord, ServiceTypeRecord } from '@/lib/types';

export function getServiceGroupBySlug(groups: ServiceGroupRecord[], slug: string): ServiceGroupRecord | null {
  return groups.find((group) => group.slug === slug) ?? null;
}

export function resolveServiceGroupSlugFromValue(groups: ServiceGroupRecord[], value: string | null | undefined): string | null {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const direct = groups.find((group) => group.slug === normalized);
  if (direct) {
    return direct.slug;
  }

  for (const group of groups) {
    if (group.category_labels.some((label) => label.trim().toLowerCase() === normalized)) {
      return group.slug;
    }
    if (group.title.trim().toLowerCase() === normalized) {
      return group.slug;
    }
  }

  return null;
}

export function getServiceTypesForGroup(serviceTypes: ServiceTypeRecord[], slug: string): ServiceTypeRecord[] {
  return serviceTypes.filter((item) => item.is_active && item.group_slug === slug);
}
