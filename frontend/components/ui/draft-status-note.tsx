interface DraftStatusNoteProps {
  dirty: boolean;
  isSaving?: boolean;
  pristineMessage: string;
  dirtyMessage: string;
  savingMessage?: string;
}

export function DraftStatusNote({
  dirty,
  isSaving = false,
  pristineMessage,
  dirtyMessage,
  savingMessage = 'Saving your latest changes...',
}: DraftStatusNoteProps) {
  const toneClass = isSaving
    ? 'border-[rgba(124,194,255,0.22)] bg-[linear-gradient(180deg,rgba(8,42,86,0.68),rgba(15,63,120,0.42))]'
    : dirty
      ? 'border-[rgba(170,180,255,0.22)] bg-[linear-gradient(180deg,rgba(20,26,84,0.68),rgba(32,47,132,0.42))]'
      : 'border-[rgba(184,208,255,0.16)] bg-[rgba(255,255,255,0.04)]';

  const eyebrow = isSaving ? 'Saving' : dirty ? 'Unsaved draft' : 'Saved state';
  const message = isSaving ? savingMessage : dirty ? dirtyMessage : pristineMessage;

  return (
    <div className={`rounded-[22px] border p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-secondary)]">{eyebrow}</p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{message}</p>
    </div>
  );
}
