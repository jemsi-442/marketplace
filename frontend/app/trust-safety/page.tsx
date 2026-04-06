import { AlertTriangle, BadgeCheck, ShieldAlert, Waypoints } from 'lucide-react';

import { MarketingPageShell } from '@/components/marketing/marketing-page-shell';

const safetySections = [
  {
    title: 'Marketplace Safety',
    copy: 'WOLFIX supports serious digital service work through clear process, structured communication, and disciplined commercial flow. Suspicious or deceptive conduct may trigger review.',
    icon: BadgeCheck,
  },
  {
    title: 'Service Trust',
    copy: 'Providers should represent capability honestly, respect delivery commitments, and communicate clearly. Clients should commission work in good faith and avoid manipulative behaviour.',
    icon: Waypoints,
  },
  {
    title: 'Risk Response',
    copy: 'WOLFIX may investigate unusual behaviour, repeated complaints, delivery irregularities, or activity that threatens marketplace trust. Actions may include warnings or access limits.',
    icon: ShieldAlert,
  },
  {
    title: 'How To Reach Support',
    copy: 'If you need help with suspicious activity, access, delivery concerns, or trust issues, contact WOLFIX through the listed support channels so the matter can be reviewed in the proper workflow.',
    icon: AlertTriangle,
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
            { title: 'Verified intent', copy: 'The platform is for real digital work between serious clients and providers.', Icon: BadgeCheck, tone: 'bg-[rgba(13,148,136,0.1)] text-[var(--accent-teal)]' },
            { title: 'Protective review', copy: 'Unusual activity or trust concerns may trigger investigation.', Icon: ShieldAlert, tone: 'bg-[rgba(249,115,22,0.12)] text-[var(--accent-coral)]' },
            { title: 'Risk signals', copy: 'Patterns that threaten delivery confidence may be escalated quickly.', Icon: AlertTriangle, tone: 'bg-[rgba(245,158,11,0.12)] text-[var(--accent-amber)]' },
            { title: 'Structured escalation', copy: 'Support and trust issues should move through the correct channels.', Icon: Waypoints, tone: 'bg-[rgba(14,165,233,0.1)] text-[var(--accent-cyan)]' },
          ].map(({ title, copy, Icon, tone }) => (
            <div key={title} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-strong)] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                <div className={`flex size-11 items-center justify-center rounded-2xl ${tone}`}>
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Signal</p>
                  <p className="font-medium text-[var(--text-primary)]">{title}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{copy}</p>
            </div>
          ))}
        </>
      }
    >
      {safetySections.map((section, index) => {
        const Icon = section.icon;
        return (
        <section key={section.title} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-[var(--brand-primary)]">
              <div className="flex size-10 items-center justify-center rounded-2xl border border-[var(--line)] bg-white">
                <Icon className="size-4" />
              </div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Safety section</p>
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
