import { Badge, LiveBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import type { VisionEngineInfo, VisionEngineName } from '../../lib/visionEngines';

export function VisionEngineModal({
  isOpen,
  onClose,
  engines,
  selectedEngine,
  onSelectEngine,
}: {
  isOpen: boolean;
  onClose: () => void;
  engines: readonly VisionEngineInfo[];
  selectedEngine: VisionEngineName;
  onSelectEngine: (name: VisionEngineName) => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vision-engines-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/60 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-surface-lowest shadow-2xl overflow-hidden border border-outline-variant/30 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/20 px-6 py-4 bg-surface-low">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary-fixed text-primary">
              <Icon name="biotech" size={20} />
            </span>
            <div>
              <h2 id="vision-engines-title" className="text-title-lg font-bold text-on-surface">
                เครื่องยนต์วิเคราะห์ภาพ AI (Vision Engines)
              </h2>
              <p className="text-caption text-on-surface-variant">
                เลือกเครื่องยนต์ตามลักษณะอาการที่พบ โดยแต่ละตัวมีจุดเด่นและข้อจำกัดเฉพาะ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="flex size-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="rounded-xl bg-surface-container-low p-4 text-body-sm text-on-surface-variant border border-outline-variant/20">
            <p className="font-semibold text-on-surface flex items-center gap-1.5 mb-1">
              <Icon name="info" size={16} className="text-secondary" />
              ข้อกำหนดความปลอดภัยของระบบเกษตรอัจฉริยะ:
            </p>
            <p>
              โมเดลเริ่มต้นคือ <strong>Legacy 4</strong> ซึ่งผ่านการปรับเทียบความน่าจะเป็นบนภาพใบแตงโมจริง สำหรับเครื่องยนต์อื่นที่ยังไม่ปรับเทียบ ตัวเลขความมั่นใจเป็นคะแนนดิบเท่านั้น ไม่ถือเป็นความน่าจะเป็นจริง
            </p>
          </div>

          <div className="space-y-4">
            {engines.map((eng) => {
              const isSelected = selectedEngine === eng.name;
              return (
                <div
                  key={eng.name}
                  className={`rounded-xl border p-4.5 transition-all ${
                    isSelected
                      ? 'border-primary bg-melon-tint/30 shadow-sm ring-1 ring-primary'
                      : 'border-outline-variant/30 bg-surface-low hover:bg-surface-container/60'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-title-md font-bold text-on-surface">
                          {eng.title_th}
                        </span>
                        {eng.name === 'legacy4' ? (
                          <Badge tone="primary">ค่าเริ่มต้น (แนะนำ)</Badge>
                        ) : null}
                        {eng.calibrated ? (
                          <Badge tone="secondary">ปรับเทียบความน่าจะเป็นแล้ว</Badge>
                        ) : (
                          <Badge tone="neutral">ยังไม่ปรับเทียบ (คะแนนดิบ)</Badge>
                        )}
                        <Badge tone="outline">{eng.class_count > 0 ? `${eng.class_count} คลาส` : 'ไม่จำกัดคลาส'}</Badge>
                      </div>
                      <p className="mt-1 text-body-sm text-on-surface-variant">
                        {eng.description_th}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant={isSelected ? 'primary' : 'ghost'}
                      onClick={() => onSelectEngine(eng.name as VisionEngineName)}
                      className="shrink-0 cursor-pointer"
                    >
                      {isSelected ? 'กำลังเลือกใช้อยู่' : 'เลือกตัวนี้'}
                    </Button>
                  </div>

                  {/* Good for */}
                  {eng.good_for_th && eng.good_for_th.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-caption font-semibold text-secondary flex items-center gap-1">
                        <Icon name="check_circle" size={14} />
                        เหมาะสำหรับ:
                      </p>
                      <ul className="mt-1 space-y-0.5 text-body-sm text-on-surface pl-5 list-disc">
                        {eng.good_for_th.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* Limits (REQUIRED to display) */}
                  {eng.limits_th && eng.limits_th.length > 0 ? (
                    <div className="mt-3 rounded-lg bg-surface-container-high/60 p-2.5">
                      <p className="text-caption font-semibold text-error flex items-center gap-1">
                        <Icon name="warning" size={14} />
                        ข้อจำกัดที่ควรทราบ:
                      </p>
                      <ul className="mt-1 space-y-0.5 text-caption text-on-surface-variant pl-5 list-disc">
                        {eng.limits_th.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-outline-variant/20 px-6 py-3.5 bg-surface-low flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            ปิดหน้าต่าง
          </Button>
        </div>
      </div>
    </div>
  );
}
