import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'tonal' | 'ghost' | 'quiet';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary shadow-cta hover:bg-primary-container',
  secondary: 'bg-secondary text-on-secondary shadow-sm hover:bg-tertiary-container',
  tonal:
    'bg-secondary-container text-on-secondary-fixed-variant shadow-sm hover:bg-secondary hover:text-on-secondary',
  ghost:
    'border border-primary/20 bg-surface-lowest/70 text-on-surface hover:border-primary/40 hover:bg-melon-tint',
  quiet: 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 gap-1.5 px-3 text-label-md',
  md: 'h-11 gap-2 px-5 text-label-lg',
  lg: 'h-14 gap-2 px-7 text-title-md',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-full font-semibold',
        'transition-all duration-150 ease-tactile active:scale-[0.96]',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
