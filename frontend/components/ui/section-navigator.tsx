import { Compass } from 'lucide-react';

import { cn } from '@/lib/utils';

interface SectionNavigatorItem {
  href: string;
  label: string;
  helper?: string;
}

interface SectionNavigatorProps {
  title: string;
  description: string;
  items: SectionNavigatorItem[];
  className?: string;
}

export function SectionNavigator({ title, description, items, className }: SectionNavigatorProps) {
  return (
    <div
      className={cn(
        'rounded-[26px] border border-[var(--line)] bg-[rgba(255,255,255,0.94)] p-5 shadow-[var(--shadow-soft)]',
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[rgba(238,242,255,0.94)] text-[var(--brand-primary)]">
          <Compass className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-primary)]">Section navigator</p>
          <h2 className="mt-2 font-display text-[1.75rem] leading-tight tracking-[-0.03em] text-[var(--text-primary)]">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-[22px] border border-[var(--line)] bg-[rgba(248,250,252,0.96)] px-4 py-4 transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[rgba(99,102,241,0.22)] hover:bg-[rgba(238,242,255,0.92)] hover:shadow-[0_16px_34px_rgba(15,23,42,0.07)] animate-fade-up-delayed"
            style={{ ['--stagger-delay' as string]: `${index * 45}ms` }}
          >
            <p className="font-display text-lg text-[var(--text-primary)]">{item.label}</p>
            {item.helper ? <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.helper}</p> : null}
          </a>
        ))}
      </div>
    </div>
  );
}
