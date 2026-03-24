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
    'border-[rgba(124,194,255,0.24)] bg-[radial-gradient(circle_at_top_left,rgba(78,137,255,0.28),transparent_45%),linear-gradient(145deg,rgba(6,32,77,0.94),rgba(10,57,112,0.9))]',
  vendor:
    'border-[rgba(170,180,255,0.24)] bg-[radial-gradient(circle_at_top_left,rgba(160,130,255,0.24),transparent_42%),linear-gradient(145deg,rgba(28,20,92,0.94),rgba(17,57,125,0.9))]',
  admin:
    'border-[rgba(255,151,182,0.24)] bg-[radial-gradient(circle_at_top_left,rgba(255,126,162,0.22),transparent_38%),linear-gradient(145deg,rgba(56,18,52,0.94),rgba(70,24,84,0.92))]',
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
        'mt-6 overflow-hidden rounded-[30px] border p-6 shadow-[0_32px_80px_rgba(0,0,0,0.26)] backdrop-blur-xl',
        toneStyles[tone],
      )}
    >
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] text-[var(--text-primary)]">
              {iconMap[tone]}
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                {tone === 'client' ? 'Client command view' : 'Vendor studio view'}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Sparkles className="size-4 text-[var(--brand-secondary)]" />
                {tone === 'client'
                  ? 'Discovery, protected booking, and delivery follow-up'
                  : tone === 'vendor'
                    ? 'Business setup, live offers, delivery execution, and payout control'
                    : 'Dispute review, risk watchlists, and controlled intervention'}
              </p>
            </div>
          </div>

          <h2 className="mt-5 font-display text-3xl tracking-[-0.04em] text-[var(--text-primary)]">{title}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
        </div>

        {actions ? <div className="flex flex-wrap gap-3 xl:max-w-xl xl:justify-end">{actions}</div> : null}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {highlights.map((highlight, index) => (
          <div
            key={highlight}
            className="rounded-[22px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-4 py-4"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              {tone === 'client' ? 'Client focus' : tone === 'vendor' ? 'Studio focus' : 'Ops focus'} {index + 1}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-primary)]">{highlight}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
