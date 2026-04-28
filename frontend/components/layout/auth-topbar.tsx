'use client';

import Image from 'next/image';
import Link from 'next/link';

import { InstallCtaButton } from '@/components/pwa/install-cta-button';
import { Button } from '@/components/ui/button';

interface AuthTopbarProps {
  subtitle: string;
  primaryHref: string;
  primaryLabel: string;
}

export function AuthTopbar({ subtitle, primaryHref, primaryLabel }: AuthTopbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(191,219,254,0.14)] bg-[color:var(--shell-dark-blue)] shadow-[0_18px_42px_rgba(2,8,23,0.16)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-4">
          <div className="flex size-12 items-center justify-center overflow-hidden rounded-2xl border border-[rgba(191,219,254,0.18)] bg-[rgba(255,255,255,0.08)] shadow-[0_12px_30px_rgba(7,24,84,0.16)]">
            <Image src="/brand/wolfix-logo.svg" alt="WOLFIX DIGITAL AGENCY logo" width={34} height={34} className="h-8 w-8 object-cover" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgba(191,219,254,0.82)]">WOLFIX DIGITAL AGENCY</p>
            <p className="mt-1 truncate text-sm text-[rgba(226,232,240,0.86)]">{subtitle}</p>
          </div>
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          <InstallCtaButton variant="ghost" className="border-[rgba(191,219,254,0.12)] bg-[rgba(255,255,255,0.05)] text-white hover:bg-[rgba(255,255,255,0.08)] hover:text-white" />
          <Link href="/">
            <Button variant="ghost" className="border-[rgba(191,219,254,0.12)] bg-[rgba(255,255,255,0.05)] text-white hover:bg-[rgba(255,255,255,0.08)] hover:text-white">
              Home
            </Button>
          </Link>
          <Link href={primaryHref}>
            <Button>{primaryLabel}</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
