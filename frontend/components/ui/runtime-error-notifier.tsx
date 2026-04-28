'use client';

import { useEffect, useRef } from 'react';

import { useToastStore } from '@/lib/ui/toast-store';

function toErrorMessage(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  return 'Unexpected client error';
}

export function RuntimeErrorNotifier() {
  const push = useToastStore((state) => state.push);
  const recentMessages = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const remember = (message: string) => {
      const now = Date.now();
      const lastSeenAt = recentMessages.current.get(message) ?? 0;

      if (now - lastSeenAt < 5000) {
        return false;
      }

      recentMessages.current.set(message, now);

      for (const [key, value] of recentMessages.current.entries()) {
        if (now - value > 30000) {
          recentMessages.current.delete(key);
        }
      }

      return true;
    };

    const handleWindowError = (event: ErrorEvent) => {
      const message = toErrorMessage(event.error ?? event.message);

      if (!remember(message)) {
        return;
      }

      push({
        title: 'Page error detected',
        message: 'A page error occurred. Refresh if the screen looks stuck.',
        tone: 'danger',
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = toErrorMessage(event.reason);

      if (!remember(message)) {
        return;
      }

      push({
        title: 'Background request failed',
        message: 'A request failed in the background. Retry the action if needed.',
        tone: 'warning',
      });
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [push]);

  return null;
}
