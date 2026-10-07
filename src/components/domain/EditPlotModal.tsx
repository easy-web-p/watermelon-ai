import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Field, TextInput, INPUT_CLASS } from '../ui/Field';
import { CULTIVARS } from '../../data/cultivars';

export type PlotHealth = 'ดีเยี่ยม' | 'เฝ้าระวัง' | 'ต้องดูแลด่วน';

export type EditablePlot = {
  id: string;
  name: string;
  location: string;
  size: string;
  cultivar: string;
  stage: string;
  day: number;
  totalDays: number;
  health: PlotHealth;
  moisture: number;
  brix: number;
  expectedYield: string;
  harvest: string;
  alert?: string;
};

const STAGES = [
  'เตรียมดิน & เพาะกล้า',
  'ต้นกล้า & แตกใบ',
  'เลื้อยเถา',
  'ออกดอก & ผสมเกสร',
  'ติดผลอ่อน',
  'ขยายผล & สะสมแป้ง',
  'สะสมน้ำตาล (ใกล้เก็บเกี่ยว)',
  'เก็บเกี่ยวแล้ว',
];

const HEALTH_OPTIONS: PlotHealth[] = ['ดีเยี่ยม', 'เฝ้าระวัง', 'ต้องดูแลด่วน'];

export function EditPlotModal({
  open,
  plot,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  plot: EditablePlot | null;
  onClose: () => void;
  onSave: (updated: EditablePlot) => void;
  onDelete?: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [size, setSize] = useState('');
  const [cultivar, setCultivar] = useState('');
  const [stage, setStage] = useState('');
  const [day, setDay] = useState(1);
  const [totalDays, setTotalDays] = useState(65);
  const [health, setHealth] = useState<PlotHealth>('ดีเยี่ยม');
  const [moisture, setMoisture] = useState(65);
  const [brix, setBrix] = useState(0);
  const [expectedYield, setExpectedYield] = useState('');
  const [harvest, setHarvest] = useState('');
  const [alertText, setAlertText] = useState('');

  useEffect(() => {
    if (plot) {
      setName(plot.name);
      setLocation(plot.location);
      setSize(plot.size);
      setCultivar(plot.cultivar);
      setStage(plot.stage);
      setDay(plot.day);
      setTotalDays(plot.totalDays);
      setHealth(plot.health);
      setMoisture(plot.moisture);
      setBrix(plot.brix);
      setExpectedYield(plot.expectedYield);
      setHarvest(plot.harvest);
      setAlertText(plot.alert || '');
    }
  }, [plot]);

  if (!plot) return null;

  function handleSave() {
    if (!plot || !name.trim()) return;
    onSave({
      ...plot,
      name: name.trim(),
      location: location.trim(),
      size: size.trim(),
      cultivar,
      stage,
      day: Number(day) || 1,
      totalDays: Number(totalDays) || 65,
      health,
      moisture: Number(moisture) || 0,
      brix: Number(brix) || 0,
      expectedYield: expectedYield.trim(),
      harvest: harvest.trim(),
      alert: alertText.trim() ? alertText.trim() : undefined,
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="edit"
      title={`แก้ไขข้อมูล: ${plot.name}`}
      subtitle="ปรับปรุงสถานะการเจริญเติบโต ความชื้น หรือบันทึกการแจ้งเตือน"
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          {onDelete ? (
            <Button
              variant="quiet"
              size="sm"
              className="text-error hover:bg-error-container/20"
              onClick={() => {
                if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ "${plot.name}" ออกจากระบบ?`)) {
                  onDelete(plot.id);
                  onClose();
                }
              }}
            >
              <Icon name="delete" size={16} />
              ลบแปลงนี้
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="quiet" size="sm" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button size="sm" disabled={!name.trim()} onClick={handleSave}>
              <Icon name="check" size={16} />
              บันทึกการแก้ไข
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="ชื่อแปลง" required>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น แปลงที่ 1 ทุ่งเหนือ"
            />
          </Field>
          <Field label="สถานที่ตั้ง">
            <TextInput
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ต.สระกระโจม อ.ดอนเจดีย์ จ.สุพรรณบุรี"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="ขนาดพื้นที่">
            <TextInput
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="เช่น 5 ไร่"
            />
          </Field>
          <Field label="พันธุ์แตงโม">
            <select
              value={cultivar}
              onChange={(e) => setCultivar(e.target.value)}
              className={INPUT_CLASS}
            >
              {CULTIVARS.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} ({c.code})
                </option>
              ))}
              {!CULTIVARS.some((c) => c.name === cultivar) && cultivar && (
                <option value={cultivar}>{cultivar}</option>
              )}
            </select>
          </Field>
          <Field label="ระยะการเติบโต">
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className={INPUT_CLASS}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="อายุแปลง (วัน)">
            <TextInput
              type="number"
              min={1}
              max={120}
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
            />
          </Field>
          <Field label="ระยะเวลาปลูกทั้งหมด (วัน)">
            <TextInput
              type="number"
              min={30}
              max={150}
              value={totalDays}
              onChange={(e) => setTotalDays(Number(e.target.value))}
            />
          </Field>
          <Field label="สถานะสุขภาพแปลง">
            <select
              value={health}
              onChange={(e) => setHealth(e.target.value as PlotHealth)}
              className={INPUT_CLASS}
            >
              {HEALTH_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="ความชื้นดิน (%)">
            <TextInput
              type="number"
              min={0}
              max={100}
              value={moisture}
              onChange={(e) => setMoisture(Number(e.target.value))}
            />
          </Field>
          <Field label="ความหวาน Brix (°Bx)">
            <TextInput
              type="number"
              step="0.1"
              min={0}
              max={20}
              value={brix}
              onChange={(e) => setBrix(Number(e.target.value))}
            />
          </Field>
          <Field label="ผลผลิตคาดการณ์">
            <TextInput
              value={expectedYield}
              onChange={(e) => setExpectedYield(e.target.value)}
              placeholder="เช่น 18.0 ตัน"
            />
          </Field>
          <Field label="กำหนดเก็บเกี่ยว">
            <TextInput
              value={harvest}
              onChange={(e) => setHarvest(e.target.value)}
              placeholder="เช่น 15 มิ.ย. 2569"
            />
          </Field>
        </div>

        <Field label="ข้อความแจ้งเตือน (ปล่อยว่างหากไม่มีปัญหา)">
          <TextInput
            value={alertText}
            onChange={(e) => setAlertText(e.target.value)}
            placeholder="เช่น ความชื้นดินต่ำกว่าเกณฑ์ 11% — เพิ่มรอบน้ำอีก 1 รอบ/วัน"
          />
        </Field>
      </div>
    </Modal>
  );
}
