import { AlertCircle } from 'lucide-react';

interface ActionContextNoteProps {
  text: string;
}

export function ActionContextNote({ text }: ActionContextNoteProps) {
  return (
    <div className="rounded-[18px] border border-[var(--line)] bg-[rgba(78,137,255,0.08)] px-4 py-3 text-sm text-[var(--text-secondary)]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-7 items-center justify-center rounded-full bg-[rgba(47,107,255,0.14)] text-[var(--brand-secondary)]">
          <AlertCircle className="size-4" />
        </div>
        <p className="leading-6">{text}</p>
      </div>
    </div>
  );
}
