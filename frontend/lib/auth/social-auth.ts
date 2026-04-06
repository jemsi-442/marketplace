import { appConfig } from '@/lib/config';

export type SocialAuthProvider = 'google' | 'github';
export type SocialAuthIntent = 'login' | 'register';
export type SocialAuthRole = 'client' | 'vendor';

interface SocialAuthStartOptions {
  intent: SocialAuthIntent;
  role?: SocialAuthRole | null;
  next?: string | null;
}

export function buildSocialAuthStartHref(provider: SocialAuthProvider, options: SocialAuthStartOptions): string {
  const params = new URLSearchParams({
    intent: options.intent,
  });

  if (options.role) {
    params.set('role', options.role);
  }

  const safeNext = sanitizeSocialAuthNext(options.next);
  if (safeNext) {
    params.set('next', safeNext);
  }

  return `${appConfig.apiBaseUrl}/api/auth/oauth/${provider}/start?${params.toString()}`;
}

export function sanitizeSocialAuthNext(next?: string | null): string | null {
  if (!next) {
    return null;
  }

  return next.startsWith('/dashboard') && !next.startsWith('//') ? next : null;
}
