import { DatabaseZap, EyeOff, LockKeyhole, UserRoundCheck } from 'lucide-react';

import { MarketingPageShell } from '@/components/marketing/marketing-page-shell';

const privacySections = [
  {
    title: 'Information We Use',
    copy: 'WOLFIX uses account, communication, service, and marketplace activity data to support onboarding, workspace access, service delivery coordination, platform safety, and commercial reliability.',
  },
  {
    title: 'Why It Is Used',
    copy: 'Information is used to maintain account access, support service operations, assist with delivery visibility, respond to support issues, and strengthen trust and safety controls across the marketplace.',
  },
  {
    title: 'How It Is Protected',
    copy: 'WOLFIX applies access control, workflow discipline, and operational review to reduce misuse and protect platform data from unauthorised handling or abuse.',
  },
  {
    title: 'User Expectations',
    copy: 'Users should keep credentials private, use legitimate contact information, and avoid sharing sensitive project or business information outside the intended commercial workflow unless necessary for delivery.',
  },
];

export default function PrivacyPage() {
  return (
    <MarketingPageShell
      eyebrow="Privacy"
      title="Privacy expectations built around commercial trust."
      intro="WOLFIX handles marketplace information for service delivery, account management, and trust protection. This page explains the general expectations around how that information is used."
      aside={
        <>
          {[
            ['Minimum necessary use', 'Information should support delivery, support, and safe marketplace operation.', EyeOff],
            ['Secure handling', 'Account and marketplace information should be accessed only where needed.', LockKeyhole],
            ['Operational oversight', 'Platform activity may be reviewed where necessary to preserve trust.', DatabaseZap],
            ['Responsible user behaviour', 'Users should keep credentials and sensitive project details protected.', UserRoundCheck],
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
      {privacySections.map((section) => (
        <section key={section.title} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-6">
          <h2 className="font-display text-2xl text-[var(--text-primary)]">{section.title}</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{section.copy}</p>
        </section>
      ))}
    </MarketingPageShell>
  );
}
