import { cn } from '../../lib/cn';

/**
 * Two-tone stat meter from the design system — sweetness, water content,
 * disease risk. The track sits a step above the card surface so it stays
 * legible on both white and tinted panels.
 */
export function Meter({
  value,
  tone = 'primary',
  className,
  label,
}: {
  /** 0–100. */
  value: number;
  tone?: 'primary' | 'secondary' | 'gradient';
  className?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const fill = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    gradient: 'bg-gradient-to-r from-secondary-fixed via-primary-fixed-dim to-primary',
  }[tone];

  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-high', className)}
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', fill)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
