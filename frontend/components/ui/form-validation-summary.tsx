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
    <div className="rounded-[22px] border border-[rgba(255,151,182,0.28)] bg-[linear-gradient(180deg,rgba(58,18,48,0.7),rgba(108,36,74,0.44))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-xs uppercase tracking-[0.18em] text-rose-200">Validation summary</p>
      <p className="mt-2 text-sm text-[var(--text-primary)]">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-rose-100">
        {errors.map((error) => (
          <li key={error} className="flex gap-2">
            <span className="mt-[2px] text-rose-200">•</span>
            <span>{error}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
