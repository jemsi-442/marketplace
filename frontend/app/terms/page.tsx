import { FileCheck2, HandCoins, ShieldCheck, Users } from 'lucide-react';

import { MarketingPageShell } from '@/components/marketing/marketing-page-shell';

const termsSections = [
  {
    title: 'Marketplace Use',
    copy: 'WOLFIX is for legitimate digital service engagements. Accounts must use accurate identity details and must not misrepresent capability or delivery intent.',
    icon: Users,
  },
  {
    title: 'Service Conduct',
    copy: 'Providers should present clear capability lanes and realistic timelines. Clients should commission work in good faith and provide the information required for delivery.',
    icon: FileCheck2,
  },
  {
    title: 'Commercial Responsibility',
    copy: 'Bookings, communication, delivery confirmation, disputes, and release decisions should follow the platform workflow. Attempts to bypass or manipulate process may lead to restrictions.',
    icon: HandCoins,
  },
  {
    title: 'Platform Protection',
    copy: 'WOLFIX may suspend, limit, or remove access where there is evidence of fraud, abuse, unauthorised activity, or behaviour that materially threatens marketplace trust.',
    icon: ShieldCheck,
  },
];

export default function TermsPage() {
  return (
    <MarketingPageShell
      eyebrow="Terms of Service"
      title="Terms for using WOLFIX."
      intro="These terms explain the basic commercial expectations for clients, providers, and marketplace activity on WOLFIX."
      aside={
        <>
          {[
            { title: 'Account integrity', copy: 'Accurate identity and responsible account use are required.', Icon: Users, tone: 'bg-[rgba(79,70,229,0.08)] text-[var(--brand-primary)]' },
            { title: 'Service clarity', copy: 'Listings and briefs should be commercially honest and specific.', Icon: FileCheck2, tone: 'bg-[rgba(14,165,233,0.1)] text-[var(--accent-cyan)]' },
            { title: 'Commercial discipline', copy: 'Digital work should move through the approved workflow.', Icon: HandCoins, tone: 'bg-[rgba(13,148,136,0.1)] text-[var(--accent-teal)]' },
            { title: 'Trust protection', copy: 'Abuse, fraud, or manipulation may lead to platform action.', Icon: ShieldCheck, tone: 'bg-[rgba(245,158,11,0.12)] text-[var(--accent-amber)]' },
          ].map(({ title, copy, Icon, tone }) => (
            <div key={title} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-strong)] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                <div className={`flex size-11 items-center justify-center rounded-2xl ${tone}`}>
                  <Icon className="size-5" />
                </div>
                <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Focus</p>
                  <p className="font-medium text-[var(--text-primary)]">{title}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{copy}</p>
            </div>
          ))}
        </>
      }
    >
      {termsSections.map((section, index) => {
        const Icon = section.icon;
        return (
        <section key={section.title} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-[var(--brand-primary)]">
              <div className="flex size-10 items-center justify-center rounded-2xl border border-[var(--line)] bg-white">
                <Icon className="size-4" />
              </div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Section</p>
            </div>
            <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{index + 1}</span>
          </div>
          <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">{section.title}</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{section.copy}</p>
        </section>
      )})}
    </MarketingPageShell>
  );
}
