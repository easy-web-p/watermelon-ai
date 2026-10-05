import { useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Field, TextInput, INPUT_CLASS } from '../ui/Field';
import { cn } from '../../lib/cn';
import { formatTHB, formatTHBCompact, plantingPlan } from '../../lib/calc';
import { CULTIVARS } from '../../data/cultivars';

export type NewPlot = {
  name: string;
  province: string;
  rai: number;
  ngan: number;
  wa: number;
  cultivarId: string;
  plantedOn: string;
  irrigation: string;
};

const PROVINCES = ['สุพรรณบุรี', 'กาญจนบุรี', 'ราชบุรี', 'นครปฐม', 'ขอนแก่น', 'ยโสธร', 'อุบลราชธานี', 'อื่น ๆ'];
const IRRIGATION = ['น้ำหยด (Drip)', 'สปริงเกอร์', 'ร่องน้ำ / ปล่อยตามร่อง'];

/**
 * Add-plot form from the extended farm-management mockup. The yield and
 * revenue estimate updates live, because that number is what decides whether
 * the farmer plants the plot at all.
 */
export function AddPlotModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (plot: NewPlot) => void;
}) {
  const [name, setName] = useState('');
  const [province, setProvince] = useState(PROVINCES[0]);
  const [rai, setRai] = useState(5);
  const [ngan, setNgan] = useState(0);
  const [wa, setWa] = useState(0);
  const [cultivarId, setCultivarId] = useState(CULTIVARS[0].id);
  const [plantedOn, setPlantedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [irrigation, setIrrigation] = useState(IRRIGATION[0]);

  const cultivar = CULTIVARS.find((item) => item.id === cultivarId) ?? CULTIVARS[0];

  const plan = useMemo(() => {
    const [low, high] = cultivar.weight
      .replace(/[^\d.–\-]/g, '')
      .split(/[–\-]/)
      .map(Number);
    return plantingPlan({ rai, ngan, wa }, low || 4, high || 5);
  }, [rai, ngan, wa, cultivar.weight]);

  const harvestDate = useMemo(() => {
    const date = new Date(plantedOn);
    if (Number.isNaN(date.getTime())) return '—';
    date.setDate(date.getDate() + cultivar.days);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  }, [plantedOn, cultivar.days]);

  const valid = name.trim().length > 0 && plan.sqm > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="add_location_alt"
      title="เพิ่มแปลงปลูกแตงโมใหม่"
      subtitle="กรอกข้อมูลแปลง ระบบจะคำนวณจำนวนต้น ผลผลิต และวันเก็บเกี่ยวให้อัตโนมัติ"
      size="lg"
      footer={
        <>
          <Button variant="quiet" size="sm" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            size="sm"
            disabled={!valid}
            onClick={() => {
              onCreate({ name: name.trim(), province, rai, ngan, wa, cultivarId, plantedOn, irrigation });
              onClose();
            }}
          >
            <Icon name="check" size={16} />
            บันทึกแปลงนี้
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="ชื่อแปลง" required>
            <TextInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="เช่น แปลงทุ่งทองคำ"
            />
          </Field>
          <Field label="จังหวัด">
            <select
              value={province}
              onChange={(event) => setProvince(event.target.value)}
              className={cn(INPUT_CLASS, 'cursor-pointer')}
            >
              {PROVINCES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <p className="mb-2 text-label-lg font-medium text-on-surface">
            ขนาดพื้นที่ <span className="text-primary">*</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'ไร่', value: rai, set: setRai, max: 500 },
              { label: 'งาน', value: ngan, set: setNgan, max: 3 },
              { label: 'ตารางวา', value: wa, set: setWa, max: 99 },
            ].map((field) => (
              <label key={field.label} className="flex flex-col gap-1">
                <span className="text-caption text-on-surface-variant">{field.label}</span>
                <input
                  type="number"
                  min={0}
                  max={field.max}
                  value={field.value}
                  onChange={(event) =>
                    field.set(Math.max(0, Math.min(field.max, Number(event.target.value) || 0)))
                  }
                  className="w-full rounded-md bg-surface-low px-3 py-2.5 text-title-md font-bold text-on-surface tabular-nums outline-none focus:bg-surface-lowest focus:ring-2 focus:ring-primary"
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-label-lg font-medium text-on-surface">สายพันธุ์ที่ปลูก</p>
          <div className="flex flex-wrap gap-2">
            {CULTIVARS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCultivarId(item.id)}
                aria-pressed={cultivarId === item.id}
                className={cn(
                  'cursor-pointer rounded-full px-3.5 py-1.5 text-label-md font-semibold transition-all duration-150 ease-tactile active:scale-[0.96]',
                  cultivarId === item.id
                    ? 'bg-secondary text-on-secondary shadow-sm'
                    : 'bg-surface-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="วันที่เริ่มปลูก">
            <input
              type="date"
              value={plantedOn}
              onChange={(event) => setPlantedOn(event.target.value)}
              className={cn(INPUT_CLASS, 'cursor-pointer')}
            />
          </Field>
          <Field label="ระบบให้น้ำ">
            <select
              value={irrigation}
              onChange={(event) => setIrrigation(event.target.value)}
              className={cn(INPUT_CLASS, 'cursor-pointer')}
            >
              {IRRIGATION.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
        </div>

        <section className="rounded-lg bg-mint-mist p-5">
          <h3 className="mb-3 flex items-center gap-1.5 text-label-lg font-bold text-on-surface">
            <Icon name="auto_awesome" size={16} className="text-secondary" />
            ระบบคำนวณให้อัตโนมัติ
          </h3>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'พื้นที่รวม', value: `${plan.sqm.toLocaleString('th-TH')} ตร.ม.`, tone: 'text-on-surface' },
              { label: 'จำนวนต้นกล้า', value: `${plan.plants.toLocaleString('th-TH')} ต้น`, tone: 'text-secondary' },
              {
                label: 'ผลผลิตคาดการณ์',
                value: `${plan.tonnesLow.toFixed(1)}–${plan.tonnesHigh.toFixed(1)} ตัน`,
                tone: 'text-primary',
              },
              { label: 'ต้นทุนเมล็ดพันธุ์', value: formatTHB(plan.seedCost), tone: 'text-on-surface' },
            ].map((item) => (
              <div key={item.label} className="rounded-md bg-surface-lowest p-3">
                <p className="text-caption text-on-surface-variant">{item.label}</p>
                <p className={cn('mt-0.5 text-label-lg font-bold tabular-nums', item.tone)}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-lowest p-3">
            <span className="flex items-center gap-2 text-body-md text-on-surface-variant">
              <Icon name="event_available" size={16} className="text-secondary" />
              คาดว่าเก็บเกี่ยวได้ <span className="font-bold text-on-surface">{harvestDate}</span>
              <Badge tone="outline">{cultivar.days} วัน</Badge>
            </span>
            <span className="text-body-md text-on-surface-variant">
              รายได้ขั้นต้น{' '}
              <span className="font-bold text-secondary tabular-nums">
                {formatTHBCompact(plan.grossLow)} – {formatTHBCompact(plan.grossHigh)}
              </span>
            </span>
          </div>
        </section>
      </div>
    </Modal>
  );
}
