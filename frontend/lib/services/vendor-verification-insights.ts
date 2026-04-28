import type { AdminVendorVerificationRecord, VendorInterviewQuestion } from '@/lib/types';

type VendorInterviewAnswer = AdminVendorVerificationRecord['interview_answers'][number];

export interface VendorVerificationInsightSummary {
  answeredCount: number;
  averageScore: number;
  strongAnswerCount: number;
  weakAnswerCount: number;
  strongSignals: string[];
  missingSignals: string[];
  timelineStrengthCount: number;
  genericPressureCount: number;
  strongSummary: string;
  weakSummary: string;
}

function uniqueLimited(items: string[], limit = 6): string[] {
  return Array.from(new Set(items.filter((item) => item.trim() !== ''))).slice(0, limit);
}

function answerTextIncludes(answer: VendorInterviewAnswer | undefined, signal: string): boolean {
  if (!answer || !answer.answer) {
    return false;
  }

  return answer.answer.toLowerCase().includes(signal.toLowerCase());
}

function practicalSignalsForQuestion(question: VendorInterviewQuestion): string[] {
  return Array.isArray(question.practical_signals) ? question.practical_signals.filter((value) => typeof value === 'string' && value.trim() !== '') : [];
}

export function buildVendorVerificationInsightSummary(record: AdminVendorVerificationRecord): VendorVerificationInsightSummary {
  const answers = record.interview_answers ?? [];
  const questions = record.interview_questions ?? [];
  const answeredCount = answers.filter((entry) => (entry.answer ?? '').trim() !== '').length;
  const scores = answers.map((entry) => entry.score ?? 0);
  const averageScore = scores.length > 0 ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;
  const strongAnswerCount = answers.filter((entry) => (entry.score ?? 0) >= 70).length;
  const weakAnswerCount = answers.filter((entry) => (entry.score ?? 0) > 0 && (entry.score ?? 0) < 62).length;
  const timelineStrengthCount = answers.filter((entry) => ((entry.timeline_signal_hits ?? 0) + (entry.number_signals ?? 0)) > 0).length;
  const genericPressureCount = answers.filter((entry) => (entry.generic_phrase_hits ?? 0) > 0).length;

  const strongSignals: string[] = [];
  const missingSignals: string[] = [];

  for (const question of questions) {
    const answer = answers.find((entry) => entry.question_id === question.id);
    const signals = practicalSignalsForQuestion(question);

    for (const signal of signals) {
      if (answerTextIncludes(answer, signal)) {
        strongSignals.push(signal);
      } else {
        missingSignals.push(signal);
      }
    }
  }

  const topStrongSignals = uniqueLimited(strongSignals);
  const topMissingSignals = uniqueLimited(missingSignals.filter((signal) => !topStrongSignals.includes(signal)));

  const strongSummary =
    topStrongSignals.length > 0
      ? `Strong proof showed up in signals like ${topStrongSignals.join(', ')}.`
      : 'The answers do not yet show strong lane-specific proof.';

  const weakSummary =
    topMissingSignals.length > 0
      ? `Review the missing proof around ${topMissingSignals.join(', ')} before keeping the blue tick active.`
      : genericPressureCount > 0
        ? 'The main risk is generic wording rather than missing lane terminology.'
        : 'No major proof gap stands out from the submitted answers.';

  return {
    answeredCount,
    averageScore,
    strongAnswerCount,
    weakAnswerCount,
    strongSignals: topStrongSignals,
    missingSignals: topMissingSignals,
    timelineStrengthCount,
    genericPressureCount,
    strongSummary,
    weakSummary,
  };
}
