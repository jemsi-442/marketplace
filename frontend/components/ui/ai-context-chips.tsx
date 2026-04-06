import { StatusBadge } from '@/components/ui/status-badge';

interface AiContextChipsProps {
  contextTag?: string | null;
  context?: Record<string, unknown> | null;
}

const contextMeta: Record<
  string,
  {
    label: string;
    tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  }
> = {
  client_dashboard: { label: 'Client desk', tone: 'info' },
  vendor_dashboard: { label: 'Capability studio', tone: 'success' },
  admin_dashboard: { label: 'Operations desk', tone: 'warning' },
  booking_workspace: { label: 'Booking workspace', tone: 'info' },
  service_workspace: { label: 'Capability workspace', tone: 'success' },
  capability_workspace: { label: 'Capability workspace', tone: 'success' },
};

function formatCompactValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();

    return trimmed ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return null;
}

function buildContextDetails(contextTag?: string | null, context?: Record<string, unknown> | null): string[] {
  if (!context) {
    return [];
  }

  const normalizedTag = (contextTag ?? '').trim().toLowerCase();
  const details: string[] = [];

  const push = (label: string, value: unknown) => {
    const compact = formatCompactValue(value);
    if (compact) {
      details.push(`${label}: ${compact}`);
    }
  };

  switch (normalizedTag) {
    case 'client_dashboard':
      if (typeof context.active_category === 'string' && context.active_category.trim().toUpperCase() !== 'ALL') {
        push('Category', context.active_category);
      }
      push('Pending collection', context.pending_collection_count);
      push('Disputes', context.disputed_booking_count);
      push('Live delivery', context.active_delivery_count);
      break;
    case 'vendor_dashboard':
      push('Active lanes', context.live_service_count);
      push('Inactive', context.inactive_service_count);
      push('Deliveries', context.active_delivery_count);
      push('Balance', context.available_balance);
      break;
    case 'admin_dashboard':
      push('Open disputes', context.open_disputes);
      push('Critical users', context.critical_users);
      push('Trust watchlist', context.trust_watchlist_count);
      break;
    case 'booking_workspace':
      push('Booking', context.booking_id);
      push('Status', context.booking_status);
      push('Escrow', context.escrow_status);
      push('Service', context.service_title);
      break;
    case 'service_workspace':
    case 'capability_workspace':
      push('Lane', context.service_title ?? context.service_type_id ?? context.service_id);
      push('Category', context.service_category);
      push('Owner view', context.is_vendor_owner);
      push('Latest booking', context.latest_booking_id);
      break;
    default:
      break;
  }

  return details.slice(0, 4);
}

export function AiContextChips({ contextTag, context }: AiContextChipsProps) {
  const normalizedTag = (contextTag ?? '').trim().toLowerCase();
  const meta = normalizedTag ? contextMeta[normalizedTag] : null;
  const details = buildContextDetails(normalizedTag, context);

  if (!meta && details.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {meta ? <StatusBadge label={meta.label} tone={meta.tone} /> : null}
      {details.map((detail) => (
        <StatusBadge key={detail} label={detail} tone="neutral" />
      ))}
    </div>
  );
}
