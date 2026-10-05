import { cn } from '../../lib/cn';

/**
 * Watermelon wedge with circuit traces growing out of the rind — the mark from
 * the Stitch brand sheet, redrawn as inline SVG so it ships with the bundle and
 * tints cleanly at any size.
 */
export function LogoMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      role="img"
      aria-label="Watermelon AI"
    >
      <path d="M5 17.5h38C43 33 32.5 42 24 42S5 33 5 17.5Z" fill="#1b6b44" />
      <path d="M8.5 17.5h31C39.5 30.5 31 38.5 24 38.5S8.5 30.5 8.5 17.5Z" fill="#ffffff" />
      <path d="M11 17.5h26C37 28.5 30 35.5 24 35.5S11 28.5 11 17.5Z" fill="#e12149" />
      <g fill="#111c2d">
        <ellipse cx="17" cy="23" rx="1.5" ry="2" />
        <ellipse cx="31" cy="23" rx="1.5" ry="2" />
        <ellipse cx="24" cy="29" rx="1.5" ry="2" />
      </g>
      <g stroke="#1b6b44" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M33 20.5 38.5 15" />
        <path d="M24 32.5v5" />
      </g>
      <circle cx="39.5" cy="13.8" r="1.8" fill="#ffffff" stroke="#1b6b44" strokeWidth="1.4" />
      <circle cx="24" cy="38.6" r="1.8" fill="#ffffff" stroke="#1b6b44" strokeWidth="1.4" />
      <path d="M15 21.5 10.5 17" stroke="#ba0035" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Full lockup: mark, wordmark, Thai sub-label. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={compact ? 30 : 36} />
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="text-title-md leading-tight font-bold text-primary">Watermelon AI</span>
          <span className="rounded-full bg-secondary-container px-1.5 py-0.5 text-caption font-semibold text-on-secondary-fixed-variant">
            แตงโม AI
          </span>
        </span>
        {compact ? null : (
          <span className="hidden text-caption text-on-surface-variant xl:inline">ผู้ช่วยอัจฉริยะเรื่องแตงโม</span>
        )}
      </span>
    </span>
  );
}

/** The chat avatar — a filled wedge that reads at 28–44px. */
export function MelonAvatar({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={cn('shrink-0', className)} aria-hidden="true">
      <path d="M6 18C6 38.99 23.01 42 24 42S42 38.99 42 18H6Z" fill="#e12149" />
      <path
        d="M6 18C6 38.99 23.01 42 24 42S42 38.99 42 18"
        stroke="#1b6b44"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M9 20c1.5 15 13 18 15 18s13.5-3 15-18"
        stroke="#a5f3c2"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <g fill="#111c2d">
        <circle cx="16" cy="27" r="1.5" />
        <circle cx="24" cy="30" r="1.5" />
        <circle cx="32" cy="27" r="1.5" />
        <circle cx="20" cy="23" r="1.5" />
        <circle cx="28" cy="23" r="1.5" />
      </g>
    </svg>
  );
}
