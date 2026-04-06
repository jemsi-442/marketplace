import Link from 'next/link';
import { Activity, ArrowRight, BanknoteArrowDown, BriefcaseBusiness, MessageSquareMore, ShieldCheck, Sparkles, Wallet, Workflow } from 'lucide-react';

import { HeroVisual } from '@/components/marketing/hero-visual';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { InstallCtaButton } from '@/components/pwa/install-cta-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const pillars = [
  {
    title: 'Software Engineering',
    copy: 'Web apps, automation, and product delivery move through one protected lane.',
    icon: Activity,
  },
  {
    title: 'Design and Brand Systems',
    copy: 'Brand systems, UI kits, motion assets, and digital creative work stay beside engineering.',
    icon: Sparkles,
  },
  {
    title: 'Managed Digital Growth',
    copy: 'SEO, campaigns, content operations, and retainers use the same trust controls.',
    icon: Workflow,
  },
];

const workflowCards = [
  {
    title: 'Book clearly',
    copy: 'Open the work with the right service, price, and scope already visible.',
    icon: BriefcaseBusiness,
    variant: 'market' as const,
  },
  {
    title: 'Protect payment',
    copy: 'Escrow and collection steps keep money movement attached to the same workflow.',
    icon: Wallet,
    variant: 'finance' as const,
  },
  {
    title: 'Run delivery',
    copy: 'Messages, progress, and next actions stay tied to the live booking lane.',
    icon: Workflow,
    variant: 'activity' as const,
  },
  {
    title: 'Close with proof',
    copy: 'Reviews, alerts, and trust signals stay visible after the work is delivered.',
    icon: ShieldCheck,
    variant: 'communication' as const,
  },
];

const homeSignalCards = [
  { title: 'Protected flow', value: 'Booking, payment, and delivery share one path.', icon: Wallet, tone: 'text-[var(--accent-teal)] bg-[rgba(13,148,136,0.1)]' },
  { title: 'Clear service desk', value: 'Clients and vendors move with confidence.', icon: BriefcaseBusiness, tone: 'text-[var(--brand-primary)] bg-[rgba(79,70,229,0.08)]' },
  { title: 'Operational rhythm', value: 'Updates and decisions stay in one lane.', icon: Workflow, tone: 'text-[var(--accent-cyan)] bg-[rgba(14,165,233,0.1)]' },
];

const homeEntryActions = [
  { label: 'Sign in to workspace', hint: 'Return to your live lane', href: '/login', variant: 'primary' as const },
  { label: 'Create account', hint: 'Open a client or vendor lane', href: '/register', variant: 'ghost' as const },
  { label: 'Preview dashboards', hint: 'See the command center first', href: '/dashboard', variant: 'ghost' as const },
];

const requestLaneCards = [
  { label: 'Software', copy: 'Apps, automation, product builds', icon: Activity, tone: 'text-[var(--brand-primary)] bg-[rgba(79,70,229,0.08)]' },
  { label: 'Design', copy: 'Brand systems, UI/UX, motion', icon: Sparkles, tone: 'text-[var(--accent-violet)] bg-[rgba(139,92,246,0.1)]' },
  { label: 'Growth', copy: 'Campaigns, content, social ops', icon: Workflow, tone: 'text-[var(--accent-cyan)] bg-[rgba(14,165,233,0.1)]' },
  { label: 'Retainers', copy: 'SEO, analytics, digital support', icon: ShieldCheck, tone: 'text-[var(--accent-amber)] bg-[rgba(245,158,11,0.12)]' },
];

const consultationCards = [
  { title: 'Call / WhatsApp', value: '+255 622 670 772', copy: 'Direct project line', icon: Wallet, tone: 'text-[var(--accent-teal)] bg-[rgba(13,148,136,0.1)]' },
  { title: 'Alternate Contact', value: '+255 683 186 987', copy: 'Backup coordination line', icon: MessageSquareMore, tone: 'text-[var(--accent-cyan)] bg-[rgba(14,165,233,0.1)]' },
  { title: 'Email', value: 'wolfixagency84@gmail.com', copy: 'Scope and follow-up', icon: Sparkles, tone: 'text-[var(--brand-primary)] bg-[rgba(79,70,229,0.08)]' },
  { title: 'Location', value: 'Mlimani City, Dar es Salaam', copy: 'Meetings and discovery', icon: ShieldCheck, tone: 'text-[var(--accent-amber)] bg-[rgba(245,158,11,0.12)]' },
];

const closingSignalCards = [
  { title: 'Client lane', value: 'Book with clarity', icon: BriefcaseBusiness, tone: 'text-[var(--brand-primary)] bg-[rgba(79,70,229,0.08)]' },
  { title: 'Protected flow', value: 'Keep value attached', icon: Wallet, tone: 'text-[var(--accent-teal)] bg-[rgba(13,148,136,0.1)]' },
  { title: 'Delivery lane', value: 'Track proof live', icon: Workflow, tone: 'text-[var(--accent-cyan)] bg-[rgba(14,165,233,0.1)]' },
  { title: 'Support layer', value: 'Notes, alerts, AI', icon: Sparkles, tone: 'text-[var(--accent-violet)] bg-[rgba(139,92,246,0.1)]' },
];

const platformLaneCards = [
  { label: 'Client lane', value: 'Book and track', icon: BriefcaseBusiness, tone: 'text-[var(--brand-primary)] bg-[rgba(79,70,229,0.08)]' },
  { label: 'Protected flow', value: 'Escrow linked', icon: Wallet, tone: 'text-[var(--accent-teal)] bg-[rgba(13,148,136,0.1)]' },
  { label: 'Delivery lane', value: 'Messages attached', icon: MessageSquareMore, tone: 'text-[var(--accent-cyan)] bg-[rgba(14,165,233,0.1)]' },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-8">
      <MarketingHeader />

      <section className="mb-10 grid gap-8 overflow-hidden rounded-[36px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] px-6 py-6 shadow-[var(--shadow-panel)] backdrop-blur-2xl lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-8">
        <div className="relative z-10 flex flex-col justify-center">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.06)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--brand-secondary)]">
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
            {homeEntryActions.map((action) => (
              <Link key={action.label} href={action.href}>
                <Button variant={action.variant === 'primary' ? undefined : action.variant}>
                  {action.label}
                  {action.variant === 'primary' ? <ArrowRight className="ml-2 size-4" /> : null}
                </Button>
              </Link>
            ))}
            <InstallCtaButton variant="ghost" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {homeEntryActions.map((action) => (
              <span
                key={action.label}
                className="rounded-full border border-[var(--line)] bg-[var(--panel-strong)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]"
              >
                {action.hint}
              </span>
            ))}
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {homeSignalCards.map(({ title, value, icon: Icon, tone }) => (
              <div key={title} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-strong)] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-2xl ${tone}`}>
                    <Icon className="size-4" />
                  </div>
                  <p className="font-medium text-[var(--text-primary)]">{title}</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center justify-center lg:justify-end">
          <HeroVisual />
        </div>
      </section>

      <section id="how-it-works" className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {workflowCards.map((item) => {
          const Icon = item.icon;
          return (
            <StatCard
              key={item.title}
              eyebrow="Workflow"
              value={item.title}
              detail={item.copy}
              icon={<Icon className="size-8" />}
              variant={item.variant}
            />
          );
        })}
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
              <div className="mt-6 rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
                <div className="grid gap-3 md:grid-cols-3">
                  {platformLaneCards.map(({ label, value, icon: Icon, tone }) => (
                    <div key={label} className="rounded-[18px] border border-[var(--line)] bg-white p-4">
                      <div className="flex items-center gap-2">
                        <div className={`flex size-8 items-center justify-center rounded-2xl ${tone}`}>
                          <Icon className="size-4" />
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{label}</p>
                      </div>
                      <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {pillars.map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                  <div key={pillar.title} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-strong)] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] text-[var(--brand-primary)]">
                        <Icon className="size-4" />
                      </div>
                      <p className="font-display text-xl text-[var(--text-primary)]">{pillar.title}</p>
                    </div>
                    <p className="text-sm leading-6 text-[var(--text-secondary)]">{pillar.copy}</p>
                  </div>
                )})}
              </div>
            </div>
            <div id="delivery-standards" className="relative p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(65,205,189,0.12),transparent_48%)]" />
              <div className="relative rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,249,255,0.94))] p-6">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--brand-secondary)]">Marketplace lanes</p>
                <h2 className="font-display text-2xl text-[var(--text-primary)]">What WOLFIX can host</h2>
                <div className="mt-5 space-y-3">
                  {[
                    {
                      title: 'Secure settlement',
                      copy: 'Collection and payout stay inside one dependable commercial path.',
                      Icon: BanknoteArrowDown,
                    },
                    {
                      title: 'Digital business lanes',
                      copy: 'Engineering, design, content, SEO, and growth work stay in one product surface.',
                      Icon: ShieldCheck,
                    },
                    {
                      title: 'Smart operating layer',
                      copy: 'Alerts, notes, and AI guidance support the work without cluttering the workflow.',
                      Icon: Sparkles,
                    },
                  ].map(({ title, copy, Icon }) => (
                    <div key={title} className="rounded-[18px] border border-[var(--line)] bg-white p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] text-[var(--brand-primary)]">
                          <Icon className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
                          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{copy}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card id="service-categories">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">WOLFIX request lanes</p>
          <div className="mt-6 space-y-5">
            {requestLaneCards.map(({ label, copy, icon: Icon, tone }) => (
              <div key={label} className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-4 text-sm text-[var(--text-secondary)] shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                <div className="flex items-start gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-2xl ${tone}`}>
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{label}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section id="growth-opportunities" className="sr-only" aria-hidden="true" />
      <section id="digital-focus" className="sr-only" aria-hidden="true" />

      <section
        id="consultation"
        className="mt-8 grid gap-6 overflow-hidden rounded-[32px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] px-6 py-6 shadow-[var(--shadow-panel)] backdrop-blur-2xl lg:grid-cols-[1.1fr_0.9fr] lg:px-8"
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
          {consultationCards.map(({ title, value, copy, icon: Icon, tone }) => (
            <div key={title} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-strong)] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-2xl ${tone}`}>
                  <Icon className="size-4" />
                </div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-secondary)]">{title}</p>
              </div>
              <p className="mt-3 font-display text-2xl text-[var(--text-primary)]">{value}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-4 rounded-[28px] border border-[var(--line)] bg-[rgba(255,255,255,0.92)] px-5 py-5 shadow-[var(--shadow-soft)] md:grid-cols-4">
        {closingSignalCards.map(({ title, value, icon: Icon, tone }) => (
          <div key={title} className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-4">
            <div className="flex items-center gap-2">
              <div className={`flex size-8 items-center justify-center rounded-2xl ${tone}`}>
                <Icon className="size-4" />
              </div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{title}</p>
            </div>
            <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
