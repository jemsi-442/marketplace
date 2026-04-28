import { AnalyticsBoardShell } from '@/components/dashboard/analytics-board-shell';
import { AnalyticsSectionCard } from '@/components/dashboard/analytics-section-card';
import { AnalyticsSegmentList } from '@/components/dashboard/analytics-segment-list';
import { AnalyticsKpiCard } from '@/components/dashboard/analytics-kpi-card';
import { AnalyticsSnapshotChips } from '@/components/dashboard/analytics-snapshot-chips';
import { buildRingSegments, formatCompactNumber } from '@/components/dashboard/chart-utils';
import { PremiumRingChart } from '@/components/dashboard/premium-ring-chart';
import { SignalMeterGrid } from '@/components/dashboard/signal-meter-grid';

type CommandCenterRole = 'client' | 'vendor' | 'admin';

interface CommandCenterAnalyticsBoardProps {
  role: CommandCenterRole;
  platformStatus: string;
  platformMessage: string;
  unreadAlerts: number;
  inboxItems: number;
  bookingCount?: number;
  activeBookingCount?: number;
  vendorServiceCount?: number;
  vendorProfileReady?: boolean;
  openDisputes?: number;
  criticalUsers?: number;
  actionUserCount?: number;
  adminHealthy?: boolean;
}

export function CommandCenterAnalyticsBoard({
  role,
  platformStatus,
  platformMessage,
  unreadAlerts,
  inboxItems,
  bookingCount = 0,
  activeBookingCount = 0,
  vendorServiceCount = 0,
  vendorProfileReady = false,
  openDisputes = 0,
  criticalUsers = 0,
  actionUserCount = 0,
  adminHealthy = true,
}: CommandCenterAnalyticsBoardProps) {
  const roleConfig =
    role === 'admin'
      ? {
          eyebrow: 'Operations pulse',
          title: 'Read platform pressure before opening a control lane',
          description: 'Escalation pressure, alert movement, and account action load in one glance.',
          ringTotal: Math.max(unreadAlerts + openDisputes + criticalUsers + actionUserCount, 1),
          ringSegments: [
            { label: 'Alerts', value: unreadAlerts, color: 'var(--accent-coral)' },
            { label: 'Disputes', value: openDisputes, color: 'var(--accent-amber)' },
            { label: 'Critical users', value: criticalUsers, color: 'var(--accent-violet)' },
            { label: 'Account actions', value: actionUserCount, color: 'var(--accent-cyan)' },
          ],
          kpis: [
            { label: 'Platform', value: platformStatus, detail: platformMessage, tone: 'rgba(111,215,255,0.08)', accent: 'var(--accent-cyan)', chip: 'System' },
            { label: 'Unread alerts', value: String(unreadAlerts), detail: 'Signals waiting for review', tone: 'rgba(255,143,143,0.08)', accent: 'var(--accent-coral)', chip: 'Queue' },
            { label: 'Open disputes', value: String(openDisputes), detail: 'Cases needing judgement', tone: 'rgba(242,198,109,0.08)', accent: 'var(--accent-amber)', chip: 'Cases' },
            { label: 'Critical users', value: String(criticalUsers), detail: 'Highest-risk accounts', tone: 'rgba(188,164,255,0.08)', accent: 'var(--accent-violet)', chip: 'Watch' },
          ],
          bars: [
            { label: 'Health confidence', value: adminHealthy ? 88 : 42, color: 'var(--accent-teal)', helper: adminHealthy ? 'Core operations are reading stable.' : 'Health signal needs a closer look.' },
            { label: 'Alert pressure', value: Math.min(unreadAlerts * 12, 100), color: 'var(--accent-coral)', helper: `${unreadAlerts} alerts are still waiting for review.` },
            { label: 'Control queue', value: actionUserCount ? Math.min(Math.round((openDisputes / Math.max(actionUserCount, 1)) * 100), 100) : openDisputes ? 100 : 0, color: 'var(--accent-amber)', helper: `${actionUserCount} account actions are currently visible.` },
          ],
        }
      : role === 'vendor'
        ? {
          eyebrow: 'Studio pulse',
          title: 'Read setup, demand, and follow-up before opening the studio',
          description: 'Business readiness, live attention, and communication load in one glance.',
            ringTotal: Math.max(unreadAlerts + inboxItems + vendorServiceCount + (vendorProfileReady ? 0 : 1), 1),
            ringSegments: [
              { label: 'Alerts', value: unreadAlerts, color: 'var(--accent-coral)' },
              { label: 'Inbox', value: inboxItems, color: 'var(--accent-violet)' },
              { label: 'Active lanes', value: vendorServiceCount, color: 'var(--accent-cyan)' },
              { label: 'Setup gap', value: vendorProfileReady ? 0 : 1, color: 'var(--accent-amber)' },
            ],
            kpis: [
              { label: 'Platform', value: platformStatus, detail: platformMessage, tone: 'rgba(111,215,255,0.08)', accent: 'var(--accent-cyan)', chip: 'System' },
              { label: 'Profile', value: vendorProfileReady ? 'Ready' : 'Pending', detail: vendorProfileReady ? 'Business identity is visible' : 'Setup still needs attention', tone: 'rgba(242,198,109,0.08)', accent: 'var(--accent-amber)', chip: 'Identity' },
              { label: 'Active lanes', value: formatCompactNumber(vendorServiceCount), detail: 'Approved lanes visible in studio', tone: 'rgba(111,215,255,0.08)', accent: 'var(--accent-cyan)', chip: 'Studio' },
              { label: 'Inbox items', value: String(inboxItems), detail: 'Buyer and delivery follow-up', tone: 'rgba(188,164,255,0.08)', accent: 'var(--accent-violet)', chip: 'Inbox' },
            ],
            bars: [
              { label: 'Profile readiness', value: vendorProfileReady ? 100 : 45, color: 'var(--accent-amber)', helper: vendorProfileReady ? 'Studio identity is client-ready.' : 'Profile still has a visible gap.' },
              { label: 'Capability visibility', value: Math.min(vendorServiceCount * 20, 100), color: 'var(--accent-cyan)', helper: `${vendorServiceCount} active lanes are visible right now.` },
              { label: 'Attention load', value: Math.min((unreadAlerts + inboxItems) * 12, 100), color: 'var(--accent-coral)', helper: `${unreadAlerts + inboxItems} items need response across alerts and inbox.` },
            ],
          }
        : {
            eyebrow: 'Client pulse',
            title: 'Read bookings, alerts, and inbox movement before opening a work lane',
            description: 'Active work, new follow-up, and platform readiness in one glance.',
            ringTotal: Math.max(unreadAlerts + inboxItems + bookingCount + activeBookingCount, 1),
            ringSegments: [
              { label: 'Alerts', value: unreadAlerts, color: 'var(--accent-coral)' },
              { label: 'Inbox', value: inboxItems, color: 'var(--accent-violet)' },
              { label: 'Tracked work', value: bookingCount, color: 'var(--accent-cyan)' },
              { label: 'Live delivery', value: activeBookingCount, color: 'var(--accent-teal)' },
            ],
            kpis: [
              { label: 'Platform', value: platformStatus, detail: platformMessage, tone: 'rgba(111,215,255,0.08)', accent: 'var(--accent-cyan)', chip: 'System' },
              { label: 'Unread alerts', value: String(unreadAlerts), detail: 'Booking and payment signals', tone: 'rgba(255,143,143,0.08)', accent: 'var(--accent-coral)', chip: 'Queue' },
              { label: 'Tracked work', value: formatCompactNumber(bookingCount), detail: 'Bookings already in motion', tone: 'rgba(111,215,255,0.08)', accent: 'var(--accent-cyan)', chip: 'Work' },
              { label: 'Live delivery', value: String(activeBookingCount), detail: 'Protected work currently active', tone: 'rgba(95,214,179,0.08)', accent: 'var(--accent-teal)', chip: 'Live' },
            ],
            bars: [
              { label: 'Protected flow', value: bookingCount ? Math.min(Math.round((activeBookingCount / bookingCount) * 100), 100) : 0, color: 'var(--accent-teal)', helper: `${activeBookingCount} active bookings are currently in delivery.` },
              { label: 'Alert pressure', value: Math.min(unreadAlerts * 12, 100), color: 'var(--accent-coral)', helper: `${unreadAlerts} platform alerts are waiting in queue.` },
              { label: 'Conversation load', value: Math.min(inboxItems * 12, 100), color: 'var(--accent-violet)', helper: `${inboxItems} inbox threads are competing for attention.` },
            ],
          };

  const ringRadius = 62;
  const signalTotal = roleConfig.ringSegments.reduce((sum, segment) => sum + segment.value, 0);
  const ring = buildRingSegments(roleConfig.ringSegments, ringRadius);
  const signalChips = roleConfig.ringSegments.filter((segment) => segment.value > 0).slice(0, 4);

  return (
    <AnalyticsBoardShell
      eyebrow={roleConfig.eyebrow}
      title={roleConfig.title}
      description={roleConfig.description}
      snapshotLabel="Live command snapshot"
      className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[var(--shadow-panel)]"
      snapshotClassName="border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.06)]"
      chips={<AnalyticsSnapshotChips items={signalChips} />}
    >
      <div className="mt-6 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <AnalyticsSectionCard
          title="Attention mix"
          description="Read how alerts, inbox, tracked work, and interventions are sharing the desk."
          chip="Signal map"
          accent="var(--accent-cyan)"
        >
          <div className="flex items-center justify-center">
            <PremiumRingChart segments={ring.segments} radius={ringRadius} totalLabel={signalTotal} totalCaption="signals" trackColor="rgba(148,163,184,0.16)" />
          </div>
          <AnalyticsSegmentList items={ring.segments} />
        </AnalyticsSectionCard>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {roleConfig.kpis.map((item) => (
              <AnalyticsKpiCard
                key={item.label}
                label={item.label}
                value={item.value}
                detail={item.detail}
                accent={item.accent}
                chip={item.chip}
                tone={item.tone}
              />
            ))}
          </div>

          <SignalMeterGrid items={roleConfig.bars} />
        </div>
      </div>
    </AnalyticsBoardShell>
  );
}
