'use client';

import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { VendorProfile } from '@/lib/types';

interface VendorVerificationAttemptHistoryProps {
  attempts: NonNullable<VendorProfile['interview_attempt_history']>;
  scoreDelta: number | null;
}

export function VendorVerificationAttemptHistory({
  attempts,
  scoreDelta,
}: VendorVerificationAttemptHistoryProps) {
  const latestAttempt = attempts[0] ?? null;

  return (
    <Card className="rounded-[30px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
              Attempt history
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              See your progress
            </h3>
          </div>
          {latestAttempt ? (
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                label={`Latest ${latestAttempt.score}%`}
                tone={latestAttempt.passed ? 'success' : 'warning'}
              />
              {scoreDelta !== null ? (
                <StatusBadge
                  label={
                    scoreDelta >= 0
                      ? `+${scoreDelta} vs last`
                      : `${scoreDelta} vs last`
                  }
                  tone={scoreDelta >= 0 ? 'success' : 'warning'}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3">
          {attempts.slice(0, 4).map((attempt, index) => (
            <div
              key={`${attempt.submitted_at}-${index}`}
              className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                    {index === 0 ? 'Latest attempt' : `Attempt ${index + 1}`}
                  </p>
                  <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                    {attempt.submitted_at}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge
                    label={`Score ${attempt.score}%`}
                    tone={attempt.passed ? 'success' : 'warning'}
                  />
                  <StatusBadge
                    label={
                      attempt.badge_granted
                        ? 'Blue tick earned'
                        : 'Needs another pass'
                    }
                    tone={attempt.badge_granted ? 'success' : 'info'}
                  />
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {attempt.note || 'No note saved for this attempt.'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
