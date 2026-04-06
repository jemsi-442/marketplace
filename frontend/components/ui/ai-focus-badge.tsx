import { StatusBadge } from '@/components/ui/status-badge';

interface AiFocusBadgeProps {
  focusArea?: string | null;
}

const focusMeta: Record<string, { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }> = {
  finance: { label: 'Finance focus', tone: 'info' },
  delivery: { label: 'Delivery focus', tone: 'success' },
  risk: { label: 'Risk focus', tone: 'warning' },
  lane: { label: 'Lane focus', tone: 'info' },
  catalog: { label: 'Lane focus', tone: 'info' },
  capability: { label: 'Capability focus', tone: 'success' },
  operations: { label: 'Operations focus', tone: 'warning' },
  messaging: { label: 'Thread focus', tone: 'neutral' },
};

export function AiFocusBadge({ focusArea }: AiFocusBadgeProps) {
  if (!focusArea) {
    return null;
  }

  const normalized = focusArea.trim().toLowerCase();
  const meta = focusMeta[normalized];
  if (!meta) {
    return <StatusBadge label={focusArea.replaceAll('_', ' ')} tone="neutral" />;
  }

  return <StatusBadge label={meta.label} tone={meta.tone} />;
}
