import { cn } from '@/lib/utils';

export type DigestFrequency = 'daily' | 'weekly' | 'off';

const OPTIONS: { value: DigestFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'off', label: 'Off' },
];

interface Props {
  value: DigestFrequency;
  onChange: (value: DigestFrequency) => void;
  disabled?: boolean;
  className?: string;
}

/** Mutually-exclusive frequency selector for the "New Launches" digest. */
export function DigestFrequencySelect({ value, onChange, disabled, className }: Props) {
  return (
    <div className={cn('inline-flex rounded-md border border-border bg-background p-0.5', className)} role="radiogroup" aria-label="New Launches email frequency">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 text-sm rounded-[4px] transition-colors disabled:opacity-50',
            value === opt.value
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
