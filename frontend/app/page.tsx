import Link from 'next/link';
import { Activity, ArrowRight, BanknoteArrowDown, BriefcaseBusiness, MessageSquareMore, ShieldCheck, Sparkles, Wallet, Workflow } from 'lucide-react';

import { HeroVisual } from '@/components/marketing/hero-visual';
import { MarketingFooter } from '@/components/layout/marketing-footer';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { MarketingSidebar } from '@/components/layout/marketing-sidebar';
import { StatCard } from '@/components/dashboard/stat-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const pillars = [
  {
    title: 'Software Build',
    copy: 'Apps and automation in one flow.',
    icon: Activity,
  },
  {
    title: 'Design Systems',
    copy: 'Brand, UI, and motion together.',
    icon: Sparkles,
  },
  {
    title: 'Digital Growth',
    copy: 'Campaigns and content stay clear.',
    icon: Workflow,
  },
];

const workflowCards = [
  {
    title: 'Book clearly',
    copy: 'Open work with clear scope and price.',
    icon: BriefcaseBusiness,
    variant: 'market' as const,
  },
  {
    title: 'Protect payment',
    copy: 'Keep payment inside the same flow.',
    icon: Wallet,
    variant: 'finance' as const,
  },
  {
    title: 'Run delivery',
    copy: 'Keep updates tied to the live booking.',
    icon: Workflow,
    variant: 'activity' as const,
  },
  {
    title: 'Close with proof',
    copy: 'Keep proof visible after delivery.',
    icon: ShieldCheck,
    variant: 'communication' as const,
  },
];

const homeSignalCards = [
  { title: 'Protected flow', value: 'Booking, payment, and delivery stay together.', icon: Wallet, tone: 'text-[var(--accent-teal)] bg-[rgba(13,148,136,0.1)]' },
  { title: 'Team ready', value: 'Clients and vendors stay aligned.', icon: BriefcaseBusiness, tone: 'text-[var(--brand-primary)] bg-[rgba(79,70,229,0.08)]' },
  { title: 'Clear updates', value: 'Progress and decisions stay visible.', icon: Workflow, tone: 'text-[var(--accent-cyan)] bg-[rgba(14,165,233,0.1)]' },
];

const homeEntryActions = [
  { label: 'Sign in', hint: 'Open workspace', href: '/login', variant: 'primary' as const },
  { label: 'Create account', hint: 'Choose your lane', href: '/register', variant: 'ghost' as const },
  { label: 'Preview dashboards', hint: 'See the product first', href: '/dashboard', variant: 'ghost' as const },
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#e7edf5_0%,#f5f7fb_22%,#f8fafc_100%)]">
      <div className="min-[761px]:grid min-[761px]:min-h-screen min-[761px]:grid-cols-[248px_minmax(0,1fr)]">
        <div className="hidden min-[761px]:block min-[761px]:border-r min-[761px]:border-[rgba(191,219,254,0.16)] min-[761px]:bg-[image:var(--nav-shell-bg)]">
          <div className="sticky top-0 h-screen">
            <MarketingSidebar />
          </div>
        </div>

        <section className="flex min-h-screen flex-col bg-[rgba(255,255,255,0.72)] backdrop-blur-[2px]">
          <MarketingHeader />
          <div className="flex-1 px-4 py-6 sm:px-5 md:px-6 lg:px-8">
          <div className="min-w-0">
          <section className="mb-10 grid gap-8 overflow-hidden rounded-[36px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] px-6 py-6 shadow-[var(--shadow-panel)] backdrop-blur-2xl lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-8">
            <div className="relative z-10 flex flex-col justify-center">
              <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.06)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--brand-secondary)]">
                <BriefcaseBusiness className="size-4" />
                Managed digital marketplace
              </div>
              <div className="max-w-3xl">
                <h1 className="font-display text-4xl leading-tight text-[var(--text-primary)] lg:text-6xl">
                  Run digital work with the right team in one protected workspace.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
                  Book, manage, and deliver software, design, content, and growth work in one flow.
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
                    WOLFIX runs digital work with clear scope, protected payment, and visible delivery.
                  </p>
                  <div className="mt-6 rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5">
                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
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
                  <div className="mt-8 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {pillars.map((pillar) => {
                      const Icon = pillar.icon;
                      return (
                        <div key={pillar.title} className="flex h-full flex-col rounded-[24px] border border-[var(--line)] bg-[var(--panel-strong)] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                          <div className="mb-3 flex items-start gap-3">
                            <div className="flex size-10 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] text-[var(--brand-primary)]">
                              <Icon className="size-4" />
                            </div>
                            <p className="min-w-0 flex-1 font-display text-lg leading-snug text-[var(--text-primary)] sm:text-xl">
                              {pillar.title}
                            </p>
                          </div>
                          <p className="text-sm leading-6 text-[var(--text-secondary)]">{pillar.copy}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div id="delivery-standards" className="relative p-8">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(65,205,189,0.12),transparent_48%)]" />
                  <div className="relative rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,249,255,0.94))] p-6">
                    <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--brand-secondary)]">Marketplace lanes</p>
                    <h2 className="font-display text-2xl text-[var(--text-primary)]">What runs here</h2>
                    <div className="mt-5 space-y-3">
                      {[
                        {
                          title: 'Secure settlement',
                          copy: 'Collection and payout stay controlled.',
                          Icon: BanknoteArrowDown,
                        },
                        {
                          title: 'Digital business lanes',
                          copy: 'Engineering, design, content, and growth stay together.',
                          Icon: ShieldCheck,
                        },
                        {
                          title: 'Smart operating layer',
                          copy: 'Alerts, notes, and AI stay close to the work.',
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
              <h2 className="mt-3 font-display text-4xl text-[var(--text-primary)]">Talk to WOLFIX.</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
                Need a build, design, campaign, automation, or support lane? Start here.
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
        </div>
          </div>
          <MarketingFooter variant="home" />
        </section>
      </div>
    </main>
  );
}
