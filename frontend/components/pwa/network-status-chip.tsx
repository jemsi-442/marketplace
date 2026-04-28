'use client';

import { Signal, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

function getOnlineStatus() {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

interface NetworkStatusChipProps {
  variant?: 'light' | 'dark';
}

export function NetworkStatusChip({ variant = 'light' }: NetworkStatusChipProps) {
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
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-medium',
          variant === 'dark'
            ? 'border border-[rgba(191,219,254,0.18)] bg-[rgba(255,255,255,0.1)] text-white'
            : 'border border-[rgba(13,148,136,0.16)] bg-[rgba(13,148,136,0.08)] text-[var(--accent-teal)]',
        )}
      >
        <Signal className="size-3.5" />
        <span className="uppercase tracking-[0.14em]">Online</span>
        {syncLabel ? (
          <span className={cn('text-[10px]', variant === 'dark' ? 'text-[rgba(226,232,240,0.82)]' : 'text-[var(--text-secondary)]')}>
            Synced {syncLabel}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-medium',
        variant === 'dark'
          ? 'border border-[rgba(191,219,254,0.18)] bg-[rgba(255,255,255,0.1)] text-white'
          : 'border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.1)] text-[var(--accent-amber)]',
      )}
    >
      <WifiOff className="size-3.5" />
      <span className="uppercase tracking-[0.14em]">Offline</span>
      {syncLabel ? (
        <span className={cn('text-[10px]', variant === 'dark' ? 'text-[rgba(226,232,240,0.82)]' : 'text-[var(--text-secondary)]')}>
          Last sync {syncLabel}
        </span>
      ) : null}
    </div>
  );
}
