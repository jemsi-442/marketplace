'use client';

interface VerificationLinkExtras {
  email?: string | null;
  type?: 'client' | 'vendor' | null;
  source?: 'register' | 'login' | null;
}

export function toVerificationPageHref(
  verificationUrl?: string | null,
  extras: VerificationLinkExtras = {},
): string | null {
  if (!verificationUrl) {
    return null;
  }

  try {
    const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(verificationUrl, fallbackOrigin);
    if (extras.email) {
      parsed.searchParams.set('email', extras.email);
    }

    if (extras.type) {
      parsed.searchParams.set('type', extras.type);
    }

    if (extras.source) {
      parsed.searchParams.set('source', extras.source);
    }

    const params = parsed.searchParams.toString();

    return params ? `/verify-email?${params}` : '/verify-email';
  } catch {
    return null;
  }
}
