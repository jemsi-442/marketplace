interface FormValidationSummaryProps {
  title?: string;
  errors: string[];
}

export function FormValidationSummary({
  title = 'Please fix these items before continuing',
  errors,
}: FormValidationSummaryProps) {
  if (!errors.length) {
    return null;
  }

  return (
    <div className="rounded-[22px] border border-[rgba(251,113,133,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.96))] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
      <p className="text-xs uppercase tracking-[0.18em] text-rose-600">Validation summary</p>
      <p className="mt-2 text-sm text-[var(--text-primary)]">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
        {errors.map((error) => (
          <li key={error} className="flex gap-2">
            <span className="mt-[2px] text-rose-500">•</span>
            <span>{error}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
