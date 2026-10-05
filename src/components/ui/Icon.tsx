import { cn } from '../../lib/cn';

type IconProps = {
  /** A Material Symbols Outlined ligature name, e.g. `forum`, `potted_plant`. */
  name: string;
  className?: string;
  filled?: boolean;
  /** Font size in px — Material Symbols are sized by font-size, not width. */
  size?: number;
};

export function Icon({ name, className, filled, size = 20 }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('material-symbols-outlined shrink-0', filled && 'is-filled', className)}
      style={{ fontSize: `${size}px` }}
    >
      {name}
    </span>
  );
}
