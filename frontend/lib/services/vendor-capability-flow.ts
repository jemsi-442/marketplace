import type {
  ServiceGroupRecord,
  ServiceTypeRecord,
  VendorServiceCapabilityInput,
  VendorServiceCapabilityRecord,
} from '@/lib/types';
import { resolveServiceGroupSlugFromValue } from '@/lib/services/catalog-groups';

export type DraftCapability = {
  enabled: boolean;
  experience_level: string;
  starting_price_tzs: string;
  capacity_status: 'available' | 'limited' | 'unavailable';
  turnaround_note: string;
  portfolio_summary: string;
  approved_by_admin: boolean;
  review_state: 'pending' | 'approved' | 'returned' | string;
  admin_review_note: string;
  reviewed_at: string | null;
  reviewed_by_admin: {
    id: number | null;
    email: string;
  } | null;
};

export function makeDefaultCapability(): DraftCapability {
  return {
    enabled: false,
    experience_level: 'standard',
    starting_price_tzs: '',
    capacity_status: 'available',
    turnaround_note: '',
    portfolio_summary: '',
    approved_by_admin: false,
    review_state: 'pending',
    admin_review_note: '',
    reviewed_at: null,
    reviewed_by_admin: null,
  };
}

export function buildDraftCapability(capability?: VendorServiceCapabilityRecord | null): DraftCapability {
  if (!capability) {
    return makeDefaultCapability();
  }

  return {
    enabled: capability.is_active,
    experience_level: capability.experience_level || 'standard',
    starting_price_tzs:
      typeof capability.starting_price_minor === 'number' && Number.isFinite(capability.starting_price_minor)
        ? String(Math.round(capability.starting_price_minor / 100))
        : '',
    capacity_status:
      capability.capacity_status === 'limited' || capability.capacity_status === 'unavailable'
        ? capability.capacity_status
        : 'available',
    turnaround_note: capability.turnaround_note || '',
    portfolio_summary: capability.portfolio_summary || '',
    approved_by_admin: capability.approved_by_admin,
    review_state: capability.review_state || 'pending',
    admin_review_note: capability.admin_review_note || '',
    reviewed_at: capability.reviewed_at || null,
    reviewed_by_admin: capability.reviewed_by_admin || null,
  };
}

export function capabilityInputFromDraft(serviceTypeId: number, draft: DraftCapability): VendorServiceCapabilityInput {
  return {
    service_type_id: serviceTypeId,
    is_active: draft.enabled,
    experience_level: draft.experience_level.trim() || 'standard',
    starting_price_minor:
      draft.starting_price_tzs.trim() !== '' && Number.isFinite(Number(draft.starting_price_tzs))
        ? Math.round(Number(draft.starting_price_tzs) * 100)
        : null,
    capacity_status: draft.capacity_status,
    turnaround_note: draft.turnaround_note.trim() || null,
    portfolio_summary: draft.portfolio_summary.trim() || null,
  };
}

export function capabilityInputFromRecord(capability: VendorServiceCapabilityRecord): VendorServiceCapabilityInput {
  return {
    service_type_id: capability.service_type.id,
    is_active: capability.is_active,
    experience_level: capability.experience_level?.trim() || 'standard',
    starting_price_minor:
      typeof capability.starting_price_minor === 'number' && Number.isFinite(capability.starting_price_minor)
        ? capability.starting_price_minor
        : null,
    capacity_status:
      capability.capacity_status === 'limited' || capability.capacity_status === 'unavailable'
        ? capability.capacity_status
        : 'available',
    turnaround_note: capability.turnaround_note?.trim() || null,
    portfolio_summary: capability.portfolio_summary?.trim() || null,
  };
}

export function resolveCapabilityGroupSlug(
  capability: VendorServiceCapabilityRecord,
  serviceTypes: ServiceTypeRecord[],
  groups: ServiceGroupRecord[]
): string | null {
  const matchingServiceType = serviceTypes.find((item) => item.id === capability.service_type.id);
  if (matchingServiceType?.group_slug) {
    return matchingServiceType.group_slug;
  }

  return resolveServiceGroupSlugFromValue(groups, capability.service_type.category);
}
