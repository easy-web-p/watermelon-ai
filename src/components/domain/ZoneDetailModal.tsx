import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { useRouter } from '../../lib/router';
import { useToast } from '../ui/Toast';

export type ZoneData = {
  index: number;
  name: string;
  status: string;
  warn: boolean;
  empty: boolean;
  moisture: number;
};

export function ZoneDetailModal({
  zone,
  plotName,
  open,
  onClose,
  onUpdateMoisture,
}: {
  zone: ZoneData | null;
  plotName: string;
  open: boolean;
  onClose: () => void;
  onUpdateMoisture?: (zoneIndex: number, newMoisture: number) => void;
}) {
  const { navigate } = useRouter();
  const toast = useToast();
  const [watering, setWatering] = useState(false);

  if (!zone) return null;

  const row = Math.floor(zone.index / 8) + 1;
  const col = (zone.index % 8) + 1;

  const currentZone = zone;

  function handleWaterZone() {
    if (!currentZone) return;
    setWatering(true);
    setTimeout(() => {
      setWatering(false);
      onUpdateMoisture?.(currentZone.index, 68);
      toast.success(`เปิดวาล์วน้ำหยด ${currentZone.name} แล้ว — ปรับความชื้นเป็น 68%`);
      onClose();
    }, 600);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="grid_view"
      title={`${zone.name} — ${plotName}`}
      subtitle={`แถวที่ ${row} ร่องที่ ${col} • พิกัดโซนเพาะปลูกย่อย`}
      size="md"
      footer={
        <>
          <Button variant="quiet" size="sm" onClick={onClose}>
            ปิด
          </Button>
          {!zone.empty && (
            <Button
              size="sm"
              disabled={watering}
              onClick={handleWaterZone}
            >
              <Icon name={watering ? 'progress_activity' : 'water_drop'} size={16} className={watering ? 'animate-spin' : undefined} />
              {watering ? 'กำลังเปิดน้ำ...' : 'เปิดน้ำหยดโซนนี้ (45 นาที)'}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-xl bg-surface-low p-4">
          <div className="flex items-center gap-2.5">
            <span
              className={`size-3.5 rounded-full ${
                zone.empty
                  ? 'bg-surface-highest'
                  : zone.warn
                    ? 'bg-primary animate-pulse'
                    : 'bg-secondary'
              }`}
            />
            <div>
              <p className="text-label-lg font-bold text-on-surface">
                {zone.empty ? 'พื้นที่ว่าง (ยังไม่ปลูก)' : zone.warn ? 'เฝ้าระวังความชื้นต่ำ' : 'สภาพปกติ สมบูรณ์ดี'}
              </p>
              <p className="text-caption text-on-surface-variant">
                {zone.empty ? 'เตรียมดินสำหรับรอบถัดไป' : 'ต้นแตงโมอายุ 28 วัน • จำนวน 35 ต้น'}
              </p>
            </div>
          </div>
          <Badge tone={zone.empty ? 'neutral' : zone.warn ? 'primary' : 'secondary'}>
            {zone.status}
          </Badge>
        </div>

        {!zone.empty && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-surface-low p-3">
                <p className="flex items-center gap-1 text-caption text-on-surface-variant">
                  <Icon name="water_drop" size={14} className={zone.warn ? 'text-primary' : 'text-secondary'} />
                  ความชื้นดิน
                </p>
                <p className={`mt-1 text-label-lg font-bold ${zone.warn ? 'text-primary' : 'text-secondary'}`}>
                  {zone.moisture}%
                </p>
              </div>
              <div className="rounded-lg bg-surface-low p-3">
                <p className="flex items-center gap-1 text-caption text-on-surface-variant">
                  <Icon name="thermostat" size={14} className="text-amber-600" />
                  อุณหภูมิดิน
                </p>
                <p className="mt-1 text-label-lg font-bold text-on-surface">29.4°C</p>
              </div>
              <div className="rounded-lg bg-surface-low p-3">
                <p className="flex items-center gap-1 text-caption text-on-surface-variant">
                  <Icon name="bolt" size={14} className="text-tertiary" />
                  EC ในดิน
                </p>
                <p className="mt-1 text-label-lg font-bold text-on-surface">1.2 mS/cm</p>
              </div>
              <div className="rounded-lg bg-surface-low p-3">
                <p className="flex items-center gap-1 text-caption text-on-surface-variant">
                  <Icon name="wb_sunny" size={14} className="text-amber-500" />
                  แสงแดด
                </p>
                <p className="mt-1 text-label-lg font-bold text-on-surface">UV 9 จัด</p>
              </div>
            </div>

            <div className="rounded-xl border border-outline-variant/30 bg-surface-low/60 p-4">
              <div className="flex items-start gap-2.5">
                <Icon name="tips_and_updates" size={20} className="mt-0.5 shrink-0 text-primary" />
                <div className="text-body-sm text-on-surface-variant">
                  <p className="font-bold text-on-surface">คำแนะนำเฉพาะโซนนี้:</p>
                  <p className="mt-1">
                    {zone.warn
                      ? 'โซนนี้อยู่บริเวณปลายสายน้ำหยด แรงดันน้ำอาจตก แนะนำให้ตรวจสอบหัวน้ำหยดว่ามีตะกอนอุดตันหรือไม่ และเปิดวาล์วเฉพาะโซนเพิ่มอีก 15–30 นาที'
                      : 'ความชื้นและสภาพแวดล้อมเหมาะสมกับการเจริญเติบโต ให้รักษารอบการให้น้ำตามเวลาปกติช่วง 06:30 น.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate('/disease-scan');
                }}
              >
                <Icon name="biotech" size={16} />
                สแกนโรคใบเฉพาะโซนนี้
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate(`/chat?q=${encodeURIComponent(`ขอคำแนะนำการดูแลแปลง ${plotName} โซน ${zone.name} ความชื้น ${zone.moisture}% ครับ`)}`);
                }}
              >
                <Icon name="forum" size={16} />
                ปรึกษา AI เกี่ยวกับโซนนี้
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
