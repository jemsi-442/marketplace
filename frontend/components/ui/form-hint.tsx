interface FormHintProps {
  text: string;
}

export function FormHint({ text }: FormHintProps) {
  return <p className="text-xs leading-6 text-[var(--text-tertiary)]">{text}</p>;
}
