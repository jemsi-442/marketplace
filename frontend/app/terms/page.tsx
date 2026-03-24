import { FileCheck2, HandCoins, ShieldCheck, Users } from 'lucide-react';

import { MarketingPageShell } from '@/components/marketing/marketing-page-shell';

const termsSections = [
  {
    title: 'Marketplace Use',
    copy: 'WOLFIX is intended for legitimate digital service engagements. Accounts must use accurate business or personal identity details and must not misrepresent capability, ownership, or delivery intent.',
  },
  {
    title: 'Service Conduct',
    copy: 'Providers are expected to publish clear service offers, realistic timelines, and commercially honest scope descriptions. Clients are expected to commission work in good faith and provide the information required for delivery.',
  },
  {
    title: 'Commercial Responsibility',
    copy: 'Bookings, service communication, delivery confirmation, disputes, and release decisions are expected to follow the platform workflow. Attempts to bypass agreed process, manipulate outcomes, or misuse platform communication may result in restrictions.',
  },
  {
    title: 'Platform Protection',
    copy: 'WOLFIX may suspend, limit, or remove access where there is evidence of fraud, abuse, unauthorised activity, platform misuse, or behaviour that materially threatens marketplace trust.',
  },
];

export default function TermsPage() {
  return (
    <MarketingPageShell
      eyebrow="Terms of Service"
      title="Clear standards for trusted digital commerce."
      intro="These terms describe the commercial expectations for clients, providers, and marketplace activity conducted through WOLFIX DIGITAL AGENCY."
      aside={
        <>
          {[
            ['Account integrity', 'Accurate identity and responsible account use are required.', Users],
            ['Service clarity', 'Listings and project briefs should be commercially honest and specific.', FileCheck2],
            ['Commercial discipline', 'Digital work should move through WOLFIX using the approved workflow.', HandCoins],
            ['Trust protection', 'Abuse, fraud, or manipulation may lead to platform action.', ShieldCheck],
          ].map(([title, copy, Icon]) => (
            <div key={title as string} className="rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(18,40,92,0.8),rgba(14,31,74,0.62))] p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[rgba(47,107,255,0.16)] text-[var(--brand-secondary)]">
                  <Icon className="size-5" />
                </div>
                <p className="font-medium text-[var(--text-primary)]">{title as string}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{copy as string}</p>
            </div>
          ))}
        </>
      }
    >
      {termsSections.map((section) => (
        <section key={section.title} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-6">
          <h2 className="font-display text-2xl text-[var(--text-primary)]">{section.title}</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{section.copy}</p>
        </section>
      ))}
    </MarketingPageShell>
  );
}
