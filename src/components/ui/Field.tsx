import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';

export const INPUT_CLASS =
  'w-full rounded-full bg-surface-low px-5 py-3 text-body-lg text-on-surface outline-none transition-all placeholder:text-on-surface-variant/50 focus:bg-surface-lowest focus:ring-2 focus:ring-primary';

export function Field({
  label,
  children,
  hint,
  error,
  required,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-label-lg font-medium text-on-surface">
        {label}
        {required ? <span className="ml-0.5 text-primary">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="flex items-center gap-1 text-caption text-error">
          <Icon name="error" size={13} />
          {error}
        </span>
      ) : hint ? (
        <span className="flex items-center gap-1 text-caption text-on-surface-variant">{hint}</span>
      ) : null}
    </label>
  );
}

/** Text input wired to the shared pill shape. */
export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(INPUT_CLASS, className)} {...rest} />;
}
