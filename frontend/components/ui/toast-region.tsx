'use client';

import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToastStore, type ToastTone } from '@/lib/ui/toast-store';
import { cn } from '@/lib/utils';

const toneStyles: Record<ToastTone, { shell: string; icon: string; Icon: typeof CheckCircle2 }> = {
  success: {
    shell: 'border-[rgba(83,214,146,0.22)] bg-[rgba(83,214,146,0.08)]',
    icon: 'text-[#8ef0b7]',
    Icon: CheckCircle2,
  },
  info: {
    shell: 'border-[rgba(78,137,255,0.22)] bg-[rgba(47,107,255,0.08)]',
    icon: 'text-[var(--brand-secondary)]',
    Icon: Info,
  },
  warning: {
    shell: 'border-[rgba(255,196,82,0.22)] bg-[rgba(255,196,82,0.08)]',
    icon: 'text-[#ffd47b]',
    Icon: AlertTriangle,
  },
  danger: {
    shell: 'border-[rgba(255,110,110,0.22)] bg-[rgba(255,110,110,0.08)]',
    icon: 'text-[#ffb3b3]',
    Icon: XCircle,
  },
};

function ToastCard({ id, title, message, tone }: { id: string; title: string; message?: string; tone: ToastTone }) {
  const remove = useToastStore((state) => state.remove);
  const { shell, icon, Icon } = toneStyles[tone];

  useEffect(() => {
    const timeout = window.setTimeout(() => remove(id), 4200);
    return () => window.clearTimeout(timeout);
  }, [id, remove]);

  return (
    <div className={cn('pointer-events-auto rounded-[22px] border px-4 py-4 shadow-[var(--shadow-soft)] backdrop-blur-xl', shell)}>
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5', icon)}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
          {message ? <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{message}</p> : null}
        </div>
        <Button variant="quiet" size="sm" onClick={() => remove(id)} aria-label="Dismiss toast">
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function ToastRegion() {
  const items = useToastStore((state) => state.items);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[120] mx-auto flex w-full max-w-3xl flex-col gap-3 px-4">
      {items.map((item) => (
        <ToastCard key={item.id} id={item.id} title={item.title} message={item.message} tone={item.tone} />
      ))}
    </div>
  );
}
