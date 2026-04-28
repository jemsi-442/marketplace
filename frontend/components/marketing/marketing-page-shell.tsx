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
    <main className="min-h-screen">
      <MarketingHeader />

      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 py-8 lg:px-8">
        <section className="grid gap-6 border-b border-[rgba(148,163,184,0.2)] pb-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-secondary)]">{eyebrow}</p>
            <h1 className="mt-3 font-display text-4xl text-[var(--text-primary)] lg:text-[3.2rem]">{title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-secondary)]">{intro}</p>
          </div>
          {aside ? <div className="grid gap-4">{aside}</div> : null}
        </section>

        <Card className="mt-8 border border-[var(--line)] p-6 sm:p-8">
          <div className="space-y-6">{children}</div>
        </Card>
      </div>
    </main>
  );
}
