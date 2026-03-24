import { AlertTriangle, BadgeCheck, ShieldAlert, Waypoints } from 'lucide-react';

import { MarketingPageShell } from '@/components/marketing/marketing-page-shell';

const safetySections = [
  {
    title: 'Marketplace Safety',
    copy: 'WOLFIX is designed to support serious digital service work through clearer process, structured communication, and disciplined commercial flow. Suspicious activity, abusive behaviour, or deceptive conduct may trigger review or restrictions.',
  },
  {
    title: 'Service Trust',
    copy: 'Providers should represent capability honestly, respect delivery commitments, and communicate clearly. Clients should commission work in good faith and avoid manipulative booking, dispute, or communication behaviour.',
  },
  {
    title: 'Risk Response',
    copy: 'WOLFIX may investigate unusual platform behaviour, repeated complaints, delivery irregularities, or activity that threatens trust across the marketplace. Actions may include warnings, access limits, or stronger protective steps.',
  },
  {
    title: 'How To Reach Support',
    copy: 'If you need help around suspicious activity, account access, delivery concerns, or trust issues, contact WOLFIX directly through the listed support channels so the matter can be reviewed in the proper workflow.',
  },
];

export default function TrustSafetyPage() {
  return (
    <MarketingPageShell
      eyebrow="Trust & Safety"
      title="Trust, accountability, and platform protection."
      intro="WOLFIX maintains marketplace quality by combining clear commercial expectations with action against abuse, fraud, and behaviour that damages trust."
      aside={
        <>
          {[
            ['Verified commercial intent', 'The platform is meant for real digital work between serious clients and providers.', BadgeCheck],
            ['Protective review', 'Unusual activity or trust concerns may trigger investigation and follow-up.', ShieldAlert],
            ['Early risk signals', 'Patterns that threaten delivery confidence or platform stability may be escalated quickly.', AlertTriangle],
            ['Structured escalation', 'Support and trust issues should move through the correct WOLFIX channels.', Waypoints],
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
      {safetySections.map((section) => (
        <section key={section.title} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-6">
          <h2 className="font-display text-2xl text-[var(--text-primary)]">{section.title}</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{section.copy}</p>
        </section>
      ))}
    </MarketingPageShell>
  );
}
