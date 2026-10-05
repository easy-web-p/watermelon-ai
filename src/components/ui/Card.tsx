import type { ReactNode, Ref } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';

export function Card({
  children,
  className,
  as: Tag = 'section',
  ref,
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
  /** Forwarded so callers can print or scroll to the card (React 19 ref-as-prop). */
  ref?: Ref<HTMLElement>;
}) {
  // `Tag` is a union of intrinsic elements, so TS cannot unify their ref types;
  // all three are HTMLElement at runtime.
  const forwarded = ref as Ref<HTMLDivElement>;

  return (
    <Tag ref={forwarded} className={cn('rounded-xl bg-surface-lowest p-6 shadow-card', className)}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  icon,
  title,
  subtitle,
  action,
  iconTone = 'primary',
  className,
}: {
  icon?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  iconTone?: 'primary' | 'secondary' | 'tertiary';
  className?: string;
}) {
  const tone = {
    primary: 'bg-primary-fixed text-primary',
    secondary: 'bg-secondary-container text-on-secondary-fixed-variant',
    tertiary: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  }[iconTone];

  return (
    <header className={cn('mb-5 flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', tone)}>
            <Icon name={icon} size={22} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-headline-sm font-bold text-on-surface">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-body-md text-on-surface-variant">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </header>
  );
}
