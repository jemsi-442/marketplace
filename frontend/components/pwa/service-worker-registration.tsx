'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !window.isSecureContext) {
      return;
    }

    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignore registration errors in browsers or environments that do not support this flow cleanly.
    });
  }, []);

  return null;
}
