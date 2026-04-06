'use client';

import { Signal, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

function getOnlineStatus() {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

export function NetworkStatusChip() {
  const [isOnline, setIsOnline] = useState(getOnlineStatus);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(() => (getOnlineStatus() ? new Date() : null));

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(new Date());
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncLabel = lastOnlineAt
    ? lastOnlineAt.toLocaleTimeString('en', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  if (isOnline) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(13,148,136,0.16)] bg-[rgba(13,148,136,0.08)] px-3 py-2 text-[11px] font-medium text-[var(--accent-teal)]">
        <Signal className="size-3.5" />
        <span className="uppercase tracking-[0.14em]">Online</span>
        {syncLabel ? <span className="text-[10px] text-[var(--text-secondary)]">Synced {syncLabel}</span> : null}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.1)] px-3 py-2 text-[11px] font-medium text-[var(--accent-amber)]">
      <WifiOff className="size-3.5" />
      <span className="uppercase tracking-[0.14em]">Offline</span>
      {syncLabel ? <span className="text-[10px] text-[var(--text-secondary)]">Last sync {syncLabel}</span> : null}
    </div>
  );
}
