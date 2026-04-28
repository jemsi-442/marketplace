export type VerificationFilter =
  | 'all'
  | 'ready_review'
  | 'badge_active'
  | 'needs_revision'
  | 'missing_resume';

export const PAGE_SIZE = 10;
export const ADMIN_VERIFICATIONS_STALE_MS = 60_000;

export const verificationFilterOptions: Array<{
  value: VerificationFilter;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'ready_review', label: 'Ready review' },
  { value: 'badge_active', label: 'Blue tick active' },
  { value: 'needs_revision', label: 'Needs revision' },
  { value: 'missing_resume', label: 'Missing resume' },
];

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

export function getVerificationResultSummary(
  filter: VerificationFilter,
  search: string,
): string {
  const trimmedSearch = search.trim();

  switch (filter) {
    case 'ready_review':
      return 'Showing vendors who already submitted practical interview answers and can be reviewed now.';
    case 'badge_active':
      return 'Showing vendors whose blue tick is already active.';
    case 'needs_revision':
      return 'Showing vendors who need another pass before the trust signal can stay active.';
    case 'missing_resume':
      return 'Showing vendors who still have no resume evidence in the verification lane.';
    default:
      return trimmedSearch
        ? `Showing verification records for "${trimmedSearch}"`
        : 'Showing all vendor verification records';
  }
}

export function getVerificationReadinessSummary(options: {
  resumeUploaded: boolean;
  interviewSubmittedAt?: string | null;
}): string {
  if (options.resumeUploaded) {
    return options.interviewSubmittedAt
      ? 'Resume evidence and interview answers are ready. Open the record to review.'
      : 'Resume evidence is present. The interview may still be waiting.';
  }

  return 'This vendor still needs resume evidence.';
}
