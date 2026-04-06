import Link from 'next/link';
import { RefreshCcw, Signal, WifiOff } from 'lucide-react';

import { InstallCtaButton } from '@/components/pwa/install-cta-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-10 lg:px-8">
      <Card className="rounded-[32px] border border-[var(--line)] p-8 shadow-[0_12px_30px_rgba(15,23,42,0.06)] lg:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,158,11,0.16)] bg-[rgba(245,158,11,0.08)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-amber)]">
          <WifiOff className="size-4" />
          Offline
        </div>
        <h1 className="mt-5 font-display text-4xl leading-tight text-[var(--text-primary)]">This page needs a better connection.</h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
          WOLFIX is still available, but live workspace data could not refresh just now. Reconnect and retry, or go back to a stable page first.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/">
            <Button>
              Retry home
              <RefreshCcw className="ml-2 size-4" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost">Open dashboard</Button>
          </Link>
          <InstallCtaButton variant="ghost" />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Reconnect and retry',
              copy: 'Once the device has network again, reopen the page and live data will load.',
              icon: RefreshCcw,
            },
            {
              title: 'Install for faster return',
              copy: 'Adding WOLFIX to the home screen keeps it one tap away on supported devices.',
              icon: Signal,
            },
            {
              title: 'Use stable pages first',
              copy: 'Home, login, register, and the dashboard shell are the safest places to resume from.',
              icon: WifiOff,
            },
          ].map(({ title, copy, icon: Icon }) => (
            <div key={title} className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-[rgba(79,70,229,0.08)] text-[var(--brand-primary)]">
                  <Icon className="size-4" />
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{copy}</p>
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
