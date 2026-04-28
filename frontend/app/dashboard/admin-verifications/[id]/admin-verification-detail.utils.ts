'use client';

import { appConfig } from '@/lib/config';

export const STALE_MS = 30_000;

export interface AttemptTrendPoint {
  label: string;
  value: number;
  timestamp?: number;
}

export function getVerificationTone(
  status: string,
  badgeGranted: boolean,
): 'success' | 'warning' | 'info' {
  if (badgeGranted || status === 'verified') {
    return 'success';
  }

  if (status === 'needs_revision') {
    return 'warning';
  }

  return 'info';
}

export function getVerificationLabel(
  status: string,
  badgeGranted: boolean,
): string {
  if (badgeGranted || status === 'verified') {
    return 'Blue tick active';
  }

  if (status === 'interview_ready') {
    return 'Interview ready';
  }

  if (status === 'resume_uploaded') {
    return 'Resume uploaded';
  }

  if (status === 'needs_revision') {
    return 'Needs revision';
  }

  return 'Not started';
}

export function normalizeDownloadUrl(url?: string | null): string | null {
  if (!url) {
    return null;
  }

  return /^https?:\/\//i.test(url) ? url : `${appConfig.apiBaseUrl}${url}`;
}

export function formatAttemptLabel(value: string, index: number): string {
  const parsed = new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  }

  return `A${index + 1}`;
}
