'use client';

export type LoginLinkReason =
  | 'verified'
  | 'verify-required'
  | 'signed-out'
  | 'session-required'
  | 'account-ready';

interface LoginLinkOptions {
  email?: string | null;
  reason?: LoginLinkReason | null;
  next?: string | null;
}

export function sanitizeLoginNext(next?: string | null): string | null {
  if (!next) {
    return null;
  }

  return next.startsWith('/dashboard') ? next : null;
}

export function toLoginHref(options: LoginLinkOptions = {}): string {
  const params = new URLSearchParams();

  if (options.email) {
    params.set('email', options.email);
  }

  if (options.reason) {
    params.set('reason', options.reason);
  }

  const safeNext = sanitizeLoginNext(options.next);

  if (safeNext) {
    params.set('next', safeNext);
  }

  const query = params.toString();

  return query ? `/login?${query}` : '/login';
}
