import { Info } from 'lucide-react';

interface FormHintProps {
  text: string;
}

export function FormHint({ text }: FormHintProps) {
  return (
    <div className="flex items-start gap-2 rounded-[16px] border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2 text-xs leading-5 text-[var(--text-tertiary)]">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[rgba(79,70,229,0.08)] text-[var(--brand-primary)]">
        <Info className="size-3" />
      </span>
      <p>{text}</p>
    </div>
  );
}
