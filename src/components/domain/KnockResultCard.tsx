import { Badge, LiveBadge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { Meter } from '../ui/Meter';
import { cn } from '../../lib/cn';
import type { KnockAnalysis } from '../../lib/api';

/** A stored field that may be missing, rendered as a dash rather than "undefined". */
const orDash = (value: number | undefined, suffix = '') =>
  typeof value === 'number' && Number.isFinite(value) ? `${value}${suffix}` : '—';

/**
 * Result of the acoustic ripeness test — shared by the chat feed and the scanner.
 *
 * Every field is treated as optional even though the type says otherwise,
 * because this also renders turns read back out of the database. Records
 * written by earlier builds have no `probabilities` and no
 * `resonanceDecayRate`, so `probabilities.unripe` threw while restoring the
 * conversation and the whole thread became unreadable behind the error
 * boundary. A record is partial far more often than it is absent.
 */
export function KnockResultCard({ result, className }: { result: KnockAnalysis; className?: string }) {
  const probabilities = result.probabilities;
  const bands = probabilities
    ? [
        { key: 'unripe', label: 'ยังไม่สุก', value: probabilities.unripe ?? 0, tone: 'neutral' as const },
        { key: 'ripe', label: 'สุกพอดี', value: probabilities.ripe ?? 0, tone: 'secondary' as const },
        { key: 'overripe', label: 'สุกเกิน', value: probabilities.overripe ?? 0, tone: 'error' as const },
      ].filter((band) => Number.isFinite(band.value))
    : [];
  const leading = bands.length ? bands.reduce((best, band) => (band.value > best.value ? band : best)) : null;
  const recommendations = result.recommendations ?? [];

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-headline-sm font-bold text-primary">
          <Icon name="graphic_eq" size={22} />
          ผลวิเคราะห์เสียงเคาะ
        </h3>
        {typeof result.confidence === 'number' && Number.isFinite(result.confidence) ? (
          <LiveBadge>ความมั่นใจ {Math.round(result.confidence * 100)}%</LiveBadge>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg bg-gradient-to-br from-primary to-primary-container p-5 text-on-primary">
        <div>
          <p className="text-label-md text-primary-fixed">ผลการประเมิน</p>
          <p className="mt-1 text-headline-md font-bold">{result.maturityClass || 'ไม่ระบุ'}</p>
          <p className="mt-1 flex items-center gap-1.5 text-body-md text-primary-fixed">
            <Icon name="military_tech" size={16} />
            เกรด {orDash(result.maturityGrade)}/5
          </p>
        </div>
        <div className="text-right">
          <p className="text-label-md text-primary-fixed">ความหวานโดยประมาณ</p>
          <p className="mt-1 flex items-baseline justify-end gap-1.5 text-display-sm leading-none font-bold">
            {typeof result.sweetnessEstimateBrix === 'number' && Number.isFinite(result.sweetnessEstimateBrix)
              ? result.sweetnessEstimateBrix.toFixed(1)
              : '—'}
            <span className="text-headline-sm">°Brix</span>
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'ความถี่เรโซแนนซ์', value: orDash(result.dominantFrequencyHz, ' Hz'), icon: 'tune' },
          { label: 'จังหวะเคาะที่ตรวจพบ', value: orDash(result.detectedImpacts, ' ครั้ง'), icon: 'touch_app' },
          { label: 'อัตราส่วนสัญญาณ/สัญญาณรบกวน', value: orDash(result.snrDb, ' dB'), icon: 'noise_control_off' },
          { label: 'อัตราการลดทอนเสียงก้อง', value: orDash(result.resonanceDecayRate), icon: 'waves' },
        ].map((item) => (
          <div key={item.label} className="rounded-md bg-surface-low p-3">
            <dt className="flex items-center gap-1 text-caption text-on-surface-variant">
              <Icon name={item.icon} size={13} />
              {item.label}
            </dt>
            <dd className="mt-1 text-label-lg font-bold text-on-surface">{item.value}</dd>
          </div>
        ))}
      </dl>

      {bands.length ? (
      <div>
        <p className="mb-2 text-label-lg font-semibold text-on-surface">การกระจายความน่าจะเป็น</p>
        <div className="flex flex-col gap-2">
          {bands.map((band) => (
            <div key={band.key} className="flex items-center gap-3">
              <span
                className={cn(
                  'w-20 shrink-0 text-body-md',
                  band.key === leading?.key ? 'font-bold text-on-surface' : 'text-on-surface-variant',
                )}
              >
                {band.label}
              </span>
              <Meter
                value={band.value * 100}
                tone={band.key === 'ripe' ? 'secondary' : 'primary'}
                label={band.label}
              />
              <span className="w-12 shrink-0 text-right text-label-md font-bold text-on-surface">
                {Math.round(band.value * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
      ) : null}

      {recommendations.length > 0 ? (
        <div className="rounded-md bg-mint-mist p-4">
          <p className="mb-2 flex items-center gap-1.5 text-label-lg font-bold text-on-surface">
            <Icon name="lightbulb" size={16} className="text-secondary" />
            คำแนะนำจาก AI
          </p>
          <ul className="flex flex-col gap-1.5">
            {recommendations.map((item, index) => (
              <li key={`${index}-${item}`} className="flex items-start gap-2 text-body-md text-on-surface-variant">
                <Icon name="check_circle" size={15} className="mt-1 shrink-0 text-secondary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.qualityStatus ? (
        <Badge tone="outline" className="w-fit">
          <Icon name="verified" size={12} />
          คุณภาพการบันทึก: {result.qualityStatus === 'passed' ? 'ผ่านเกณฑ์' : result.qualityStatus}
        </Badge>
      ) : null}

      <p className="text-caption text-on-surface-variant/80 border-t border-surface-container-high/60 pt-2">
        * การประเมินความสุกและความหวานจากความถี่เสียงเป็นเกณฑ์ทดสอบภาคสนาม (Experimental) ยังไม่สามารถรับประกันความหวานทดแทนการผ่าชิมจริง
      </p>
    </div>
  );
}
