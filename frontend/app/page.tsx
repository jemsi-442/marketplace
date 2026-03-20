import Link from 'next/link';
import { ArrowRight, BanknoteArrowDown, ShieldCheck, Sparkles, Wallet } from 'lucide-react';

import { StatCard } from '@/components/dashboard/stat-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const pillars = [
  {
    title: 'Escrow Intelligence',
    copy: 'Bookings, releases, disputes, and Snippe money rails all sit inside one auditable operating model.',
  },
  {
    title: 'Trust-Aware Matching',
    copy: 'Vendors are ranked using profile quality, marketplace trust, risk posture, and delivery history.',
  },
  {
    title: 'Role-Based Control',
    copy: 'Client, vendor, and admin teams each get a dedicated operational cockpit instead of one generic dashboard.',
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-8">
      <header className="mb-10 flex flex-col gap-6 rounded-[36px] border border-[var(--line)] bg-[rgba(9,21,37,0.72)] px-6 py-6 shadow-[0_30px_120px_rgba(3,10,24,0.28)] backdrop-blur lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.32em] text-[var(--brand-secondary)]">Enterprise trust marketplace</p>
          <h1 className="max-w-3xl font-display text-4xl leading-tight text-[var(--text-primary)] lg:text-6xl">
            The SaaS control plane for escrow, payouts, trust, and vendor orchestration.
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/login">
            <Button>
              Launch operator portal
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="ghost">Create operator account</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost">Preview dashboards</Button>
          </Link>
        </div>
      </header>

      <section className="grid gap-5 md:grid-cols-3">
        <StatCard eyebrow="Protected flow" value="3-sided" detail="Client, vendor, and admin rails share one secure operating surface." icon={<ShieldCheck className="size-8" />} />
        <StatCard eyebrow="Money movement" value="Ledger-first" detail="Escrow liability, vendor wallets, and revenue accounts remain auditable by design." icon={<Wallet className="size-8" />} />
        <StatCard eyebrow="Automation layer" value="Risk-aware" detail="Future AI services plug into the product without weakening the financial core." icon={<Sparkles className="size-8" />} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="border-b border-[var(--line)] p-8 lg:border-b-0 lg:border-r">
              <p className="mb-4 text-sm uppercase tracking-[0.24em] text-[var(--text-tertiary)]">Platform thesis</p>
              <p className="max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
                This frontend is designed as an enterprise SaaS shell for your Symfony fintech backend: strong identity, clear operator flows,
                and room for future analytics, reconciliation, fraud scoring, and marketplace intelligence.
              </p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {pillars.map((pillar) => (
                  <div key={pillar.title} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
                    <p className="mb-3 font-display text-xl text-[var(--text-primary)]">{pillar.title}</p>
                    <p className="text-sm leading-6 text-[var(--text-secondary)]">{pillar.copy}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(127,211,196,0.12),transparent_45%)]" />
              <div className="relative rounded-[28px] border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-6">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--brand-secondary)]">Operational view</p>
                <h2 className="font-display text-2xl">Back office posture</h2>
                <ul className="mt-5 space-y-4 text-sm text-[var(--text-secondary)]">
                  <li className="flex items-start gap-3"><BanknoteArrowDown className="mt-0.5 size-4 text-[var(--brand-primary)]" /> Snippe-backed collection and payout workflows ready for connected UI actions.</li>
                  <li className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-4 text-[var(--brand-primary)]" /> Role-aware routing for admin oversight, vendor wallet ops, and client delivery visibility.</li>
                  <li className="flex items-start gap-3"><Sparkles className="mt-0.5 size-4 text-[var(--brand-primary)]" /> AI-ready interaction layer with trust, risk, and recommendation panels prepared for expansion.</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">What we can wire next</p>
          <div className="mt-6 space-y-5">
            {[
              'JWT login and refresh with route guards',
              'Vendor onboarding forms tied to live API endpoints',
              'Admin metrics, disputes, and reconciliation dashboards',
              'Client booking and escrow timeline views',
            ].map((item) => (
              <div key={item} className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-muted)] px-4 py-4 text-sm text-[var(--text-secondary)]">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}
