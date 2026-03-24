import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Instagram, Mail, MapPin, MessageCircle, PhoneCall } from 'lucide-react';

import { Button } from '@/components/ui/button';

const footerGroups = [
  {
    title: 'Marketplace',
    links: [
      { label: 'How It Works', href: '/#how-it-works' },
      { label: 'Service Categories', href: '/#service-categories' },
      { label: 'Workspace Preview', href: '/dashboard' },
      { label: 'Get Started', href: '/register' },
    ],
  },
  {
    title: 'Providers',
    links: [
      { label: 'Become a Provider', href: '/register' },
      { label: 'Provider Workspace', href: '/dashboard/vendor' },
      { label: 'Delivery Standards', href: '/#delivery-standards' },
      { label: 'Growth Opportunities', href: '/#growth-opportunities' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About WOLFIX', href: '/#about-wolfix' },
      { label: 'Digital Services Focus', href: '/#digital-focus' },
      { label: 'Contact', href: 'mailto:wolfixagency84@gmail.com' },
      { label: 'Join the Platform', href: '/login' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Desk', href: 'mailto:wolfixagency84@gmail.com' },
      { label: 'Trust & Safety', href: '/trust-safety' },
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy', href: '/privacy' },
    ],
  },
];

interface MarketingFooterProps {
  variant?: 'full' | 'compact';
}

export function MarketingFooter({ variant = 'full' }: MarketingFooterProps) {
  if (variant === 'compact') {
    return (
      <footer className="mt-8 overflow-hidden rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(8,20,48,0.92),rgba(13,30,74,0.84))] shadow-[var(--shadow-soft)] backdrop-blur-2xl">
        <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">WOLFIX DIGITAL AGENCY</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Business support, contact channels, and trusted platform guidance remain available while work continues inside the workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
            <Link href="tel:+255622670772" className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 transition hover:text-[var(--text-primary)]">
              <PhoneCall className="size-4 text-[var(--brand-secondary)]" />
              Call
            </Link>
            <Link href="mailto:wolfixagency84@gmail.com" className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 transition hover:text-[var(--text-primary)]">
              <Mail className="size-4 text-[var(--brand-secondary)]" />
              Email
            </Link>
            <Link href="/terms" className="transition hover:text-[var(--text-primary)]">
              Terms
            </Link>
            <Link href="/privacy" className="transition hover:text-[var(--text-primary)]">
              Privacy
            </Link>
            <Link href="/trust-safety" className="transition hover:text-[var(--text-primary)]">
              Trust & Safety
            </Link>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="mt-10 overflow-hidden rounded-[32px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(8,20,48,0.94),rgba(13,30,74,0.9))] shadow-[var(--shadow-panel)] backdrop-blur-2xl">
      <div className="grid gap-4 border-b border-[var(--line)] bg-[linear-gradient(135deg,rgba(18,40,92,0.88),rgba(14,31,74,0.74))] px-6 py-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-secondary)]">Consultation Desk</p>
          <h2 className="mt-3 font-display text-3xl text-[var(--text-primary)]">Need a tailored digital delivery partner?</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            WOLFIX helps organisations commission software, design, growth, and specialist digital work through a structured commercial experience.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          <Link href="/#consultation">
            <Button>
              Book a consultation
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
          <div className="flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
            <Link
              href="mailto:wolfixagency84@gmail.com"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 transition hover:border-[rgba(184,208,255,0.32)] hover:text-[var(--text-primary)]"
            >
              <Mail className="size-4 text-[var(--brand-secondary)]" />
              wolfixagency84@gmail.com
            </Link>
            <Link
              href="tel:+255622670772"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 transition hover:border-[rgba(184,208,255,0.32)] hover:text-[var(--text-primary)]"
            >
              <PhoneCall className="size-4 text-[var(--brand-secondary)]" />
              +255 622 670 772
            </Link>
            <Link
              href="https://wa.me/255622670772"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 transition hover:border-[rgba(184,208,255,0.32)] hover:text-[var(--text-primary)]"
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="size-4 text-[var(--brand-secondary)]" />
              WhatsApp
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-8 border-b border-[var(--line)] px-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-4">
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_16px_36px_rgba(7,24,84,0.24)]">
              <Image src="/brand/wolfix-logo.svg" alt="WOLFIX DIGITAL AGENCY logo" width={56} height={56} className="h-14 w-14 object-cover" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--brand-secondary)]">WOLFIX DIGITAL AGENCY</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Premium marketplace for digital services and project delivery.</p>
            </div>
          </div>

          <h2 className="mt-6 font-display text-3xl text-[var(--text-primary)]">A trusted commercial surface for serious digital work.</h2>
          <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">
            WOLFIX connects organisations with high-value providers across software engineering, design, growth, and specialist digital delivery.
            Every engagement is designed to stay clear, organised, and commercially dependable.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['Built for premium services', 'Software engineering, design systems, social media management, SEO, automation, and specialist consulting.'],
            ['One organised client journey', 'Discovery, booking, communication, delivery, and follow-through stay in one coherent operating flow.'],
            ['Provider growth with structure', 'Experts can present services clearly, manage delivery, and build repeat commercial momentum.'],
            ['Operational confidence', 'WOLFIX keeps service activity visible, coordinated, and commercially disciplined.'],
          ].map(([title, copy]) => (
            <div key={title} className="rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(18,40,92,0.8),rgba(14,31,74,0.62))] p-4">
              <p className="font-medium text-[var(--text-primary)]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{copy}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1fr_2fr] lg:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-secondary)]">WOLFIX Promise</p>
          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
            Delivering a refined digital marketplace where businesses can source, commission, and manage premium digital services with confidence.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
            <Link
              href="https://www.instagram.com/wolfixdigitalagency?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 transition hover:text-[var(--text-primary)]"
              target="_blank"
              rel="noreferrer"
            >
              <Instagram className="size-4 text-[var(--brand-secondary)]" />
              Instagram
            </Link>
            <Link
              href="https://wa.me/255622670772"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 transition hover:text-[var(--text-primary)]"
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="size-4 text-[var(--brand-secondary)]" />
              WhatsApp
            </Link>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-[var(--text-primary)]">{group.title}</p>
              <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
                {group.links.map((link) => (
                  <Link key={link.label} href={link.href} className="block transition hover:text-[var(--text-primary)]">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--line)] px-6 py-5 text-sm text-[var(--text-tertiary)] lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>© 2026 WOLFIX DIGITAL AGENCY. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-4 leading-7">
          <span className="inline-flex items-center gap-2">
            <MapPin className="size-4" />
            Mlimani City, Dar es Salaam
          </span>
          <Link
            href="tel:+255622670772"
            className="inline-flex items-center gap-2 transition hover:text-[var(--text-primary)]"
          >
            <PhoneCall className="size-4" />
            +255 622 670 772
          </Link>
          <Link
            href="tel:+255683186987"
            className="inline-flex items-center gap-2 transition hover:text-[var(--text-primary)]"
          >
            <PhoneCall className="size-4" />
            +255 683 186 987
          </Link>
          <Link
            href="mailto:wolfixagency84@gmail.com"
            className="inline-flex items-center gap-2 transition hover:text-[var(--text-primary)]"
          >
            <Mail className="size-4" />
            wolfixagency84@gmail.com
          </Link>
          <Link
            href="https://www.instagram.com/wolfixdigitalagency?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
            className="inline-flex items-center gap-2 transition hover:text-[var(--text-primary)]"
            target="_blank"
            rel="noreferrer"
          >
            <Instagram className="size-4" />
            @wolfixdigitalagency
          </Link>
          <Link
            href="https://wa.me/255622670772"
            className="inline-flex items-center gap-2 transition hover:text-[var(--text-primary)]"
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="size-4" />
            WhatsApp
          </Link>
          <Link href="/terms" className="transition hover:text-[var(--text-primary)]">
            Terms
          </Link>
          <Link href="/privacy" className="transition hover:text-[var(--text-primary)]">
            Privacy
          </Link>
          <Link href="/trust-safety" className="transition hover:text-[var(--text-primary)]">
            Trust & Safety
          </Link>
        </div>
      </div>
    </footer>
  );
}
