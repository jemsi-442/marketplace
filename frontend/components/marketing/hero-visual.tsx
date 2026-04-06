import Image from 'next/image';
import { Activity, BriefcaseBusiness, ShieldCheck, Sparkles, Wallet, Workflow } from 'lucide-react';

const chips = [
  { label: 'Trusted delivery', icon: ShieldCheck, tone: 'text-[var(--accent-teal)] bg-[rgba(20,184,166,0.08)]' },
  { label: 'Digital ops', icon: Activity, tone: 'text-[var(--accent-cyan)] bg-[rgba(56,189,248,0.08)]' },
  { label: 'Capability studios', icon: BriefcaseBusiness, tone: 'text-[var(--brand-primary)] bg-[rgba(79,70,229,0.08)]' },
];

const flowSteps = [
  { label: 'Book', icon: BriefcaseBusiness, tone: 'text-[var(--brand-primary)] bg-[rgba(79,70,229,0.08)]' },
  { label: 'Protect', icon: Wallet, tone: 'text-[var(--accent-teal)] bg-[rgba(13,148,136,0.1)]' },
  { label: 'Deliver', icon: Workflow, tone: 'text-[var(--accent-cyan)] bg-[rgba(14,165,233,0.1)]' },
  { label: 'Close', icon: ShieldCheck, tone: 'text-[var(--accent-amber)] bg-[rgba(245,158,11,0.12)]' },
];

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      <div className="absolute inset-0 rounded-[40px] bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.16),transparent_56%)] blur-2xl" />
      <div className="animate-float relative overflow-hidden rounded-[36px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] p-6 shadow-[var(--shadow-panel)]">
        <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.14),transparent_68%)]" />
        <div className="flex items-center gap-4">
          <div className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-white shadow-[0_18px_36px_rgba(7,24,84,0.24)]">
            <Image src="/brand/wolfix-logo.svg" alt="WOLFIX hero mark" width={96} height={96} className="h-24 w-24 object-cover" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-secondary)]">Marketplace command</p>
            <p className="mt-2 font-display text-3xl text-[var(--text-primary)]">Control the flow</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Booking, protected payment, and delivery stay in one clear lane.</p>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-[var(--line)] bg-[rgba(248,250,252,0.92)] p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Workspace signal</p>
              <p className="mt-2 font-display text-2xl text-[var(--text-primary)]">Protected digital work</p>
            </div>
            <div className="rounded-full border border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.06)] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--brand-primary)]">
              Live flow
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Booking', value: 'Open cleanly', tone: 'text-[var(--brand-primary)] bg-[rgba(79,70,229,0.08)]' },
              { label: 'Escrow', value: 'Protect value', tone: 'text-[var(--accent-teal)] bg-[rgba(13,148,136,0.1)]' },
              { label: 'Delivery', value: 'Track proof', tone: 'text-[var(--accent-cyan)] bg-[rgba(14,165,233,0.1)]' },
            ].map((item) => (
              <div key={item.label} className="rounded-[18px] border border-[var(--line)] bg-white p-3">
                <div className={`inline-flex rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${item.tone}`}>{item.label}</div>
                <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[20px] border border-[var(--line)] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Commercial path</p>
                <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">One visual lane from kickoff to proof</p>
              </div>
              <Sparkles className="size-4 text-[var(--brand-secondary)]" />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-[16px] border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Booking lift</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-[var(--brand-primary)]" />
                  <p className="text-sm font-medium text-[var(--text-primary)]">+24% movement</p>
                </div>
              </div>
              <div className="rounded-[16px] border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Escrow link</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-[var(--accent-teal)]" />
                  <p className="text-sm font-medium text-[var(--text-primary)]">Value stays attached</p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              {flowSteps.map((step) => {
                const Icon = step.icon;

                return (
                  <div key={step.label} className="rounded-[16px] border border-[var(--line)] bg-[var(--panel-muted)] p-3">
                    <div className={`inline-flex size-9 items-center justify-center rounded-2xl ${step.tone}`}>
                      <Icon className="size-4" />
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{step.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 h-24 rounded-[18px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
              <div className="flex h-full items-end gap-3">
              {[42, 58, 48, 72, 64, 86].map((value, index) => (
                <div key={index} className="flex min-w-0 flex-1 flex-col justify-end">
                  <div
                    className="rounded-t-2xl bg-[linear-gradient(180deg,rgba(79,70,229,0.82),rgba(56,189,248,0.72))]"
                    style={{ height: `${value}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                <span className="size-2.5 rounded-full bg-[var(--brand-primary)]" />
                Booking lift
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                <span className="size-2.5 rounded-full bg-[var(--accent-cyan)]" />
                Delivery pulse
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {chips.map((chip, index) => {
            const Icon = chip.icon;

            return (
              <div
                key={chip.label}
                className="animate-fade-up flex items-center justify-between rounded-[22px] border border-[var(--line)] bg-white px-4 py-4"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-2xl border border-[var(--line)] ${chip.tone}`}>
                    <Icon className="size-4" />
                  </div>
                  <span className="text-sm text-[var(--text-primary)]">{chip.label}</span>
                </div>
                <Sparkles className="size-4 text-[var(--brand-secondary)]" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
