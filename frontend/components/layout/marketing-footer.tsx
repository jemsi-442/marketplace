import { Instagram, MapPin } from 'lucide-react';
import Link from 'next/link';

interface MarketingFooterProps {
  variant?: 'full' | 'compact' | 'auth' | 'home';
}

export function MarketingFooter({ variant = 'full' }: MarketingFooterProps) {
  const footerClassName =
    variant === 'home'
      ? 'border-t border-[rgba(191,219,254,0.14)] bg-[color:var(--shell-dark-blue)]'
      : variant === 'compact'
      ? 'border-t border-[rgba(191,219,254,0.14)] bg-[color:var(--shell-dark-blue)]'
      : variant === 'auth'
        ? 'border-t border-[rgba(191,219,254,0.14)] bg-[color:var(--shell-dark-blue)] shadow-[0_-18px_42px_rgba(2,8,23,0.08)]'
        : 'mt-14 border-t border-[rgba(191,219,254,0.14)] bg-[color:var(--shell-dark-blue)]';

  return (
    <footer className={footerClassName}>
      {variant === 'home' ? (
        <div className="flex w-full flex-col gap-6 px-4 py-5 text-sm text-[rgba(226,232,240,0.84)] sm:px-6 lg:px-8 xl:px-10">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h3 className="text-xl font-semibold text-white">Keep the workspace close.</h3>
              <p className="mt-2 max-w-2xl leading-6 text-[rgba(226,232,240,0.82)]">
                Follow updates, find the studio, and move into the right lane when you are ready to start a build, design, or growth project.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href="https://www.instagram.com/wolfixdigitalagency?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(191,219,254,0.18)] bg-[rgba(255,255,255,0.08)] px-3 py-2 text-sm font-medium text-white transition hover:bg-[rgba(255,255,255,0.12)]"
                >
                  <Instagram className="size-4" />
                  Instagram
                </a>
                <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(191,219,254,0.14)] bg-[rgba(255,255,255,0.05)] px-3 py-2 text-sm text-[rgba(226,232,240,0.9)]">
                  <MapPin className="size-4 text-[rgba(96,165,250,0.9)]" />
                  Mlimani City, Dar es Salaam
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href="mailto:wolfixagency84@gmail.com"
                className="rounded-[18px] border border-[rgba(191,219,254,0.14)] bg-[rgba(255,255,255,0.06)] px-4 py-4 transition hover:bg-[rgba(255,255,255,0.1)]"
              >
                <p className="text-[10px] uppercase tracking-[0.18em] text-[rgba(191,219,254,0.72)]">Email</p>
                <p className="mt-2 font-medium text-white">wolfixagency84@gmail.com</p>
              </a>
              <a
                href="https://wa.me/255622670772"
                target="_blank"
                rel="noreferrer"
                className="rounded-[18px] border border-[rgba(191,219,254,0.14)] bg-[rgba(255,255,255,0.06)] px-4 py-4 transition hover:bg-[rgba(255,255,255,0.1)]"
              >
                <p className="text-[10px] uppercase tracking-[0.18em] text-[rgba(191,219,254,0.72)]">WhatsApp</p>
                <p className="mt-2 font-medium text-white">+255 622 670 772</p>
              </a>
              <Link
                href="/terms"
                className="rounded-[18px] border border-[rgba(191,219,254,0.14)] bg-[rgba(255,255,255,0.04)] px-4 py-4 transition hover:bg-[rgba(255,255,255,0.08)]"
              >
                <p className="text-[10px] uppercase tracking-[0.18em] text-[rgba(191,219,254,0.72)]">Terms</p>
                <p className="mt-2 font-medium text-white">Platform policies</p>
              </Link>
              <Link
                href="/privacy"
                className="rounded-[18px] border border-[rgba(191,219,254,0.14)] bg-[rgba(255,255,255,0.04)] px-4 py-4 transition hover:bg-[rgba(255,255,255,0.08)]"
              >
                <p className="text-[10px] uppercase tracking-[0.18em] text-[rgba(191,219,254,0.72)]">Privacy</p>
                <p className="mt-2 font-medium text-white">Data and account safety</p>
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-[rgba(191,219,254,0.14)] pt-4 text-[rgba(226,232,240,0.82)] sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 WOLFIX DIGITAL AGENCY. All rights reserved.</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(191,219,254,0.74)]">Digital marketplace workspace</p>
          </div>
        </div>
      ) : (
        <div
          className={
            variant === 'compact'
              ? 'flex w-full flex-col gap-2 px-4 py-4 text-sm text-[rgba(226,232,240,0.82)] sm:px-6 sm:flex-row sm:items-center sm:justify-between lg:px-8 xl:px-10'
              : variant === 'auth'
                ? 'mx-auto flex w-full max-w-7xl flex-col gap-2 px-6 py-5 text-sm text-[rgba(226,232,240,0.86)] sm:flex-row sm:items-center sm:justify-between lg:px-8'
                : 'mx-auto flex w-full max-w-7xl flex-col gap-2 px-6 py-6 text-sm text-[rgba(226,232,240,0.82)] sm:flex-row sm:items-center sm:justify-between lg:px-8'
          }
        >
          <p>© 2026 WOLFIX DIGITAL AGENCY. All rights reserved.</p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(191,219,254,0.74)]">Digital marketplace workspace</p>
        </div>
      )}
    </footer>
  );
}
