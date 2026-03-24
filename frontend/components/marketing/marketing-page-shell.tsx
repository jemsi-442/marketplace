import type { PropsWithChildren, ReactNode } from 'react';

import { MarketingHeader } from '@/components/layout/marketing-header';
import { Card } from '@/components/ui/card';

interface MarketingPageShellProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  intro: string;
  aside?: ReactNode;
}

export function MarketingPageShell({ eyebrow, title, intro, aside, children }: MarketingPageShellProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-8">
      <MarketingHeader />

      <section className="grid gap-6 overflow-hidden rounded-[36px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(8,20,48,0.92),rgba(13,30,74,0.82))] px-6 py-6 shadow-[var(--shadow-panel)] backdrop-blur-2xl lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-secondary)]">{eyebrow}</p>
          <h1 className="mt-3 font-display text-4xl text-[var(--text-primary)] lg:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-secondary)]">{intro}</p>
        </div>
        <div className="grid gap-4">{aside}</div>
      </section>

      <Card className="mt-8">
        <div className="grid gap-8 lg:grid-cols-[0.28fr_0.72fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">WOLFIX Standards</p>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              These pages explain how WOLFIX handles platform conduct, data expectations, and marketplace trust for clients and providers.
            </p>
          </div>
          <div className="space-y-8">{children}</div>
        </div>
      </Card>
    </main>
  );
}
