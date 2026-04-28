'use client';

import { BadgeCheck } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import type { AdminVendorVerificationRecord } from '@/lib/types';
import { buildVendorVerificationInsightSummary } from '@/lib/services/vendor-verification-insights';

import { AdminVerificationAttemptTrendChart } from './admin-verification-attempt-trend-chart';
import type { AttemptTrendPoint } from '../admin-verification-detail.utils';

interface AdminVerificationInterviewReviewProps {
  attemptDelta: number | null;
  attemptTrendPoints: AttemptTrendPoint[];
  data: AdminVendorVerificationRecord;
  interviewInsights: ReturnType<typeof buildVendorVerificationInsightSummary> | null;
}

export function AdminVerificationInterviewReview({
  attemptDelta,
  attemptTrendPoints,
  data,
  interviewInsights,
}: AdminVerificationInterviewReviewProps) {
  const latestAttempt = data.interview_attempt_history?.[0] ?? null;

  return (
    <Card className="rounded-[30px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
            Interview answers
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            Read the vendor answers
          </h3>
        </div>

        {interviewInsights ? (
          <div className="grid gap-3 lg:grid-cols-4">
            <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Score posture
              </p>
              <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                {interviewInsights.averageScore}% average across{' '}
                {interviewInsights.answeredCount} answers
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {interviewInsights.strongAnswerCount} strong,{' '}
                {interviewInsights.weakAnswerCount} weak.
              </p>
            </div>
            <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Strong proof
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                {interviewInsights.strongSummary}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {interviewInsights.strongSignals.length ? (
                  interviewInsights.strongSignals.map((signal) => (
                    <StatusBadge key={signal} label={signal} tone="success" />
                  ))
                ) : (
                  <StatusBadge label="No lane proof yet" tone="warning" />
                )}
              </div>
            </div>
            <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Review risk
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                {interviewInsights.weakSummary}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {interviewInsights.missingSignals.length ? (
                  interviewInsights.missingSignals.map((signal) => (
                    <StatusBadge key={signal} label={signal} tone="warning" />
                  ))
                ) : (
                  <StatusBadge label="No major proof gap" tone="success" />
                )}
                {interviewInsights.genericPressureCount > 0 ? (
                  <StatusBadge
                    label={`${interviewInsights.genericPressureCount} generic-answer flags`}
                    tone="warning"
                  />
                ) : null}
              </div>
            </div>
            <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Attempt trend
              </p>
              <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                {latestAttempt ? `Latest ${latestAttempt.score}%` : 'No attempts yet'}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {attemptDelta !== null
                  ? attemptDelta >= 0
                    ? `Up ${attemptDelta} points from the previous attempt.`
                    : `Down ${Math.abs(attemptDelta)} points from the previous attempt.`
                  : 'No earlier attempt to compare yet.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {latestAttempt ? (
                  <StatusBadge
                    label={
                      latestAttempt.passed
                        ? 'Latest pass'
                        : 'Latest needs revision'
                    }
                    tone={latestAttempt.passed ? 'success' : 'warning'}
                  />
                ) : null}
                {typeof attemptDelta === 'number' ? (
                  <StatusBadge
                    label={
                      attemptDelta >= 0
                        ? `+${attemptDelta} trend`
                        : `${attemptDelta} trend`
                    }
                    tone={attemptDelta >= 0 ? 'success' : 'warning'}
                  />
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {data.interview_attempt_history?.length ? (
          <div className="rounded-[24px] border border-[var(--line)] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  Recent attempts
                </p>
                <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                  Review how this vendor is trending over time
                </p>
              </div>
              <StatusBadge
                label={`${data.interview_attempt_history.length} saved attempt${data.interview_attempt_history.length === 1 ? '' : 's'}`}
                tone="info"
              />
            </div>
            <div className="mt-5 rounded-[20px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Attempt score curve
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Read the score movement before deciding whether this vendor is
                truly improving.
              </p>
              <div className="mt-4">
                <AdminVerificationAttemptTrendChart points={attemptTrendPoints} />
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {data.interview_attempt_history.slice(0, 4).map((attempt, index) => {
                const previous = data.interview_attempt_history?.[index + 1] ?? null;
                const delta = previous ? attempt.score - previous.score : null;

                return (
                  <div
                    key={`${attempt.submitted_at}-${index}`}
                    className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-muted)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                          {index === 0 ? 'Latest attempt' : `Attempt ${index + 1}`}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
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
                              : 'Needs revision'
                          }
                          tone={attempt.badge_granted ? 'success' : 'info'}
                        />
                        {typeof delta === 'number' ? (
                          <StatusBadge
                            label={
                              delta >= 0
                                ? `+${delta} vs next older`
                                : `${delta} vs next older`
                            }
                            tone={delta >= 0 ? 'success' : 'warning'}
                          />
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                      {attempt.note || 'No note saved for this attempt.'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {data.interview_questions.length ? (
          <div className="space-y-4">
            {data.interview_questions.map((question) => {
              const answer = data.interview_answers.find(
                (entry) => entry.question_id === question.id,
              );

              return (
                <div
                  key={question.id}
                  className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
                    {question.title}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {question.prompt}
                  </p>
                  <div className="mt-4 rounded-[18px] border border-[var(--line)] bg-white p-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Submitted answer
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-primary)]">
                      {answer?.answer ||
                        'No answer submitted for this question.'}
                    </p>
                    {typeof answer?.score === 'number' ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusBadge
                          label={`Score ${answer.score}%`}
                          tone={answer.score >= 62 ? 'success' : 'warning'}
                        />
                        {typeof answer.word_count === 'number' ? (
                          <StatusBadge
                            label={`${answer.word_count} words`}
                            tone="info"
                          />
                        ) : null}
                        {typeof answer.keyword_hits === 'number' ? (
                          <StatusBadge
                            label={`${answer.keyword_hits} key hits`}
                            tone="info"
                          />
                        ) : null}
                        {typeof answer.lane_practical_signal_hits === 'number' ? (
                          <StatusBadge
                            label={`${answer.lane_practical_signal_hits} lane proof hits`}
                            tone={
                              answer.lane_practical_signal_hits > 0
                                ? 'success'
                                : 'warning'
                            }
                          />
                        ) : null}
                        {typeof answer.timeline_signal_hits === 'number' &&
                        answer.timeline_signal_hits > 0 ? (
                          <StatusBadge
                            label={`${answer.timeline_signal_hits} timeline hits`}
                            tone="info"
                          />
                        ) : null}
                        {typeof answer.generic_phrase_hits === 'number' &&
                        answer.generic_phrase_hits > 0 ? (
                          <StatusBadge
                            label={`${answer.generic_phrase_hits} generic-answer flags`}
                            tone="warning"
                          />
                        ) : null}
                      </div>
                    ) : null}
                    {Array.isArray(question.practical_signals) &&
                    question.practical_signals.length ? (
                      <div className="mt-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                          Expected proof signals
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {question.practical_signals.slice(0, 8).map((signal) => {
                            const matched = (answer?.answer ?? '')
                              .toLowerCase()
                              .includes(signal.toLowerCase());

                            return (
                              <StatusBadge
                                key={signal}
                                label={signal}
                                tone={matched ? 'success' : 'warning'}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<BadgeCheck className="size-5" />}
            title="No interview answers yet"
            description="This vendor has not submitted interview answers yet."
          />
        )}
      </div>
    </Card>
  );
}
