import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';

/**
 * Headline metric tile used across the market, scanner and billing screens.
 * The value carries the weight; everything else stays quiet around it.
 */
export function StatTile({
  label,
  value,
  unit,
  icon,
  tone = 'primary',
  delta,
  footnote,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: string;
  tone?: 'primary' | 'secondary' | 'neutral';
  delta?: { value: string; direction: 'up' | 'down' | 'flat'; note?: string };
  footnote?: ReactNode;
  className?: string;
}) {
  const valueTone = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    neutral: 'text-on-surface',
  }[tone];

  const iconTone = {
    primary: 'bg-primary-fixed text-primary',
    secondary: 'bg-secondary-container text-on-secondary-fixed-variant',
    neutral: 'bg-surface-container text-on-surface-variant',
  }[tone];

  const deltaTone =
    delta?.direction === 'up'
      ? 'bg-secondary-container text-on-secondary-fixed-variant'
      : delta?.direction === 'down'
        ? 'bg-error-container text-on-error-container'
        : 'bg-surface-container text-on-surface-variant';

  return (
    <article className={cn('flex flex-col gap-3 rounded-lg bg-surface-lowest p-5 shadow-card', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-label-md text-on-surface-variant">{label}</p>
        {icon ? (
          <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', iconTone)}>
            <Icon name={icon} size={20} />
          </span>
        ) : null}
      </div>

      <p className={cn('flex items-baseline gap-1.5 text-display-sm leading-none font-bold', valueTone)}>
        {value}
        {unit ? <span className="text-label-lg font-semibold text-on-surface-variant">{unit}</span> : null}
      </p>

      {delta ? (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label-md font-semibold',
              deltaTone,
            )}
          >
            <Icon
              name={
                delta.direction === 'up'
                  ? 'trending_up'
                  : delta.direction === 'down'
                    ? 'trending_down'
                    : 'trending_flat'
              }
              size={16}
            />
            {delta.value}
          </span>
          {delta.note ? <span className="text-caption text-on-surface-variant">{delta.note}</span> : null}
        </div>
      ) : null}

      {footnote ? <div className="text-caption text-on-surface-variant">{footnote}</div> : null}
    </article>
  );
}
