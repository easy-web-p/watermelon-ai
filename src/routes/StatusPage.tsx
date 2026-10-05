import { MarketingShell } from '../components/layout/MarketingShell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { MelonAvatar } from '../components/brand/Logo';
import { Link } from '../lib/router';
import { cn } from '../lib/cn';
import { STATUS_CODES, STATUS_PAGES, type StatusTone } from '../data/status';

const TONE: Record<
  StatusTone,
  { wash: string; icon: string; accent: string; badge: 'secondary' | 'primary' | 'error' | 'neutral' }
> = {
  success: {
    wash: 'from-mint-mist to-surface-lowest',
    icon: 'bg-secondary-container text-secondary',
    accent: 'text-secondary',
    badge: 'secondary',
  },
  info: {
    wash: 'from-surface-low to-surface-lowest',
    icon: 'bg-surface-container text-on-surface-variant',
    accent: 'text-on-surface',
    badge: 'neutral',
  },
  warning: {
    wash: 'from-melon-tint to-surface-lowest',
    icon: 'bg-primary-fixed text-primary',
    accent: 'text-primary',
    badge: 'primary',
  },
  error: {
    wash: 'from-error-container/50 to-surface-lowest',
    icon: 'bg-error-container text-error',
    accent: 'text-error',
    badge: 'error',
  },
};

export function StatusPage({ code }: { code: string }) {
  const data = STATUS_PAGES[code] ?? STATUS_PAGES['404'];
  const tone = TONE[data.tone];

  return (
    <MarketingShell>
      <div className="mx-auto flex max-w-4xl flex-col px-4 py-14 sm:px-6">
        <Card className={cn('flex flex-col items-center gap-5 bg-gradient-to-b py-12 text-center', tone.wash)}>
          <span className={cn('flex size-20 items-center justify-center rounded-full', tone.icon)}>
            <Icon name={data.icon} size={42} />
          </span>

          <div>
            <Badge tone={tone.badge} className="mx-auto mb-3">
              <span className="font-mono">{data.code}</span>
              <span className="opacity-70">·</span>
              {data.label}
            </Badge>
            <h1 className="text-headline-lg font-bold text-on-surface">{data.title}</h1>
            <p className="mx-auto mt-3 max-w-xl text-body-lg text-on-surface-variant">{data.body}</p>
          </div>

          <ul className="mx-auto flex w-full max-w-xl flex-col gap-2 rounded-lg bg-surface-lowest/80 p-5 text-left backdrop-blur-sm">
            {data.hints.map((hint) => (
              <li key={hint} className="flex items-start gap-2 text-body-md text-on-surface-variant">
                <Icon name="check_circle" size={16} className={cn('mt-1 shrink-0', tone.accent)} />
                {hint}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to={data.primary.to}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-label-lg font-semibold text-on-primary shadow-cta transition-transform duration-150 ease-tactile active:scale-[0.96]"
            >
              <Icon name={data.primary.icon} size={18} />
              {data.primary.label}
            </Link>
            {data.secondary ? (
              <Link
                to={data.secondary.to}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-primary/25 px-6 text-label-lg font-semibold text-on-surface transition-all duration-150 ease-tactile hover:bg-surface-container active:scale-[0.96]"
              >
                <Icon name={data.secondary.icon} size={18} />
                {data.secondary.label}
              </Link>
            ) : null}
          </div>
        </Card>

        {data.showSupport ? (
          <Card className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <MelonAvatar size={44} />
              <div>
                <p className="text-title-md font-bold text-on-surface">ยังแก้ไม่ได้? ติดต่อทีมดูแลเกษตรกร</p>
                <p className="mt-0.5 text-body-md text-on-surface-variant">ให้บริการทุกวัน 08:00 – 20:00 น.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-label-lg font-semibold">
              <span className="inline-flex items-center gap-1.5 text-secondary">
                <Icon name="chat" size={18} />
                LINE: @WatermelonAI
              </span>
              <span className="inline-flex items-center gap-1.5 text-primary">
                <Icon name="call" size={18} />
                02-123-4567
              </span>
            </div>
          </Card>
        ) : null}

        {/* Quick index so QA and support can jump between every state. */}
        <details className="mt-5 rounded-lg bg-surface-lowest p-5 shadow-sm">
          <summary className="cursor-pointer text-label-lg font-semibold text-on-surface-variant">
            ดูหน้าสถานะระบบทั้งหมด ({STATUS_CODES.length} สถานะ)
          </summary>
          <div className="mt-4 flex flex-wrap gap-2">
            {STATUS_CODES.map((item) => (
              <Link
                key={item}
                to={`/status/${item}`}
                className={cn(
                  'rounded-full px-3 py-1.5 font-mono text-label-md font-semibold transition-colors',
                  item === code
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {item}
              </Link>
            ))}
          </div>
        </details>
      </div>
    </MarketingShell>
  );
}
