import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'primary' | 'secondary' | 'tertiary' | 'neutral' | 'error' | 'solid' | 'outline';

const TONES: Record<Tone, string> = {
  primary: 'bg-primary-fixed text-on-primary-fixed-variant',
  secondary: 'bg-secondary-container text-on-secondary-fixed-variant',
  tertiary: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  neutral: 'bg-surface-high text-on-surface-variant',
  error: 'bg-error-container text-on-error-container',
  solid: 'bg-secondary text-on-secondary',
  outline: 'border border-outline-variant text-on-surface-variant',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-semibold whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Badge with a pulsing dot, for live and online states. */
export function LiveBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Badge tone="secondary" className={className}>
      <span className="size-1.5 animate-pulse rounded-full bg-secondary" />
      {children}
    </Badge>
  );
}
