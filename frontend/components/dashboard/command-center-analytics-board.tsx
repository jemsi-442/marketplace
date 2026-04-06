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

function formatCompact(value: number): string {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
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
            { label: 'Platform', value: platformStatus, detail: platformMessage, tone: 'rgba(111,215,255,0.08)' },
            { label: 'Unread alerts', value: String(unreadAlerts), detail: 'Signals waiting for review', tone: 'rgba(255,143,143,0.08)' },
            { label: 'Open disputes', value: String(openDisputes), detail: 'Cases needing judgement', tone: 'rgba(242,198,109,0.08)' },
            { label: 'Critical users', value: String(criticalUsers), detail: 'Highest-risk accounts', tone: 'rgba(188,164,255,0.08)' },
          ],
          bars: [
            { label: 'Health confidence', value: adminHealthy ? 88 : 42, color: 'var(--accent-teal)' },
            { label: 'Alert pressure', value: Math.min(unreadAlerts * 12, 100), color: 'var(--accent-coral)' },
            { label: 'Control queue', value: actionUserCount ? Math.min(Math.round((openDisputes / Math.max(actionUserCount, 1)) * 100), 100) : openDisputes ? 100 : 0, color: 'var(--accent-amber)' },
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
              { label: 'Platform', value: platformStatus, detail: platformMessage, tone: 'rgba(111,215,255,0.08)' },
              { label: 'Profile', value: vendorProfileReady ? 'Ready' : 'Pending', detail: vendorProfileReady ? 'Business identity is visible' : 'Setup still needs attention', tone: 'rgba(242,198,109,0.08)' },
              { label: 'Active lanes', value: formatCompact(vendorServiceCount), detail: 'Approved lanes visible in studio', tone: 'rgba(111,215,255,0.08)' },
              { label: 'Inbox items', value: String(inboxItems), detail: 'Buyer and delivery follow-up', tone: 'rgba(188,164,255,0.08)' },
            ],
            bars: [
              { label: 'Profile readiness', value: vendorProfileReady ? 100 : 45, color: 'var(--accent-amber)' },
              { label: 'Capability visibility', value: Math.min(vendorServiceCount * 20, 100), color: 'var(--accent-cyan)' },
              { label: 'Attention load', value: Math.min((unreadAlerts + inboxItems) * 12, 100), color: 'var(--accent-coral)' },
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
              { label: 'Platform', value: platformStatus, detail: platformMessage, tone: 'rgba(111,215,255,0.08)' },
              { label: 'Unread alerts', value: String(unreadAlerts), detail: 'Booking and payment signals', tone: 'rgba(255,143,143,0.08)' },
              { label: 'Tracked work', value: formatCompact(bookingCount), detail: 'Bookings already in motion', tone: 'rgba(111,215,255,0.08)' },
              { label: 'Live delivery', value: String(activeBookingCount), detail: 'Protected work currently active', tone: 'rgba(95,214,179,0.08)' },
            ],
            bars: [
              { label: 'Protected flow', value: bookingCount ? Math.min(Math.round((activeBookingCount / bookingCount) * 100), 100) : 0, color: 'var(--accent-teal)' },
              { label: 'Alert pressure', value: Math.min(unreadAlerts * 12, 100), color: 'var(--accent-coral)' },
              { label: 'Conversation load', value: Math.min(inboxItems * 12, 100), color: 'var(--accent-violet)' },
            ],
          };

  const ringRadius = 62;
  const circumference = 2 * Math.PI * ringRadius;
  const ringSegments = roleConfig.ringSegments.reduce<Array<{
    dash: number;
    offset: number;
    color: string;
    label: string;
    value: number;
  }>>((segments, segment) => {
    const previousOffset = segments.length
      ? segments[segments.length - 1].offset - segments[segments.length - 1].dash
      : 0;
    const dash = (segment.value / roleConfig.ringTotal) * circumference;

    segments.push({
      dash,
      offset: previousOffset,
      color: segment.color,
      label: segment.label,
      value: segment.value,
    });

    return segments;
  }, []);
  const signalChips = roleConfig.ringSegments.filter((segment) => segment.value > 0).slice(0, 4);

  return (
    <div className="mt-6 rounded-[30px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] p-5 shadow-[var(--shadow-panel)] sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--accent-cyan)]">{roleConfig.eyebrow}</p>
          <h3 className="mt-2 font-display text-2xl tracking-[-0.04em] text-[var(--text-primary)] sm:text-3xl">{roleConfig.title}</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{roleConfig.description}</p>
        </div>
        <div className="rounded-full border border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.06)] px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--brand-primary)]">
          Live command snapshot
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {signalChips.map((segment) => (
          <div
            key={segment.label}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/92 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)] shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
          >
            <span className="size-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
            <span>{segment.label}</span>
            <span className="text-[var(--text-primary)]">{segment.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="rounded-[26px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Attention mix</p>
            <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Signal map
            </span>
          </div>
          <div className="mt-5 flex items-center justify-center">
            <svg viewBox="0 0 180 180" className="size-44">
              <circle cx="90" cy="90" r={ringRadius} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="18" />
              {ringSegments.map((segment, index) => (
                <circle
                  key={index}
                  cx="90"
                  cy="90"
                  r={ringRadius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="18"
                  strokeDasharray={`${segment.dash} ${circumference}`}
                  strokeDashoffset={segment.offset}
                  strokeLinecap="round"
                  transform="rotate(-90 90 90)"
                />
              ))}
              <text x="90" y="86" textAnchor="middle" fill="var(--text-primary)" fontSize="34" fontWeight="700">
                {roleConfig.ringTotal}
              </text>
              <text x="90" y="108" textAnchor="middle" fill="var(--text-secondary)" fontSize="11" style={{ letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                signals
              </text>
            </svg>
          </div>
          <div className="mt-5 space-y-3">
            {ringSegments.map((segment) => (
              <div key={segment.label} className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                  {segment.label}
                </span>
                <span className="text-[var(--text-primary)]">{segment.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {roleConfig.kpis.map((item) => (
              <div key={item.label} className="rounded-[22px] border border-[var(--line)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]" style={{ backgroundColor: item.tone }}>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[var(--brand-primary)]" />
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{item.label}</p>
                </div>
                <p className="mt-3 font-display text-2xl text-[var(--text-primary)]">{item.value}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {roleConfig.bars.map((item) => (
              <div key={item.label} className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4 transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.07)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{item.label}</p>
                  <span className="text-sm text-[var(--text-primary)]">{item.value}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-[rgba(148,163,184,0.18)]">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min(item.value, 100)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
