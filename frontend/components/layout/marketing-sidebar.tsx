'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, LayoutDashboard, MessageSquareMore, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';

const sidebarSections = [
  {
    href: '/',
    label: 'Home',
    icon: BriefcaseBusiness,
  },
  {
    href: '#how-it-works',
    label: 'Workflow',
    icon: Workflow,
  },
  {
    href: '#about-wolfix',
    label: 'About WOLFIX',
    icon: Sparkles,
  },
  {
    href: '#service-categories',
    label: 'Service lanes',
    icon: ShieldCheck,
  },
  {
    href: '#consultation',
    label: 'Consultation',
    icon: MessageSquareMore,
  },
];

export function MarketingSidebar() {
  const [activeHref, setActiveHref] = useState('/');

  useEffect(() => {
    const sectionHrefs = sidebarSections
      .map((item) => item.href)
      .filter((href) => href.startsWith('#'));

    const updateActiveSection = () => {
      const offset = 140;
      let nextActive = '/';

      for (const href of sectionHrefs) {
        const section = document.getElementById(href.slice(1));

        if (!section) {
          continue;
        }

        const top = section.getBoundingClientRect().top;
        if (top - offset <= 0) {
          nextActive = href;
        }
      }

      setActiveHref(nextActive);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('hashchange', updateActiveSection);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('hashchange', updateActiveSection);
    };
  }, []);

  return (
    <aside className="flex h-full flex-col overflow-hidden bg-[image:var(--nav-shell-bg)] text-[var(--nav-shell-text)]">
      <div className="flex h-full flex-col bg-[image:var(--nav-shell-bg)] text-[var(--nav-shell-text)]">
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <div className="space-y-1.5">
            {sidebarSections.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-medium transition',
                  activeHref === href
                    ? 'bg-[image:var(--nav-shell-active)] text-white shadow-[var(--nav-shell-active-shadow)]'
                    : 'text-[var(--nav-shell-text)] hover:bg-[var(--nav-shell-hover)] hover:text-white',
                )}
                onClick={() => setActiveHref(href)}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-xl',
                      activeHref === href ? 'bg-[rgba(255,255,255,0.16)] text-white' : 'bg-[var(--nav-shell-icon)] text-[var(--nav-shell-muted)]',
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span>{label}</span>
                </span>
              </Link>
            ))}
          </div>
        </nav>

        <div className="border-t border-[color:var(--nav-shell-line)] px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--nav-shell-muted)]">Quick Entry</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Link href="/login">
              <span className="inline-flex h-10 w-full items-center justify-center rounded-[16px] border border-[rgba(191,219,254,0.16)] bg-[rgba(255,255,255,0.08)] text-sm font-semibold text-white transition hover:bg-[rgba(255,255,255,0.12)]">
                Sign in
              </span>
            </Link>
            <Link href="/register">
              <span className="inline-flex h-10 w-full items-center justify-center rounded-[16px] border border-[rgba(96,165,250,0.22)] bg-[linear-gradient(180deg,#2d6fd2_0%,#1d4f9a_52%,#163d79_100%)] text-sm font-semibold text-white shadow-[0_14px_26px_rgba(8,29,68,0.22)]">
                Create account
              </span>
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            <Link href="/dashboard" className="block">
              <span className="inline-flex h-10 w-full items-center justify-center rounded-[16px] border border-[rgba(191,219,254,0.16)] bg-[rgba(255,255,255,0.08)] px-4 text-sm font-semibold text-white transition hover:bg-[rgba(255,255,255,0.12)]">
                <LayoutDashboard className="mr-2 size-4" />
                Dashboards
              </span>
            </Link>
            <Link
              href="#consultation"
              className="flex items-center justify-between rounded-[16px] border border-[rgba(191,219,254,0.16)] bg-[rgba(255,255,255,0.06)] px-4 py-3 text-sm font-medium text-[var(--nav-shell-text)] transition hover:bg-[rgba(255,255,255,0.12)]"
            >
              <span>Talk to WOLFIX</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
