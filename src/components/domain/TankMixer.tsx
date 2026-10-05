import { useMemo, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/cn';
import { copyText, printElement } from '../../lib/export';
import { MIX_SEQUENCE, TANK_KITS, TANK_PRESETS, type MixComponent } from '../../data/tankmix';

/** Scales a per-20-litre rate to the tank in use, rounded for a kitchen scale. */
export function scaleRate(ratePer20L: number, litres: number): number {
  const scaled = (ratePer20L * litres) / 20;
  if (scaled >= 1000) return Math.round(scaled / 10) * 10;
  if (scaled >= 100) return Math.round(scaled);
  return Math.round(scaled * 10) / 10;
}

/** Orders components the way they must physically enter the tank. */
export function sortByMixOrder(components: readonly MixComponent[]): MixComponent[] {
  return [...components].sort(
    (a, b) => MIX_SEQUENCE.indexOf(a.formulation) - MIX_SEQUENCE.indexOf(b.formulation),
  );
}

export function TankMixer({
  open,
  onClose,
  presetKitId,
}: {
  open: boolean;
  onClose: () => void;
  /** Opens straight onto a kit, e.g. from a product card. */
  presetKitId?: string;
}) {
  const [kitId, setKitId] = useState(presetKitId ?? TANK_KITS[0].id);
  const [litres, setLitres] = useState<number>(20);
  const [custom, setCustom] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const kit = TANK_KITS.find((item) => item.id === kitId) ?? TANK_KITS[0];
  const ordered = useMemo(() => sortByMixOrder(kit.components), [kit]);

  const totalGrams = ordered
    .filter((c) => c.unit === 'กรัม')
    .reduce((sum, c) => sum + scaleRate(c.ratePer20L, litres), 0);
  const totalMl = ordered
    .filter((c) => c.unit === 'มล.')
    .reduce((sum, c) => sum + scaleRate(c.ratePer20L, litres), 0);

  async function handleCopy() {
    const lines = [
      `${kit.name} — ถัง ${litres.toLocaleString('th-TH')} ลิตร`,
      ...ordered.map(
        (c, index) => `${index + 1}. ${c.name} — ${scaleRate(c.ratePer20L, litres).toLocaleString('th-TH')} ${c.unit}`,
      ),
      `ช่วงเวลาพ่น: ${kit.sprayWindow}`,
      kit.phi > 0 ? `เว้นก่อนเก็บเกี่ยว ${kit.phi} วัน` : 'ไม่ต้องเว้นระยะก่อนเก็บเกี่ยว',
    ];
    const ok = await copyText(lines.join('\n'));
    if (ok) toast.success('คัดลอกสูตรแล้ว — วางใน LINE ส่งให้คนพ่นได้เลย');
    else toast.error('คัดลอกไม่สำเร็จ');
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="calculate"
      title="เครื่องคำนวณอัตราผสมถังพ่น"
      subtitle="คำนวณสัดส่วนต่อน้ำให้เป๊ะ พร้อมลำดับการเทสารกันตะกอนจับก้อน"
      size="lg"
      footer={
        <>
          <Button variant="quiet" size="sm" onClick={onClose}>
            ปิด
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleCopy()}>
            <Icon name="content_copy" size={16} />
            คัดลอกสูตร
          </Button>
          <Button size="sm" onClick={() => printElement(sheet.current, `สูตรผสม-${kit.name}`)}>
            <Icon name="print" size={16} />
            พิมพ์ / บันทึก PDF
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <section>
          <h3 className="mb-2 text-label-lg font-bold text-on-surface">1. ขนาดถังฉีดพ่น</h3>
          <div className="flex flex-wrap gap-2">
            {TANK_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setLitres(preset.litres);
                  setCustom(false);
                }}
                aria-pressed={!custom && litres === preset.litres}
                className={cn(
                  'cursor-pointer rounded-full px-4 py-2 text-label-md font-semibold transition-all duration-150 ease-tactile active:scale-[0.96]',
                  !custom && litres === preset.litres
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustom(true)}
              aria-pressed={custom}
              className={cn(
                'cursor-pointer rounded-full px-4 py-2 text-label-md font-semibold transition-all duration-150 ease-tactile active:scale-[0.96]',
                custom ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-low text-on-surface-variant hover:bg-surface-container',
              )}
            >
              ระบุเอง
            </button>
          </div>

          {custom ? (
            <label className="mt-3 flex items-center gap-3">
              <span className="text-body-md text-on-surface-variant">ปริมาณน้ำ</span>
              <input
                type="number"
                min={1}
                max={5000}
                value={litres}
                onChange={(event) => setLitres(Math.max(1, Math.min(5000, Number(event.target.value) || 1)))}
                className="w-32 rounded-full bg-surface-low px-4 py-2 text-title-md font-bold text-on-surface outline-none focus:bg-surface-lowest focus:ring-2 focus:ring-primary"
              />
              <span className="text-body-md text-on-surface-variant">ลิตร</span>
            </label>
          ) : null}
        </section>

        <section>
          <h3 className="mb-2 text-label-lg font-bold text-on-surface">2. สูตรที่ต้องการเตรียม</h3>
          <div className="flex flex-col gap-2">
            {TANK_KITS.map((item) => (
              <label
                key={item.id}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md p-3 transition-all',
                  kitId === item.id ? 'bg-melon-tint ring-2 ring-primary' : 'bg-surface-low hover:bg-surface-container',
                )}
              >
                <input
                  type="radio"
                  name="tank-kit"
                  checked={kitId === item.id}
                  onChange={() => setKitId(item.id)}
                  className="mt-0.5 size-4 shrink-0 accent-[#ba0035]"
                />
                <span className="min-w-0">
                  <span className="block text-label-lg font-bold text-on-surface">{item.name}</span>
                  <span className="block text-caption text-on-surface-variant">{item.purpose}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* The printable sheet */}
        <section ref={sheet} className="flex flex-col gap-4 rounded-lg bg-surface-low p-5">
          <header className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-title-md font-bold text-on-surface">{kit.name}</h3>
              <p className="text-caption text-on-surface-variant">{kit.stage}</p>
            </div>
            <Badge tone={kit.phi > 0 ? 'primary' : 'secondary'}>
              {kit.phi > 0 ? `เว้นก่อนเก็บเกี่ยว ${kit.phi} วัน` : 'ไม่ต้องเว้นระยะ'}
            </Badge>
          </header>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-surface-lowest p-3">
              <p className="text-caption text-on-surface-variant">ปริมาณน้ำ</p>
              <p className="mt-0.5 text-title-md font-bold text-on-surface tabular-nums">
                {litres.toLocaleString('th-TH')} ลิตร
              </p>
            </div>
            <div className="rounded-md bg-surface-lowest p-3">
              <p className="text-caption text-on-surface-variant">สารชนิดผง รวม</p>
              <p className="mt-0.5 text-title-md font-bold text-primary tabular-nums">
                {totalGrams.toLocaleString('th-TH')} กรัม
              </p>
            </div>
            <div className="rounded-md bg-surface-lowest p-3">
              <p className="text-caption text-on-surface-variant">สารชนิดน้ำ รวม</p>
              <p className="mt-0.5 text-title-md font-bold text-secondary tabular-nums">
                {totalMl.toLocaleString('th-TH')} มล.
              </p>
            </div>
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-label-lg font-bold text-on-surface">
              <Icon name="format_list_numbered" size={16} className="text-primary" />
              ลำดับการเทสารลงถัง (Tank-Mix Order)
            </h4>

            <ol className="flex flex-col gap-2">
              <li className="flex items-start gap-3 rounded-md bg-surface-lowest p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-container text-caption font-bold text-on-surface-variant">
                  1
                </span>
                <span className="text-body-md text-on-surface-variant">
                  เติมน้ำสะอาดลงถัง <span className="font-bold text-on-surface tabular-nums">ครึ่งหนึ่ง ({Math.round(litres / 2).toLocaleString('th-TH')} ลิตร)</span>{' '}
                  แล้วตรวจค่า pH ให้อยู่ที่ 6.0 – 6.5
                </span>
              </li>

              {ordered.map((component, index) => (
                <li key={component.name} className="flex items-start gap-3 rounded-md bg-surface-lowest p-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-caption font-bold text-on-primary">
                    {index + 2}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-body-lg font-semibold text-on-surface">{component.name}</span>
                      <span className="text-title-md font-bold text-primary tabular-nums">
                        {scaleRate(component.ratePer20L, litres).toLocaleString('th-TH')} {component.unit}
                      </span>
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-caption text-on-surface-variant">
                      <Badge tone="outline">{component.formulation}</Badge>
                      {component.note ? <span>{component.note}</span> : null}
                    </span>
                  </span>
                </li>
              ))}

              <li className="flex items-start gap-3 rounded-md bg-surface-lowest p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-container text-caption font-bold text-on-surface-variant">
                  {ordered.length + 2}
                </span>
                <span className="text-body-md text-on-surface-variant">
                  เติมน้ำให้ครบ <span className="font-bold text-on-surface tabular-nums">{litres.toLocaleString('th-TH')} ลิตร</span>{' '}
                  คนให้เข้ากัน แล้วพ่นให้หมดภายใน 4 ชั่วโมง
                </span>
              </li>
            </ol>
          </div>

          <div className="flex items-start gap-2 rounded-md bg-mint-mist p-3">
            <Icon name="schedule" size={16} className="mt-0.5 shrink-0 text-secondary" />
            <p className="text-body-md text-on-surface-variant">
              <span className="font-bold text-on-surface">ช่วงเวลาพ่นที่เหมาะสม:</span> {kit.sprayWindow}
            </p>
          </div>

          {kit.warning ? (
            <div className="flex items-start gap-2 rounded-md border-l-4 border-primary bg-melon-tint p-3">
              <Icon name="warning" size={16} className="mt-0.5 shrink-0 text-primary" />
              <p className="text-body-md text-on-surface-variant">
                <span className="font-bold text-on-surface">ข้อควรระวัง:</span> {kit.warning}
              </p>
            </div>
          ) : null}

          <p className="flex items-start gap-1.5 text-caption text-on-surface-variant">
            <Icon name="info" size={13} className="mt-0.5 shrink-0" />
            อัตราผสมอ้างอิงฉลากผลิตภัณฑ์และคำแนะนำกรมวิชาการเกษตร — ตรวจสอบฉลากจริงก่อนใช้ทุกครั้ง
          </p>
        </section>
      </div>
    </Modal>
  );
}
