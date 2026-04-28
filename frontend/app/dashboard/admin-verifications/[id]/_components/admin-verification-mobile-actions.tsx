'use client';

import { ArrowRight, Download } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface AdminVerificationMobileActionsProps {
  canDownloadResume: boolean;
  isPreparingResumeLink: boolean;
  onDownloadResume: () => void;
}

export function AdminVerificationMobileActions({
  canDownloadResume,
  isPreparingResumeLink,
  onDownloadResume,
}: AdminVerificationMobileActionsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link href="/dashboard/admin-verifications">
        <Button
          variant="ghost"
          className="w-full justify-between rounded-2xl border border-[var(--line)] px-4 py-5"
        >
          Back to queue
          <ArrowRight className="size-4 rotate-180" />
        </Button>
      </Link>
      {canDownloadResume ? (
        <Button
          className="w-full justify-between rounded-2xl bg-[var(--brand-primary)] px-4 py-5 text-white hover:bg-[var(--brand-primary-strong)] sm:w-auto"
          onClick={onDownloadResume}
          disabled={isPreparingResumeLink}
        >
          {isPreparingResumeLink ? 'Preparing link' : 'Download resume'}
          <Download className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
