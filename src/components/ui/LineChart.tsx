import { useId } from 'react';
import { cn } from '../../lib/cn';

export type Series = { name: string; color: string; points: readonly number[] };

/**
 * Multi-series line chart drawn as inline SVG. Kept dependency-free so the
 * market screen stays light on mobile; the area wash under the lead series
 * carries the emphasis and the rest read as reference lines.
 */
export function LineChart({
  series,
  labels,
  unit = '฿',
  className,
  height = 240,
}: {
  series: readonly Series[];
  labels: readonly string[];
  unit?: string;
  className?: string;
  height?: number;
}) {
  const gradientId = useId().replace(/:/g, '');
  const width = 600;
  const padding = { top: 16, right: 12, bottom: 28, left: 40 };

  // Only series that actually carry points can be drawn. Without this,
  // `series.flatMap(...)` on an empty list made Math.min() return Infinity
  // and the destructured `lead` undefined, so `lead.color` threw before
  // anything rendered — a market screen whose fetch returned nothing took
  // the whole route down rather than showing an empty chart.
  const drawable = series.filter((item) => item.points.length > 0);
  const all = drawable.flatMap((item) => [...item.points]).filter((value) => Number.isFinite(value));
  const [lead, ...rest] = drawable;

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const count = Math.max(1, labels.length - 1);

  const rawMin = all.length ? Math.min(...all) : 0;
  const rawMax = all.length ? Math.max(...all) : 0;
  const span = rawMax - rawMin;
  const lowerBound = Math.floor((rawMin - span * 0.15) / 2) * 2;
  const upperBound = Math.ceil((rawMax + span * 0.1) / 2) * 2;
  const min = lowerBound;
  // A flat series — every market price identical for the window, which is
  // ordinary — gave `max === min`, so `y()` divided by zero and every
  // coordinate came out NaN. The SVG then rendered as an empty box.
  const max = upperBound > lowerBound ? upperBound : lowerBound + 2;

  const x = (index: number) => padding.left + (index / count) * plotW;
  const y = (value: number) =>
    Number.isFinite(value) ? padding.top + plotH - ((value - min) / (max - min)) * plotH : padding.top + plotH;

  const toPath = (points: readonly number[]) =>
    points.map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ');

  const gridValues = [min, min + (max - min) / 3, min + ((max - min) * 2) / 3, max];

  if (!lead) {
    return (
      <figure className={cn('w-full', className)}>
        <div
          className="flex items-center justify-center rounded-lg bg-surface-low text-body-md text-on-surface-variant"
          style={{ height }}
        >
          ยังไม่มีข้อมูลสำหรับช่วงเวลานี้
        </div>
      </figure>
    );
  }

  const lastIndex = lead.points.length - 1;

  return (
    <figure className={cn('w-full', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`กราฟแนวโน้มราคา ${series.map((s) => s.name).join(', ')}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lead.color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={lead.color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Keyed by position: a flat series makes every grid value equal. */}
        {gridValues.map((value, gridIndex) => (
          <g key={gridIndex}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(value)}
              y2={y(value)}
              stroke="#d8e3fb"
              strokeWidth="1"
            />
            <text x={padding.left - 8} y={y(value) + 4} textAnchor="end" fontSize="10" fill="#906f70">
              {Math.round(value)}
              {unit}
            </text>
          </g>
        ))}

        <path
          d={`${toPath(lead.points)} L${x(lastIndex)},${padding.top + plotH} L${padding.left},${padding.top + plotH} Z`}
          fill={`url(#${gradientId})`}
        />

        {rest.map((item) => (
          <path
            key={item.name}
            d={toPath(item.points)}
            stroke={item.color}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeDasharray={item === rest[rest.length - 1] ? '5 5' : undefined}
            fill="none"
            opacity="0.85"
          />
        ))}

        <path d={toPath(lead.points)} stroke={lead.color} strokeWidth="2.75" strokeLinecap="round" fill="none" />
        <circle cx={x(lastIndex)} cy={y(lead.points[lastIndex] ?? rawMin)} r="4.5" fill={lead.color} />

        {labels.map((label, index) =>
          index % 3 === 0 || index === labels.length - 1 ? (
            // A repeated label (the same month twice) collided on key={label}.
            <text
              key={`${index}-${label}`}
              x={x(index)}
              y={height - 8}
              textAnchor={index === labels.length - 1 ? 'end' : index === 0 ? 'start' : 'middle'}
              fontSize="10"
              fill={index === labels.length - 1 ? '#ba0035' : '#906f70'}
              fontWeight={index === labels.length - 1 ? 700 : 400}
            >
              {label}
            </text>
          ) : null,
        )}
      </svg>

      <figcaption className="mt-3 flex flex-wrap items-center gap-4">
        {drawable.map((item) => (
          <span key={item.name} className="flex items-center gap-1.5 text-caption text-on-surface-variant">
            <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: item.color }} />
            {item.name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
