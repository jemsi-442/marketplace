import { DatabaseZap, EyeOff, LockKeyhole, UserRoundCheck } from 'lucide-react';

import { MarketingPageShell } from '@/components/marketing/marketing-page-shell';

const privacySections = [
  {
    title: 'Information We Use',
    copy: 'Account, service, communication, and marketplace activity data support access, delivery coordination, safety, and commercial reliability.',
    icon: DatabaseZap,
  },
  {
    title: 'Why It Is Used',
    copy: 'Information supports account access, service operations, delivery visibility, support response, and trust controls across the marketplace.',
    icon: EyeOff,
  },
  {
    title: 'How It Is Protected',
    copy: 'Access control, workflow discipline, and operational review reduce misuse and protect platform data from unauthorised handling.',
    icon: LockKeyhole,
  },
  {
    title: 'User Expectations',
    copy: 'Users should protect credentials, use legitimate contact information, and keep sensitive project information inside the intended workflow.',
    icon: UserRoundCheck,
  },
];

export default function PrivacyPage() {
  return (
    <MarketingPageShell
      eyebrow="Privacy"
      title="Privacy on WOLFIX."
      intro="WOLFIX uses marketplace information for service delivery, account management, and trust protection. This page explains the general expectations around that use."
      aside={
        <>
          {[
            { title: 'Necessary use', copy: 'Use data only where work or safety needs it.', Icon: EyeOff, tone: 'bg-[rgba(79,70,229,0.08)] text-[var(--brand-primary)]' },
            { title: 'Secure handling', copy: 'Keep account and marketplace access limited.', Icon: LockKeyhole, tone: 'bg-[rgba(13,148,136,0.1)] text-[var(--accent-teal)]' },
            { title: 'Operational review', copy: 'Platform activity may be reviewed to preserve trust.', Icon: DatabaseZap, tone: 'bg-[rgba(14,165,233,0.1)] text-[var(--accent-cyan)]' },
            { title: 'User discipline', copy: 'Protect credentials and sensitive project detail.', Icon: UserRoundCheck, tone: 'bg-[rgba(245,158,11,0.12)] text-[var(--accent-amber)]' },
          ].map(({ title, copy, Icon, tone }) => (
            <div key={title as string} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-strong)] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
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
      {privacySections.map((section, index) => {
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
