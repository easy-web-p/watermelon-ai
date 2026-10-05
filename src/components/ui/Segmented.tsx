import { cn } from '../../lib/cn';

export type SegmentOption<T extends string> = { value: T; label: string };

/** Pill track with a sliding white thumb — e.g. Grower vs Consumer mode. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
  label,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
  size?: 'sm' | 'md';
  label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('inline-flex rounded-full bg-surface-container p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'cursor-pointer rounded-full font-semibold whitespace-nowrap transition-all duration-150 ease-tactile',
              size === 'sm' ? 'px-3 py-1 text-caption' : 'px-4 py-1.5 text-label-md',
              active ? 'bg-surface-lowest text-primary shadow-sm' : 'text-outline hover:text-on-surface',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
