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
    ? 'border-[rgba(56,189,248,0.2)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,249,255,0.96))] shadow-[0_14px_30px_rgba(15,23,42,0.05)]'
    : dirty
      ? 'border-[rgba(245,158,11,0.22)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.96))] shadow-[0_14px_30px_rgba(15,23,42,0.05)]'
      : 'border-[rgba(99,102,241,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,247,255,0.96))] shadow-[0_14px_30px_rgba(15,23,42,0.05)]';

  const eyebrow = isSaving ? 'Saving' : dirty ? 'Unsaved draft' : 'Saved state';
  const message = isSaving ? savingMessage : dirty ? dirtyMessage : pristineMessage;

  return (
    <div className={`rounded-[22px] border p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-primary)]">{eyebrow}</p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{message}</p>
    </div>
  );
}
