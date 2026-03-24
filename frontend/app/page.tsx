import Link from 'next/link';
import { ArrowRight, BanknoteArrowDown, BriefcaseBusiness, ShieldCheck, Sparkles, Wallet } from 'lucide-react';

import { HeroVisual } from '@/components/marketing/hero-visual';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const pillars = [
  {
    title: 'Software Engineering',
    copy: 'Web apps, product delivery, automation, and digital product work can move through one protected workflow.',
  },
  {
    title: 'Design and Brand Systems',
    copy: 'Graphic design, UI kits, branding work, motion assets, and digital creative delivery sit beside engineering in the same marketplace.',
  },
  {
    title: 'Managed Digital Growth',
    copy: 'Social media management, SEO, campaign support, content operations, and digital retainers can be sold with the same trust controls.',
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-8">
      <MarketingHeader />

      <section className="mb-10 grid gap-8 overflow-hidden rounded-[36px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(8,20,48,0.92),rgba(13,30,74,0.82))] px-6 py-6 shadow-[var(--shadow-panel)] backdrop-blur-2xl lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-8">
        <div className="relative z-10 flex flex-col justify-center">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(18,40,92,0.74)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--brand-secondary)]">
            <BriefcaseBusiness className="size-4" />
            Managed marketplace for premium digital work
          </div>
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl leading-tight text-[var(--text-primary)] lg:text-6xl">
              Book digital services in a workspace that looks sharp and runs with discipline.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
              WOLFIX brings software engineering, design, content, growth, and delivery operations into one polished commercial surface.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login">
              <Button>
                Open workspace
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="ghost">Create account</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost">Preview dashboards</Button>
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ['Protected commercial flow', 'Booking, payment, delivery, and support share one path.'],
              ['Premium service experience', 'Clients and providers move through every step with clarity and confidence.'],
              ['Operational clarity', 'Work, updates, and decisions stay organised from kickoff to delivery.'],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(18,40,92,0.72),rgba(14,31,74,0.5))] p-4">
                <p className="font-medium text-[var(--text-primary)]">{title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{copy}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center justify-center lg:justify-end">
          <HeroVisual />
        </div>
      </section>

      <section id="how-it-works" className="grid gap-5 md:grid-cols-3">
        <StatCard eyebrow="Protected flow" value="Secure" detail="Booking, delivery, support, and payments stay inside one secure operating surface." icon={<ShieldCheck className="size-8" />} />
        <StatCard eyebrow="Digital lanes" value="Engineering + Design" detail="Software delivery, graphic design, social media support, and other digital services live in one commercial system." icon={<Wallet className="size-8" />} />
        <StatCard eyebrow="Automation layer" value="Risk-aware" detail="Future AI services plug into the product without weakening the financial core." icon={<Sparkles className="size-8" />} />
      </section>

      <section id="about-wolfix" className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="border-b border-[var(--line)] p-8 lg:border-b-0 lg:border-r">
              <p className="mb-4 text-sm uppercase tracking-[0.24em] text-[var(--text-tertiary)]">Platform thesis</p>
              <p className="max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
                WOLFIX DIGITAL AGENCY can operate this as a premium digital marketplace for software engineering, graphical design, social media
                management, branding, UI/UX, automation, and other remote digital services without losing financial control.
              </p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {pillars.map((pillar) => (
                  <div key={pillar.title} className="rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(18,40,92,0.84),rgba(14,31,74,0.66))] p-5">
                    <p className="mb-3 font-display text-xl text-[var(--text-primary)]">{pillar.title}</p>
                    <p className="text-sm leading-6 text-[var(--text-secondary)]">{pillar.copy}</p>
                  </div>
                ))}
              </div>
            </div>
            <div id="delivery-standards" className="relative p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(65,205,189,0.14),transparent_48%)]" />
              <div className="relative rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(18,40,92,0.9),rgba(14,31,74,0.72))] p-6">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--brand-secondary)]">Marketplace lanes</p>
                <h2 className="font-display text-2xl text-[var(--text-primary)]">What WOLFIX can host</h2>
                <ul className="mt-5 space-y-4 text-sm text-[var(--text-secondary)]">
                  <li className="flex items-start gap-3"><BanknoteArrowDown className="mt-0.5 size-4 text-[var(--brand-primary)]" /> Secure collection and payout workflows for dependable marketplace settlement.</li>
                  <li className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-4 text-[var(--brand-primary)]" /> Software engineering, graphic design, UI/UX, content, SEO, and social media management in one workspace.</li>
                  <li className="flex items-start gap-3"><Sparkles className="mt-0.5 size-4 text-[var(--brand-primary)]" /> Smart alerts and recommendations can grow with the platform over time.</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        <Card id="service-categories">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">WOLFIX service catalog</p>
          <div className="mt-6 space-y-5">
            {[
              'Custom software and product engineering',
              'Graphic design, brand systems, UI/UX, and motion assets',
              'Social media management, content operations, and digital campaigns',
              'Automation, analytics, SEO, and remote digital retainers',
            ].map((item) => (
              <div key={item} className="rounded-[20px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(18,40,92,0.84),rgba(14,31,74,0.66))] px-4 py-4 text-sm text-[var(--text-secondary)]">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section id="growth-opportunities" className="sr-only" aria-hidden="true" />
      <section id="digital-focus" className="sr-only" aria-hidden="true" />

      <section
        id="consultation"
        className="mt-8 grid gap-6 overflow-hidden rounded-[32px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(8,20,48,0.92),rgba(13,30,74,0.84))] px-6 py-6 shadow-[var(--shadow-panel)] backdrop-blur-2xl lg:grid-cols-[1.1fr_0.9fr] lg:px-8"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-secondary)]">Consultation Desk</p>
          <h2 className="mt-3 font-display text-4xl text-[var(--text-primary)]">Talk to WOLFIX about your next digital delivery move.</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
            If you need a software build, design system, digital campaign support, automation work, or specialist consulting, WOLFIX can help you
            structure the engagement and move it into the right commercial workflow.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="mailto:wolfixagency84@gmail.com">
              <Button>
                Start consultation
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Link href="https://wa.me/255622670772" target="_blank" rel="noreferrer">
              <Button variant="ghost">WhatsApp consultation</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['Call / WhatsApp', '+255 622 670 772', 'Immediate consultation line for new projects and delivery discussions.'],
            ['Alternate Contact', '+255 683 186 987', 'Secondary business line for marketplace and project coordination.'],
            ['Email', 'wolfixagency84@gmail.com', 'Use email for project scope, briefs, commercial discussions, and follow-up.'],
            ['Location', 'Mlimani City, Dar es Salaam', 'Local business presence for meetings, discovery, and partnership conversations.'],
          ].map(([title, value, copy]) => (
            <div key={title} className="rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(18,40,92,0.84),rgba(14,31,74,0.66))] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-secondary)]">{title}</p>
              <p className="mt-3 font-display text-2xl text-[var(--text-primary)]">{value}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{copy}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
