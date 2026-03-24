interface WorkflowStep {
  title: string;
  description: string;
}

interface WorkflowStepsProps {
  eyebrow: string;
  title: string;
  steps: WorkflowStep[];
}

export function WorkflowSteps({ eyebrow, title, steps }: WorkflowStepsProps) {
  return (
    <div className="rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(18,40,92,0.72),rgba(14,31,74,0.56))] p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-secondary)]">{eyebrow}</p>
      <h2 className="mt-3 font-display text-2xl text-[var(--text-primary)]">{title}</h2>

      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        {steps.map((step, index) => (
          <div key={`${step.title}-${index}`} className="rounded-[22px] border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-[rgba(47,107,255,0.16)] text-sm font-semibold text-[var(--brand-secondary)]">
                {index + 1}
              </span>
              <p className="font-medium text-[var(--text-primary)]">{step.title}</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
