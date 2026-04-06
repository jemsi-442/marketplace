export type FeedbackTone = 'success' | 'info' | 'warning' | 'danger';

const dangerSignals = ['unable', 'failed', 'error', 'invalid', 'missing', 'denied', 'blocked', 'could not', "can't", 'cannot', 'not found'];
const successSignals = [
  'created',
  'saved',
  'submitted',
  'sent',
  'updated',
  'released',
  'returned',
  'locked',
  'unlocked',
  'marked',
  'published',
  'requested',
  'disabled',
  'enabled',
  'cleared',
  'resolved',
];
const warningSignals = ['warning', 'pending', 'review', 'follow-up', 'attention', 'waiting', 'dispute', 'disputed', 'hold'];

function includesSignal(message: string, signals: string[]): boolean {
  return signals.some((signal) => message.includes(signal));
}

export function inferFeedbackTone(message: string): FeedbackTone {
  const normalized = message.trim().toLowerCase();

  if (!normalized) {
    return 'info';
  }

  if (includesSignal(normalized, dangerSignals)) {
    return 'danger';
  }

  if (includesSignal(normalized, successSignals)) {
    return 'success';
  }

  if (includesSignal(normalized, warningSignals)) {
    return 'warning';
  }

  return 'info';
}
