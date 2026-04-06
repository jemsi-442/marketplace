import type { ReactNode } from 'react';
import { BriefcaseBusiness, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

type WorkspaceIdentityTone = 'client' | 'vendor' | 'admin';

interface WorkspaceIdentityBannerProps {
  tone: WorkspaceIdentityTone;
  title: string;
  description: string;
  highlights: string[];
  actions?: ReactNode;
}

const toneStyles: Record<WorkspaceIdentityTone, string> = {
  client:
    'border-[rgba(79,70,229,0.12)] bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,255,0.98))]',
  vendor:
    'border-[rgba(20,184,166,0.14)] bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,253,250,0.98))]',
  admin:
    'border-[rgba(249,115,22,0.16)] bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.12),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,237,0.98))]',
};

const iconToneStyles: Record<WorkspaceIdentityTone, string> = {
  client: 'border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.08)] text-[var(--brand-primary)]',
  vendor: 'border-[rgba(20,184,166,0.16)] bg-[rgba(20,184,166,0.1)] text-[var(--accent-teal)]',
  admin: 'border-[rgba(249,115,22,0.18)] bg-[rgba(249,115,22,0.1)] text-[var(--accent-coral)]',
};

const highlightToneStyles: Record<WorkspaceIdentityTone, string> = {
  client: 'border-[rgba(79,70,229,0.12)] bg-[rgba(255,255,255,0.78)]',
  vendor: 'border-[rgba(20,184,166,0.14)] bg-[rgba(255,255,255,0.82)]',
  admin: 'border-[rgba(249,115,22,0.14)] bg-[rgba(255,255,255,0.84)]',
};

const iconMap: Record<WorkspaceIdentityTone, ReactNode> = {
  client: <ShoppingBag className="size-5" />,
  vendor: <BriefcaseBusiness className="size-5" />,
  admin: <ShieldCheck className="size-5" />,
};

export function WorkspaceIdentityBanner({
  tone,
  title,
  description,
  highlights,
  actions,
}: WorkspaceIdentityBannerProps) {
  return (
    <section
      className={cn(
        'mt-6 overflow-hidden rounded-[26px] border p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:rounded-[30px] sm:p-6',
        toneStyles[tone],
      )}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span className={cn('inline-flex size-10 items-center justify-center rounded-full border sm:size-11', iconToneStyles[tone])}>
              {iconMap[tone]}
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                {tone === 'client' ? 'Client command view' : tone === 'vendor' ? 'Vendor studio view' : 'Admin operations view'}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Sparkles className="size-4 text-[var(--brand-secondary)]" />
                {tone === 'client'
                  ? 'Discovery, protected booking, and delivery follow-up'
                  : tone === 'vendor'
                    ? 'Business setup, active capability lanes, delivery execution, and payout control'
                    : 'Dispute review, risk watchlists, and controlled intervention'}
              </p>
            </div>
          </div>

          <h2 className="mt-4 font-display text-[1.7rem] tracking-[-0.04em] text-[var(--text-primary)] sm:mt-5 sm:text-3xl">{title}</h2>
          <p className="mt-3 max-w-2xl text-[13px] leading-6 text-[var(--text-secondary)] sm:mt-4 sm:text-sm sm:leading-7">{description}</p>
        </div>

        {actions ? <div className="flex flex-wrap gap-3 xl:max-w-xl xl:justify-end">{actions}</div> : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3 sm:mt-6">
        {highlights.map((highlight, index) => (
          <div
            key={highlight}
            className={cn('rounded-[20px] border px-4 py-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] sm:rounded-[22px] sm:py-4', highlightToneStyles[tone])}
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              {tone === 'client' ? 'Client focus' : tone === 'vendor' ? 'Studio focus' : 'Ops focus'} {index + 1}
            </p>
            <p className="mt-2.5 text-[13px] leading-6 text-[var(--text-primary)] sm:mt-3 sm:text-sm">{highlight}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
