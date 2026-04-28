'use client';

import type {
  VendorInterviewQuestion,
  VendorInterviewSubmitResponse,
} from '@/lib/types';

export const PROFILE_STALE_MS = 30_000;

export type VerificationTone = 'success' | 'info' | 'warning';
export type VendorVerificationFeedbackSummary = NonNullable<VendorInterviewSubmitResponse['feedback_summary']>;

export function resolveVerificationTone(
  status?: string | null,
  badgeGranted?: boolean,
): VerificationTone {
  if (badgeGranted || status === 'verified') {
    return 'success';
  }

  if (status === 'needs_revision') {
    return 'warning';
  }

  return 'info';
}

export function resolveVerificationLabel(
  status?: string | null,
  badgeGranted?: boolean,
): string {
  if (badgeGranted || status === 'verified') {
    return 'Blue tick active';
  }

  switch (status) {
    case 'resume_uploaded':
      return 'Resume uploaded';
    case 'interview_ready':
      return 'Interview ready';
    case 'needs_revision':
      return 'Needs another pass';
    default:
      return 'Not started';
  }
}

export function collectInterviewSignals(
  questions: VendorInterviewQuestion[],
): string[] {
  return Array.from(
    new Set(
      questions.flatMap((question) =>
        Array.isArray(question.practical_signals)
          ? question.practical_signals.filter(
              (signal): signal is string =>
                typeof signal === 'string' && signal.trim() !== '',
            )
          : [],
      ),
    ),
  ).slice(0, 8);
}

export function buildInterviewHintSummary(
  questions: VendorInterviewQuestion[],
): string {
  const signals = collectInterviewSignals(questions);

  if (signals.length === 0) {
    return 'Strong answers usually show the real steps you take, the checks you make before delivery, and how you keep the client updated.';
  }

  return `Strong answers usually mention real work signals like ${signals.slice(0, 4).join(', ')} and explain how you move from first check to final handoff.`;
}

export function resolveResumeMimeType(file: File): string {
  if (file.type && file.type.trim() !== '') {
    return file.type;
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  return (
    {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
    }[extension] ?? 'application/octet-stream'
  );
}

export function isDirectUploadUnavailable(error: Error): boolean {
  return error.message.includes('Direct resume upload is not available');
}

export async function uploadFileToDirectTarget(
  url: string,
  method: string,
  headers: Record<string, string>,
  file: File,
): Promise<void> {
  const response = await fetch(url, {
    method,
    headers,
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Direct upload failed with status ${response.status}`);
  }
}
