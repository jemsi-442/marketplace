'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export function RouteProgress() {
  const pathname = usePathname();
  const routeKey = pathname ?? '';
  const initialKey = useRef<string | null>(null);
  const timeouts = useRef<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    return () => {
      for (const timeout of timeouts.current) {
        window.clearTimeout(timeout);
      }
    };
  }, []);

  useEffect(() => {
    if (initialKey.current === null) {
      initialKey.current = routeKey;
      return;
    }

    for (const timeout of timeouts.current) {
      window.clearTimeout(timeout);
    }
    timeouts.current = [];

    timeouts.current.push(
      window.setTimeout(() => {
        setVisible(true);
        setProgress(18);
      }, 0),
      window.setTimeout(() => setProgress(52), 90),
      window.setTimeout(() => setProgress(76), 210),
      window.setTimeout(() => setProgress(100), 360),
      window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 620),
    );
  }, [routeKey]);

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[70] h-1.5 transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      aria-hidden="true"
    >
      <div
        className="absolute inset-y-0 left-0 rounded-r-full bg-[linear-gradient(90deg,#89b2ff_0%,#4e89ff_38%,#2f6bff_72%,#16359a_100%)] shadow-[0_0_24px_rgba(78,137,255,0.55)] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ width: `${progress}%` }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(184,208,255,0.46),transparent)]" />
    </div>
  );
}
