'use client';

import { BadgeCheck, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import type { VendorInterviewQuestion } from '@/lib/types';

interface VendorVerificationInterviewCardProps {
  answers: Record<string, string>;
  badgeGranted?: boolean;
  commonInterviewSignals: string[];
  interviewHintSummary: string;
  interviewQuestions: VendorInterviewQuestion[];
  isGeneratingInterview: boolean;
  isSubmittingInterview: boolean;
  onAnswerChange: (questionId: string, value: string) => void;
  onGenerateInterview: () => void;
  onSubmitInterview: () => void;
}

export function VendorVerificationInterviewCard({
  answers,
  badgeGranted,
  commonInterviewSignals,
  interviewHintSummary,
  interviewQuestions,
  isGeneratingInterview,
  isSubmittingInterview,
  onAnswerChange,
  onGenerateInterview,
  onSubmitInterview,
}: VendorVerificationInterviewCardProps) {
  return (
    <Card className="rounded-[30px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
              Practical interview
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Answer light technical questions from your lanes
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              These questions focus on how you actually scope, deliver, and
              communicate work.
            </p>
          </div>

          <Button
            onClick={onGenerateInterview}
            disabled={isGeneratingInterview}
            variant="ghost"
            className="border border-[var(--line)]"
          >
            <Sparkles className="mr-2 size-4" />
            {isGeneratingInterview ? 'Generating...' : 'Generate interview'}
          </Button>
        </div>

        {interviewQuestions.length ? (
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  What helps most
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                  {interviewHintSummary}
                </p>
              </div>
              <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  Best answer posture
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                  Write what you actually do: checks, steps, timing, and
                  handoff.
                </p>
              </div>
              <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-muted)] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  What to avoid
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                  Avoid filler like “best practices” if you do not explain the
                  real work behind it.
                </p>
              </div>
            </div>

            {commonInterviewSignals.length ? (
              <div className="rounded-[22px] border border-[var(--line)] bg-white p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  Proof areas your questions may look for
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {commonInterviewSignals.map((signal) => (
                    <StatusBadge key={signal} label={signal} tone="info" />
                  ))}
                </div>
              </div>
            ) : null}

            {interviewQuestions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-muted)] p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
                  Question {index + 1}
                </p>
                <h4 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                  {question.title}
                </h4>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  {question.prompt}
                </p>
                {Array.isArray(question.practical_signals) &&
                question.practical_signals.length ? (
                  <div className="mt-4 rounded-[18px] border border-[var(--line)] bg-white p-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Helpful proof areas
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {question.practical_signals.slice(0, 6).map((signal) => (
                        <StatusBadge key={signal} label={signal} tone="info" />
                      ))}
                    </div>
                  </div>
                ) : null}
                <textarea
                  value={answers[question.id] ?? ''}
                  onChange={(event) =>
                    onAnswerChange(question.id, event.target.value)
                  }
                  rows={5}
                  placeholder="Write how you would handle the work: steps, checks, timing, and client updates."
                  className="mt-4 w-full rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                />
              </div>
            ))}

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={onSubmitInterview}
                disabled={isSubmittingInterview}
              >
                {isSubmittingInterview
                  ? 'Checking answers...'
                  : 'Submit interview'}
              </Button>
              {badgeGranted ? (
                <StatusBadge label="Blue tick active" tone="success" />
              ) : null}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<BadgeCheck className="size-5" />}
            title="Interview not generated yet"
            description="Save your summary, upload the resume, then generate the interview."
          />
        )}
      </div>
    </Card>
  );
}
