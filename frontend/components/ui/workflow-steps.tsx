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
    <div className="rounded-[28px] border border-[var(--line)] bg-[rgba(255,255,255,0.92)] p-5 shadow-[var(--shadow-soft)]">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--brand-primary)]">{eyebrow}</p>
      <h2 className="mt-3 font-display text-[1.75rem] leading-tight tracking-[-0.03em] text-[var(--text-primary)]">{title}</h2>

      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        {steps.map((step, index) => (
          <div key={`${step.title}-${index}`} className="rounded-[22px] border border-[var(--line)] bg-[rgba(248,250,252,0.96)] p-4 transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.07)]">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-[rgba(99,102,241,0.12)] text-sm font-semibold text-[var(--brand-primary)]">
                {index + 1}
              </span>
              <p className="font-medium leading-5 text-[var(--text-primary)]">{step.title}</p>
            </div>
            <p className="mt-3 text-sm leading-5 text-[var(--text-secondary)]">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
