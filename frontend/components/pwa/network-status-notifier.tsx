'use client';

import { useEffect, useRef } from 'react';

import { useToastStore } from '@/lib/ui/toast-store';

function getOnlineStatus() {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

export function NetworkStatusNotifier() {
  const push = useToastStore((state) => state.push);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      if (!hasMountedRef.current) {
        return;
      }

      push({
        title: 'Connection restored',
        message: 'WOLFIX is back online. You can continue syncing live workspace activity.',
        tone: 'success',
      });
    };

    const handleOffline = () => {
      if (!hasMountedRef.current) {
        return;
      }

      push({
        title: 'You are offline',
        message: 'Saved screens remain available, but new live data may pause until the network returns.',
        tone: 'warning',
      });
    };

    hasMountedRef.current = true;

    if (!getOnlineStatus()) {
      push({
        title: 'Offline mode detected',
        message: 'This device is already offline. WOLFIX will use cached screens where possible.',
        tone: 'warning',
      });
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [push]);

  return null;
}
