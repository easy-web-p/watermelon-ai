import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { useRouter } from '../../lib/router';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/cn';

export type ActionPlanItem = {
  id: string;
  title: string;
  desc: string;
  urgent?: boolean;
};

export function ActionPlanModal({
  open,
  onClose,
  plotName,
  alertMessage,
  onResolveAlert,
  onLogActivity,
}: {
  open: boolean;
  onClose: () => void;
  plotName: string;
  alertMessage?: string;
  onResolveAlert?: () => void;
  onLogActivity?: (title: string, detail: string) => void;
}) {
  const { navigate } = useRouter();
  const toast = useToast();

  const isDisease = alertMessage?.includes('ราน้ำค้าง') || alertMessage?.includes('โรค');

  const defaultSteps: ActionPlanItem[] = isDisease
    ? [
        {
          id: 'step-1',
          title: '1. เก็บใบที่แสดงอาการออกนอกแปลงทันที',
          desc: 'ใส่ถุงพลาสติกปิดมิดชิด นำไปฝังกลบหรือทำลายนอกแปลง อย่าทิ้งไว้ตามร่องแปลงเพราะสปอร์จะปลิวแพร่ระบาด',
          urgent: true,
        },
        {
          id: 'step-2',
          title: '2. พ่นสารควบคุมเชื้อรากลุ่มเฉพาะเจาะจง',
          desc: 'ใช้ไดเมโทมอร์ฟ (Dimethomorph) 50% WDG อัตรา 10-20 กรัม/น้ำ 20 ลิตร หรือชีวภัณฑ์ไตรโคเดอร์มาช่วงเย็น',
          urgent: true,
        },
        {
          id: 'step-3',
          title: '3. ปรับสภาพแวดล้อม ลดความชื้นสะสม',
          desc: 'งดการให้น้ำสปริงเกอร์ใบช่วงเย็น เปิดร่องระบายน้ำอย่าให้น้ำขัง และตัดแต่งเถาแน่นทึบให้อากาศถ่ายเท',
        },
        {
          id: 'step-4',
          title: '4. ถ่ายภาพสแกนติดตามอาการซ้ำใน 48 ชม.',
          desc: 'ใช้ฟังก์ชันตรวจโรคใบ AI สแกนโซนเดิมซ้ำเพื่อประเมินว่ารอยโรคหยุดลุกลามหรือไม่',
        },
      ]
    : [
        {
          id: 'step-1',
          title: '1. เพิ่มรอบการให้น้ำหยดรอบพิเศษ',
          desc: 'เปิดระบบน้ำหยดช่วงเช้าตรู่ (06:00 - 07:30 น.) เพิ่มอีก 40-45 นาที เพื่อชดเชยการคายน้ำในวันที่แดดจัด',
          urgent: true,
        },
        {
          id: 'step-2',
          title: '2. ตรวจสอบแรงดันและสายน้ำหยด',
          desc: 'ตรวจเช็กหัวน้ำหยดในโซนที่แจ้งเตือนว่ามีตะกอนอุดตันหรือท่อหลุดรั่วหรือไม่',
          urgent: false,
        },
        {
          id: 'step-3',
          title: '3. เสริมธาตุแคลเซียม-โบรอน ป้องกันก้นผลเน่า',
          desc: 'แตงโมขาดน้ำช่วงติดผลอาจเกิดอาการก้นเน่า (Blossom End Rot) ควรให้แคลเซียมคีเลตทางใบเสริม',
        },
        {
          id: 'step-4',
          title: '4. ตรวจวัดค่าความชื้นดินซ้ำหลังให้น้ำ 3 ชม.',
          desc: 'ค่าความชื้นเป้าหมายสำหรับช่วงนี้ควรอยู่ที่ 65% - 75% ที่ระดับความลึกดิน 15-20 ซม.',
        },
      ];

  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  function toggleStep(id: string) {
    setCompleted((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const allDone = defaultSteps.every((s) => completed[s.id]);

  function handleMarkResolved() {
    onResolveAlert?.();
    onLogActivity?.(
      `ดำเนินการแก้ไขปัญหา: ${plotName}`,
      `ทำตามแผนจัดการสำเร็จครบทุกขั้นตอน (${alertMessage})`,
    );
    toast.success(`อัปเดตสถานะแปลง "${plotName}" เป็นปกติแล้ว`);
    onClose();
  }

  function handleConsultChat() {
    onClose();
    navigate(
      `/chat?q=${encodeURIComponent(
        `แปลง "${plotName}": แจ้งเตือนว่า "${alertMessage || ''}" ช่วยแนะนำแผนรับมือและสูตรจัดการเพิ่มเติมอย่างละเอียด`,
      )}`,
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="assignment_late"
      title={`แผนจัดการเร่งด่วน: ${plotName}`}
      subtitle="ขั้นตอนการแก้ไขปัญหาตามหลักวิชาการเกษตรแม่นยำและการวิเคราะห์ของ AI"
      size="lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={handleConsultChat}>
            <Icon name="smart_toy" size={16} className="text-secondary" />
            ปรึกษา AI เพิ่มเติม
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="quiet" size="sm" onClick={onClose}>
              ปิด
            </Button>
            <Button
              size="sm"
              variant={allDone ? 'primary' : 'secondary'}
              onClick={handleMarkResolved}
            >
              <Icon name="check_circle" size={16} />
              {allDone ? 'บันทึกว่าแก้ไขเสร็จสิ้น' : 'ทำเครื่องหมายว่าแก้ไขแล้ว'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Warning Banner */}
        <div className="rounded-xl border border-primary/20 bg-melon-tint p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon name="warning" size={22} />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-label-lg font-bold text-on-surface">ประเด็นที่พบในแปลง</h4>
                <Badge tone="primary">เร่งด่วน</Badge>
              </div>
              <p className="mt-1 text-body-md text-on-surface">{alertMessage || 'ตรวจพบความผิดปกติในโซนเพาะปลูก'}</p>
              <p className="mt-1.5 text-caption text-on-surface-variant">
                วิเคราะห์โดย Watermelon Precision AI • แนะนำให้ดำเนินการภายใน 24-48 ชม. เพื่อไม่ให้กระทบคุณภาพและผลผลิต
              </p>
            </div>
          </div>
        </div>

        {/* Action Checklist */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h5 className="flex items-center gap-1.5 text-label-lg font-bold text-on-surface">
              <Icon name="checklist" size={18} className="text-secondary" />
              รายการปฏิบัติการที่ต้องทำ ({Object.values(completed).filter(Boolean).length}/{defaultSteps.length})
            </h5>
            <span className="text-caption text-on-surface-variant">คลิกที่รายการเมื่อทำเสร็จ</span>
          </div>

          <div className="space-y-2.5">
            {defaultSteps.map((step) => {
              const isDone = !!completed[step.id];
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => toggleStep(step.id)}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-3 rounded-xl p-3.5 text-left transition-all',
                    isDone
                      ? 'border border-secondary/30 bg-mint-mist/40 text-on-surface opacity-80'
                      : 'border border-outline-variant/30 bg-surface-low hover:bg-surface-container',
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    <span
                      className={cn(
                        'flex size-5 items-center justify-center rounded-md border text-xs transition-colors',
                        isDone
                          ? 'border-secondary bg-secondary text-on-secondary'
                          : 'border-outline-variant bg-surface-lowest text-transparent hover:border-secondary',
                      )}
                    >
                      <Icon name="check" size={14} className={isDone ? 'block' : 'hidden'} />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          'text-label-md font-bold',
                          isDone ? 'line-through text-on-surface-variant' : 'text-on-surface',
                        )}
                      >
                        {step.title}
                      </p>
                      {step.urgent && !isDone && (
                        <Badge tone="primary" className="text-[10px] py-0 px-1.5">
                          ด่วน
                        </Badge>
                      )}
                    </div>
                    <p className={cn('mt-0.5 text-caption', isDone ? 'text-on-surface-variant/70' : 'text-on-surface-variant')}>
                      {step.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Technical Guidance Note */}
        <div className="rounded-xl bg-surface-low p-3.5 text-caption text-on-surface-variant">
          <div className="flex items-center gap-2 font-semibold text-on-surface">
            <Icon name="info" size={16} className="text-tertiary" />
            ข้อแนะนำการปฏิบัติตามมาตรฐาน GAP
          </div>
          <p className="mt-1 leading-relaxed">
            หากจำเป็นต้องใช้สารเคมีเกษตร ให้จดบันทึกวันเวลาและสารที่ใช้ลงในสมุดบันทึกแปลงเสมอ และตรวจสอบระยะปลอดภัยก่อนเก็บเกี่ยว (PHI) ก่อนการเก็บเกี่ยวอย่างน้อย 7-14 วัน
          </p>
        </div>
      </div>
    </Modal>
  );
}
