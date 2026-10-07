import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Field, TextInput, INPUT_CLASS } from '../ui/Field';

export type ActivityType =
  | 'ให้น้ำ'
  | 'ใส่ปุ๋ย'
  | 'พ่นสารป้องกัน/กำจัด'
  | 'วัดความหวาน Brix'
  | 'ผสมเกสร/ตัดแต่ง'
  | 'กำจัดวัชพืช'
  | 'เก็บเกี่ยว'
  | 'อื่น ๆ';

export type FarmActivity = {
  id: string;
  plotId: string;
  type: ActivityType;
  title: string;
  detail: string;
  timestamp: string;
  cost?: number;
  operator?: string;
};

const ACTIVITY_TYPES: { type: ActivityType; icon: string }[] = [
  { type: 'ให้น้ำ', icon: 'water_drop' },
  { type: 'ใส่ปุ๋ย', icon: 'science' },
  { type: 'พ่นสารป้องกัน/กำจัด', icon: 'pest_control' },
  { type: 'วัดความหวาน Brix', icon: 'speed' },
  { type: 'ผสมเกสร/ตัดแต่ง', icon: 'content_cut' },
  { type: 'กำจัดวัชพืช', icon: 'grass' },
  { type: 'เก็บเกี่ยว', icon: 'local_shipping' },
  { type: 'อื่น ๆ', icon: 'assignment' },
];

export function AddActivityModal({
  open,
  plotId,
  plotName,
  onClose,
  onAdd,
}: {
  open: boolean;
  plotId: string;
  plotName: string;
  onClose: () => void;
  onAdd: (activity: FarmActivity) => void;
}) {
  const [type, setType] = useState<ActivityType>('ให้น้ำ');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cost, setCost] = useState<string>('');
  const [operator, setOperator] = useState('');

  function handleSubmit() {
    if (!title.trim()) return;
    const newActivity: FarmActivity = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      plotId,
      type,
      title: title.trim(),
      detail: detail.trim(),
      timestamp: new Date(date).toISOString(),
      cost: cost ? parseFloat(cost) : undefined,
      operator: operator.trim() || undefined,
    };
    onAdd(newActivity);
    setTitle('');
    setDetail('');
    setCost('');
    setOperator('');
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="post_add"
      title="บันทึกกิจกรรมประจำแปลง"
      subtitle={`แปลง: ${plotName} • บันทึกการจัดการตามมาตรฐาน GAP`}
      size="md"
      footer={
        <>
          <Button variant="quiet" size="sm" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button size="sm" disabled={!title.trim()} onClick={handleSubmit}>
            <Icon name="check" size={16} />
            บันทึกกิจกรรม
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-label-lg font-medium text-on-surface">
            ประเภทกิจกรรม <span className="text-primary">*</span>
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ACTIVITY_TYPES.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => {
                  setType(item.type);
                  if (!title) {
                    if (item.type === 'ให้น้ำ') setTitle('เปิดน้ำหยด 45 นาที');
                    else if (item.type === 'ใส่ปุ๋ย') setTitle('ให้ปุ๋ยทางระบบน้ำ');
                    else if (item.type === 'พ่นสารป้องกัน/กำจัด') setTitle('พ่นป้องกันเชื้อรา/แมลง');
                    else if (item.type === 'วัดความหวาน Brix') setTitle('สุ่มวัดค่าความหวาน Brix');
                  }
                }}
                className={`flex items-center gap-1.5 rounded-lg border p-2 text-xs font-semibold transition-all ${
                  type === item.type
                    ? 'border-secondary bg-mint-mist text-secondary'
                    : 'border-outline-variant/40 bg-surface-lowest text-on-surface hover:bg-surface-low'
                }`}
              >
                <Icon name={item.icon} size={16} />
                <span className="truncate">{item.type}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="วันที่ทำรายการ" required>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="ผู้ปฏิบัติงาน">
            <TextInput
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              placeholder="เช่น ลุงสมหมาย หรือ ทีมงาน"
            />
          </Field>
        </div>

        <Field label="หัวข้อกิจกรรม" required>
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น ให้น้ำหยดช่วงเช้า 45 นาที + ผสมปุ๋ย 15-0-0"
          />
        </Field>

        <Field label="รายละเอียด / อัตราใช้ / ข้อสังเกต">
          <textarea
            rows={3}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="เช่น ผสมปุ๋ยอัตรา 2 กก./ไร่, ตรวจสภาพหัวน้ำหยดไม่มีการอุดตัน, โซน A-3 ดินชุ่มดี"
            className={INPUT_CLASS}
          />
        </Field>

        <Field label="ค่าใช้จ่าย (บาท, ถ้ามี)">
          <TextInput
            type="number"
            min={0}
            step="10"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="เช่น 350"
          />
        </Field>
      </div>
    </Modal>
  );
}
