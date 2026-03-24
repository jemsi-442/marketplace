import Image from 'next/image';
import { Activity, BriefcaseBusiness, ShieldCheck, Sparkles } from 'lucide-react';

const chips = [
  { label: 'Trusted delivery', icon: ShieldCheck },
  { label: 'Digital ops', icon: Activity },
  { label: 'Service studios', icon: BriefcaseBusiness },
];

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      <div className="absolute inset-0 rounded-[40px] bg-[radial-gradient(circle_at_top,rgba(78,137,255,0.22),transparent_56%)] blur-2xl" />
      <div className="animate-float relative overflow-hidden rounded-[36px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(18,40,92,0.86),rgba(14,31,74,0.7))] p-6 shadow-[var(--shadow-panel)]">
        <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(78,137,255,0.4),transparent_68%)]" />
        <div className="flex items-center gap-4">
          <div className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-white shadow-[0_18px_36px_rgba(7,24,84,0.24)]">
            <Image src="/brand/wolfix-logo.svg" alt="WOLFIX hero mark" width={96} height={96} className="h-24 w-24 object-cover" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-secondary)]">Marketplace intelligence</p>
            <p className="mt-2 font-display text-3xl text-[var(--text-primary)]">Control the flow</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Bookings, communication, and service delivery on one surface.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {chips.map((chip, index) => {
            const Icon = chip.icon;

            return (
              <div
                key={chip.label}
                className="animate-fade-up flex items-center justify-between rounded-[22px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(20,46,108,0.72),rgba(18,40,92,0.56))] px-4 py-4"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(78,137,255,0.16)] text-[var(--brand-secondary)]">
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
