import { Suspense } from 'react';

import { VerifyEmailView } from '@/components/auth/verify-email-view';

function VerifyEmailFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10 text-[var(--text-secondary)]">
      Preparing verification check...
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailView />
    </Suspense>
  );
}
