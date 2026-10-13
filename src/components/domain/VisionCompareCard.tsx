import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import type { VisionCompareResponse } from '../../lib/api';
import { resolveDiseaseId, type VisionEngineName } from '../../lib/visionEngines';
import { DISEASES } from '../../data/diseases';
import { cn } from '../../lib/cn';

export function VisionCompareCard({
  compareResult,
  onClose,
  className,
}: {
  compareResult: VisionCompareResponse;
  onClose?: () => void;
  className?: string;
}) {
  const { engine, prediction, disclaimer } = compareResult;
  const unusable = prediction.abstain === true || prediction.is_plant_image === false;
  // A checkpoint member's temperature does not calibrate the complete engine.
  // For older services without this flag, show the conservative interpretation.
  const calibrated = prediction.engine_calibrated === true;
  const explanation = prediction.summary_th || prediction.explanation;
  const findings = prediction.observations ?? prediction.findings;

  // Extract class label
  const rawClass =
    (prediction.class_id && prediction.class_id !== 'unknown' ? prediction.class_id : null) ||
    prediction.predicted_class ||
    'ไม่ระบุ';

  // Check if class maps to a known disease in catalogue
  const diseaseId = unusable ? null : resolveDiseaseId(engine, rawClass);
  const matchedDisease = diseaseId ? DISEASES.find((d) => d.id === diseaseId) : null;
  const displayName = unusable
    ? 'ยังไม่สามารถอ่านภาพนี้ได้'
    : rawClass.toLowerCase() === 'healthy'
      ? 'ใบปกติในคลาสโมเดล (ไม่ได้ยืนยันว่าไม่มีโรค)'
      : matchedDisease ? matchedDisease.name : rawClass;

  // Confidence / Score
  const confidence =
    typeof prediction.confidence_percentage === 'number'
      ? prediction.confidence_percentage
      : typeof prediction.confidence === 'number'
        ? Math.round(prediction.confidence * 100)
        : null;

  const engineLabels: Record<VisionEngineName, string> = {
    legacy4: 'Legacy 4 (โมเดลมาตรฐาน)',
    wide9: 'Wide-9 (โมเดล 9 คลาส)',
    wide11: 'Wide-11 (โมเดล 11 คลาสรุ่นทดลอง)',
    baseline9: 'Baseline-9 (โมเดลเทียบเคียง)',
    claude: 'Claude Vision (วิเคราะห์เชิงลึก)',
  };

  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border border-secondary/30 bg-surface-lowest p-5 shadow-sm', className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-outline-variant/20 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-label-md font-bold text-secondary">
              <Icon name="visibility" size={18} />
              ข้อสังเกตเพิ่มเติม (ไม่ใช่คำวินิจฉัย)
            </span>
            <Badge tone="secondary">{engineLabels[engine] ?? engine}</Badge>
            <Badge tone="neutral">{calibrated ? 'ปรับเทียบแล้ว' : 'ยังไม่ปรับเทียบ'}</Badge>
          </div>
          <p className="mt-1 text-caption text-on-surface-variant">
            ผลตรวจจากโมเดลทางเลือกสำหรับดูแนวโน้มอาการ ไม่ใช้ตัวเลขความแม่นยำของโมเดลหลัก
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดข้อสังเกต"
            className="flex size-7 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container cursor-pointer"
          >
            <Icon name="close" size={16} />
          </button>
        ) : null}
      </div>

      {/* Main Finding */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="rounded-lg bg-surface-low p-3.5">
          <p className="text-caption text-on-surface-variant">คลาสที่ได้คะแนนสูงสุด (ไม่ใช่โรคที่ยืนยัน):</p>
          <p className="mt-1 text-title-md font-bold text-on-surface">
            {displayName}
          </p>
          {unusable ? (
            <p className="text-caption text-outline">กรุณาถ่ายภาพพืชที่ชัดเจนแล้วลองใหม่</p>
          ) : matchedDisease ? (
            <p className="text-caption text-outline italic">
              {matchedDisease.latin} ({matchedDisease.category})
            </p>
          ) : (
            <p className="text-caption text-outline">
              รหัสคลาสโมเดล: {rawClass}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-surface-low p-3.5">
          <p className="text-caption text-on-surface-variant">คะแนนความมั่นใจของโมเดล:</p>
          <p className="mt-1 text-title-md font-bold text-secondary">
            {!unusable && confidence !== null ? `${confidence}%` : 'ไม่มีคะแนนที่ใช้สรุปได้'}
          </p>
          <p className="text-caption text-outline">
            {engine === 'claude'
              ? '⚠️ คะแนนประเมินตนเองของโมเดล ไม่ใช่ความน่าจะเป็นจริง'
              : calibrated
                ? 'คะแนนผ่านการปรับเทียบตามข้อมูลของโมเดลนี้'
                : '⚠️ คะแนนโมเดลยังไม่ปรับเทียบ ไม่ใช่ความน่าจะเป็นจริง'}
          </p>
        </div>
      </div>

      {/* Reasons / Explanations if available */}
      {explanation ? (
        <div className="rounded-lg bg-surface-low p-3.5 text-body-sm text-on-surface">
          <p className="font-semibold text-caption text-on-surface-variant mb-1 flex items-center gap-1">
            <Icon name="psychology" size={14} className="text-primary" />
            คำอธิบายลักษณะที่พบ:
          </p>
          <p className="leading-relaxed">{String(explanation)}</p>
        </div>
      ) : null}

      {Array.isArray(findings) && findings.length > 0 ? (
        <div className="rounded-lg bg-surface-low p-3.5 text-body-sm text-on-surface">
          <p className="font-semibold text-caption text-on-surface-variant mb-1 flex items-center gap-1">
            <Icon name="fact_check" size={14} className="text-secondary" />
            ข้อค้นพบสำคัญ:
          </p>
          <ul className="list-disc pl-5 space-y-0.5 text-caption">
            {findings.map((f, i) => (
              <li key={i}>{String(f)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Safety Disclaimer Callout */}
      <div className="rounded-lg bg-amber-500/10 p-3 text-caption text-amber-900 border border-amber-500/20">
        <p className="font-bold flex items-center gap-1 mb-0.5">
          <Icon name="security" size={14} className="text-amber-700" />
          คำชี้แจงความปลอดภัยทางการเกษตร:
        </p>
        <p className="leading-relaxed">
          {disclaimer ||
            'ผลนี้เป็นข้อสังเกตจากเครื่องยนต์ที่เลือก ไม่ใช่คำวินิจฉัย และไม่ได้แนบแผนการรักษา สำหรับผลที่จับคู่กับแผนการจัดการและระยะปลอดภัย PHI ให้ใช้โมเดลหลัก'}
        </p>
      </div>
    </div>
  );
}
