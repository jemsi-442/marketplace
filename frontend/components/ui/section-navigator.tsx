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
        'rounded-[26px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(14,30,74,0.86),rgba(12,26,58,0.72))] p-5 shadow-[var(--shadow-soft)] backdrop-blur-xl',
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[rgba(78,137,255,0.12)] text-[var(--brand-secondary)]">
          <Compass className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-secondary)]">Section navigator</p>
          <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-[22px] border border-[rgba(184,208,255,0.16)] bg-[rgba(255,255,255,0.04)] px-4 py-4 transition duration-300 hover:-translate-y-1 hover:border-[rgba(184,208,255,0.28)] hover:bg-[rgba(78,137,255,0.08)] animate-fade-up-delayed"
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
