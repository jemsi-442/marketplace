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
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 lg:px-8">
      <MarketingHeader />

      <section className="grid gap-6 rounded-[32px] border border-[var(--line)] bg-white px-6 py-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)] lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
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
    </main>
  );
}
