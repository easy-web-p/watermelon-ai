import { Badge, LiveBadge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { Meter } from '../ui/Meter';
import { Link } from '../../lib/router';
import { cn } from '../../lib/cn';
import { MODEL_CLASS_THAI, STATUS_PRESENTATION, type DiseaseDetection, type ModelClass } from '../../lib/api';

const SEVERITY_TONE: Record<number, 'error' | 'primary' | 'neutral'> = {
  5: 'error',
  4: 'error',
  3: 'primary',
  2: 'neutral',
  1: 'neutral',
};

/** Vision diagnosis returned by `/watermelon/disease-detect`. */
export function DiseaseResultCard({
  result,
  imageUrl,
  className,
}: {
  result: DiseaseDetection;
  imageUrl?: string;
  className?: string;
}) {
  const tone = SEVERITY_TONE[result.severity_level] ?? 'primary';
  // Driven by the status table in `diseaseModel.ts` rather than by a chain of
  // ternaries. The chain used to render every status that was not `diagnosed`
  // or `inconclusive` as "ไม่พบอาการโรคในภาพ", so `suspect` — which exists to
  // say the opposite — would have printed "no disease found" over a finding.
  const presentation = STATUS_PRESENTATION[result.status];
  const title = presentation.actionable ? `🔬 ${result.thai_name}` : result.thai_name;
  // Nothing was measured on an unreadable photo, so there is no number to show.
  const measured = result.status !== 'unusable';
  const region = result.evidence_region;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 text-headline-sm font-bold text-primary">
            {title}
          </h3>
          {result.scientific_name ? (
            <p className="mt-0.5 text-caption text-on-surface-variant italic">{result.scientific_name}</p>
          ) : null}
        </div>
        {measured ? <LiveBadge>ความมั่นใจ {result.confidence_percentage}%</LiveBadge> : null}
      </div>

      {imageUrl ? (
        <div className="relative overflow-hidden rounded-lg">
          <img src={imageUrl} alt="ภาพที่ส่งให้ AI วิเคราะห์" className="max-h-64 w-full object-cover" />
          {region ? (
            // The crop the finding came from. Without it, "go and look at the
            // spot we found" leaves the farmer searching the whole leaf.
            <span
              aria-hidden
              className="pointer-events-none absolute rounded-sm border-2 border-primary shadow-cta"
              style={{
                left: `${region.box[0] * 100}%`,
                top: `${region.box[1] * 100}%`,
                width: `${(region.box[2] - region.box[0]) * 100}%`,
                height: `${(region.box[3] - region.box[1]) * 100}%`,
              }}
            />
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {presentation.actionable ? (
          <>
            <Badge tone={tone}>
              <Icon name="warning" size={12} />
              ความรุนแรง: {result.severity}
            </Badge>
            <Badge tone="outline">ระดับ {result.severity_level}/5</Badge>
          </>
        ) : null}
        <Badge tone={presentation.tone}>
          <Icon name={presentation.icon} size={12} />
          {presentation.label}
        </Badge>
        {result.model_recall_percentage !== null ? (
          <Badge tone="outline">โมเดลตรวจพบโรคนี้ได้ {result.model_recall_percentage}% ของภาพที่เป็นโรคจริง</Badge>
        ) : null}
        {result.lesion_area_percentage !== null ? (
          <Badge tone="outline">
            <Icon name="colorize" size={12} />
            วัดจากสีภาพ: เนื้อใบเปลี่ยนสี {result.lesion_area_percentage}%
          </Badge>
        ) : null}
      </div>

      {result.photo_quality && result.photo_quality.verdict !== 'usable' ? (
        <div
          className={cn(
            'flex items-start gap-3 rounded-md border-l-4 p-4',
            result.photo_quality.verdict === 'unusable'
              ? 'border-error bg-melon-tint'
              : 'border-outline-variant bg-surface-low',
          )}
        >
          <Icon name="photo_camera" size={20} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-label-lg font-bold text-on-surface">
              {result.photo_quality.verdict === 'unusable' ? 'ภาพนี้ตรวจไม่ได้' : 'ภาพนี้อ่านได้ไม่เต็มที่'}
            </p>
            <ul className="mt-1 flex flex-col gap-1">
              {result.photo_quality.reasons.map((reason) => (
                <li key={reason} className="text-body-md text-on-surface-variant">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {measured ? (
        <div className="flex flex-col gap-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-body-md">
              <span className="text-on-surface-variant">
                ความมั่นใจของโมเดล
                {result.confidence_calibrated ? '' : ' (คะแนนดิบ ยังไม่ปรับเทียบ)'}
              </span>
              <span className="font-bold text-on-surface">{result.confidence_percentage}%</span>
            </div>
            <Meter value={result.confidence_percentage} tone="gradient" label="ความมั่นใจของโมเดล" />
          </div>

          {result.scores && Object.keys(result.scores).length > 0 ? (
            <div className="rounded-md border border-outline-variant/50 bg-surface-low/70 p-3">
              <p className="text-caption font-semibold text-outline uppercase tracking-wider">
                คะแนนความน่าจะเป็นจำแนกตามประเภท (Softmax)
              </p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.entries(result.scores) as [ModelClass, number][])
                  .sort(([, a], [, b]) => b - a)
                  .map(([cls, score]) => {
                    const percent = Math.round(score * 100);
                    const thaiLabel = MODEL_CLASS_THAI[cls] ?? cls;
                    // `scores` keys are model labels ('Downy_Mildew'); `disease_id` is a
                    // catalogue key ('downy-mildew'), so comparing them never matched.
                    const isWinner = cls === result.model_class;
                    return (
                      <div
                        key={cls}
                        className={cn(
                          'flex items-center justify-between rounded-md px-2.5 py-1.5 text-caption',
                          isWinner ? 'bg-primary/10 font-bold text-primary' : 'bg-surface text-on-surface-variant',
                        )}
                      >
                        <span className="truncate">{thaiLabel}</span>
                        <span className="shrink-0 font-mono font-bold tabular-nums">{percent}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/*
        On an unreadable photo `urgent_action` is the first quality reason —
        it has to be, because the chat reply and the saved record each show
        one line. The block above already lists every reason in full, so
        rendering it again here just says the same sentence twice.
      */}
      {result.urgent_action && result.status !== 'unusable' ? (
        <div className="flex items-start gap-3 rounded-md border-l-4 border-primary bg-melon-tint p-4">
          <Icon name="priority_high" size={20} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-label-lg font-bold text-on-surface">สิ่งที่ต้องทำทันที</p>
            <p className="mt-1 text-body-md text-on-surface-variant">{result.urgent_action}</p>
          </div>
        </div>
      ) : null}

      {result.symptoms.length ? (
        <div className="rounded-md bg-surface-low p-4">
          <p className="flex items-center gap-1.5 text-label-lg font-bold text-on-surface">
            <Icon name="visibility" size={16} className="text-primary" />
            อาการที่ตรวจพบ
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {result.symptoms.map((symptom) => (
              <li key={symptom} className="flex items-start gap-2 text-body-md text-on-surface-variant">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-50" />
                {symptom}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.chemical_control.length ? (
        <div className="flex items-start gap-3 rounded-md border border-outline-variant/60 bg-surface-low p-4">
          <Icon name="schedule" size={20} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-label-lg font-bold text-on-surface">ระยะปลอดภัยก่อนเก็บเกี่ยว (PHI)</p>
            <p className="mt-1 text-body-md text-on-surface-variant">{result.phi_note}</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[
          {
            icon: 'medication',
            title: 'สารเคมีควบคุม',
            items: result.chemical_control,
            tone: 'bg-surface-low',
            iconTone: 'text-primary',
          },
          {
            icon: 'biotech',
            title: 'ชีวภัณฑ์ทางเลือก',
            items: result.organic_control,
            tone: 'bg-mint-mist',
            iconTone: 'text-secondary',
          },
        ].map((group) =>
          group.items?.length ? (
            <div key={group.title} className={cn('rounded-md p-4', group.tone)}>
              <p className="flex items-center gap-1.5 text-label-lg font-bold text-on-surface">
                <Icon name={group.icon} size={16} className={group.iconTone} />
                {group.title}
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-body-md text-on-surface-variant">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-50" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
      </div>

      {result.prevention?.length ? (
        <div className="rounded-md bg-surface-low p-4">
          <p className="flex items-center gap-1.5 text-label-lg font-bold text-on-surface">
            <Icon name="shield" size={16} className="text-tertiary" />
            การป้องกันไม่ให้กลับมาอีก
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {result.prevention.map((item) => (
              <li key={item} className="flex items-start gap-2 text-body-md text-on-surface-variant">
                <Icon name="check_circle" size={15} className="mt-1 shrink-0 text-tertiary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.caveats.length ? (
        <div className="rounded-md border border-outline-variant/60 bg-surface-low p-4">
          <p className="flex items-center gap-1.5 text-label-lg font-bold text-on-surface">
            <Icon name="info" size={16} className="text-on-surface-variant" />
            ข้อจำกัดของผลนี้
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {result.caveats.map((caveat) => (
              <li key={caveat} className="flex items-start gap-2 text-body-md text-on-surface-variant">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-50" />
                {caveat}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/30 pt-3 text-caption text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          <Icon name="memory" size={14} />
          วิเคราะห์โดย {result.analysis_engine ?? 'Watermelon Vision'}
          {result.engine ? ` • เครื่องยนต์ ${result.engine}` : null}
        </span>
        <Link to="/data-dispute" className="font-semibold text-primary hover:underline">
          ผลไม่ตรงกับที่พบจริง? แจ้งเรา
        </Link>
      </div>
    </div>
  );
}
