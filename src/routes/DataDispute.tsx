import { useState } from 'react';
import { AppShell, PageContainer, PageHeading } from '../components/layout/AppShell';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Field, TextInput, INPUT_CLASS } from '../components/ui/Field';
import { useToast } from '../components/ui/Toast';
import { useRouter } from '../lib/router';
import { cn } from '../lib/cn';
import { api } from '../lib/api';
import { DISEASES } from '../data/diseases';

type Reason = 'wrong-disease' | 'wrong-severity' | 'wrong-treatment' | 'other';

const REASONS: readonly { id: Reason; icon: string; title: string; body: string }[] = [
  {
    id: 'wrong-disease',
    icon: 'bug_report',
    title: 'AI ระบุชื่อโรคผิด',
    body: 'ผลวินิจฉัยไม่ตรงกับโรคที่พบจริงในแปลง',
  },
  {
    id: 'wrong-severity',
    icon: 'speed',
    title: 'ประเมินระดับความรุนแรงคลาดเคลื่อน',
    body: 'ความรุนแรงจริงสูงหรือต่ำกว่าที่ระบบแจ้ง',
  },
  {
    id: 'wrong-treatment',
    icon: 'medication',
    title: 'คำแนะนำการรักษาไม่เหมาะสม',
    body: 'สารที่แนะนำใช้ไม่ได้ผล หรือไม่เหมาะกับบริบทแปลง',
  },
  {
    id: 'other',
    icon: 'more_horiz',
    title: 'เรื่องอื่น ๆ',
    body: 'ข้อมูลราคาตลาด คู่มือปลูก หรือเนื้อหาอื่นที่คลาดเคลื่อน',
  },
];

const PAST_REPORTS = [
  {
    id: 'DR-2026-0087',
    date: '18 ก.ย. 2569',
    subject: 'ระบุเป็นราแป้ง แต่จริงเป็นเพลี้ยไฟ',
    status: 'แก้ไขแล้ว' as const,
    note: 'ทีมวิชาการยืนยันและปรับน้ำหนักโมเดลในรุ่น v2.4',
  },
  {
    id: 'DR-2026-0061',
    date: '2 ส.ค. 2569',
    subject: 'อัตราผสมไตรโคเดอร์มาสูงเกินคำแนะนำกรมวิชาการ',
    status: 'แก้ไขแล้ว' as const,
    note: 'ปรับข้อมูลอัตราผสมในฐานข้อมูลสารแล้ว',
  },
  {
    id: 'DR-2026-0104',
    date: '28 ก.ย. 2569',
    subject: 'ราคาตลาดศรีเมืองไม่ตรงกับหน้าลานจริง',
    status: 'กำลังตรวจสอบ' as const,
    note: 'รอยืนยันข้อมูลจากสหกรณ์ต้นทาง',
  },
];

const STATUS_TONE = {
  แก้ไขแล้ว: 'secondary',
  กำลังตรวจสอบ: 'primary',
} as const;

export function DataDispute() {
  const [reason, setReason] = useState<Reason>('wrong-disease');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const toast = useToast();
  const { navigate } = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);

    try {
      const result = await api.submitReport({
        category: reason,
        scanId: form.get('scanId') ?? '',
        aiLabel: form.get('aiLabel') ?? '',
        actualLabel: form.get('actualLabel') ?? '',
        description: form.get('description') ?? '',
        verifiedBy: form.get('verifiedBy') ?? '',
        submittedAt: new Date().toISOString(),
      });
      setTicketId(result.reportId ?? result.id ?? `DR-${Date.now().toString().slice(-6)}`);
      setSubmitted(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ส่งเรื่องไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageContainer className="max-w-5xl">
        <PageHeading
          eyebrow={
            <Badge tone="secondary">
              <Icon name="policy" size={14} />
              สิทธิ์แก้ไขข้อมูลตาม PDPA มาตรา 35
            </Badge>
          }
          title="แจ้งข้อมูล AI คลาดเคลื่อน"
          description="หากผลวิเคราะห์ของ AI ไม่ตรงกับสิ่งที่พบจริงในแปลง แจ้งเราได้ที่นี่ ทีมนักวิชาการจะตรวจสอบและปรับปรุงโมเดลให้แม่นยำขึ้น"
        />

        {submitted ? (
          <Card className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-secondary-container">
              <Icon name="check" size={36} className="text-secondary" />
            </span>
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface">ได้รับเรื่องของคุณแล้ว</h2>
              <p className="mx-auto mt-2 max-w-md text-body-md text-on-surface-variant">
                เลขที่เรื่อง <span className="font-mono font-bold text-on-surface">{ticketId}</span> —
                ทีมนักวิชาการจะตรวจสอบและแจ้งผลกลับภายใน 3 วันทำการ ผ่าน LINE และอีเมลของคุณ
              </p>
            </div>
            <Button variant="ghost" onClick={() => setSubmitted(false)}>
              แจ้งเรื่องอื่นเพิ่มเติม
            </Button>
          </Card>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Card>
              <CardHeader
                icon="report_problem"
                title="เรื่องที่ต้องการแจ้ง"
                subtitle="เลือกประเภทของข้อมูลที่คลาดเคลื่อน เพื่อส่งต่อให้ทีมที่เกี่ยวข้องโดยตรง"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {REASONS.map((item) => (
                  <label
                    key={item.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-md p-4 transition-all',
                      reason === item.id
                        ? 'bg-melon-tint ring-2 ring-primary'
                        : 'bg-surface-low hover:bg-surface-container',
                    )}
                  >
                    <input
                      type="radio"
                      name="dispute-reason"
                      checked={reason === item.id}
                      onChange={() => setReason(item.id)}
                      className="mt-0.5 size-5 shrink-0 accent-[#ba0035]"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-label-lg font-bold text-on-surface">
                        <Icon name={item.icon} size={16} className="text-primary" />
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-caption text-on-surface-variant">{item.body}</span>
                    </span>
                  </label>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader icon="edit_note" iconTone="secondary" title="รายละเอียดของเรื่อง" />
              <div className="flex flex-col gap-4">
                <Field label="รหัสผลวิเคราะห์ (ถ้ามี)" hint="พบได้ที่มุมล่างของการ์ดผลวินิจฉัยในหน้าแชท">
                  <TextInput name="scanId" placeholder="เช่น SCAN-2026-48219" />
                </Field>

                {reason === 'wrong-disease' ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="AI วินิจฉัยว่าเป็น" required>
                      <select name="aiLabel" className={cn(INPUT_CLASS, 'cursor-pointer')}>
                        {DISEASES.map((disease) => (
                          <option key={disease.id}>{disease.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="แต่จริง ๆ แล้วเป็น" required>
                      <select name="actualLabel" className={cn(INPUT_CLASS, 'cursor-pointer')}>
                        {DISEASES.map((disease) => (
                          <option key={disease.id}>{disease.name}</option>
                        ))}
                        <option>อื่น ๆ (ระบุในรายละเอียด)</option>
                      </select>
                    </Field>
                  </div>
                ) : null}

                <Field
                  label="อธิบายสิ่งที่พบจริงในแปลง"
                  required
                  hint="ยิ่งละเอียด ยิ่งช่วยให้ทีมตรวจสอบได้เร็วขึ้น เช่น อาการที่เห็น ช่วงเวลาที่พบ สภาพอากาศ"
                >
                  <textarea
                    name="description"
                    rows={5}
                    required
                    placeholder="เช่น ระบบแจ้งว่าเป็นราแป้ง แต่เมื่อนักวิชาการมาตรวจพบว่าเป็นรอยขูดจากเพลี้ยไฟ ใต้ใบไม่มีขุยราเลย..."
                    className={cn(INPUT_CLASS, 'resize-none rounded-lg')}
                  />
                </Field>

                <Field label="แนบภาพประกอบเพิ่มเติม" hint="รองรับ JPG, PNG สูงสุด 5 ไฟล์">
                  <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-primary/30 py-8 text-center transition-colors hover:border-primary">
                    <Icon name="add_photo_alternate" size={28} className="text-primary" />
                    <span className="text-body-md text-on-surface-variant">คลิกเพื่อเลือกไฟล์ หรือลากมาวางที่นี่</span>
                  </div>
                </Field>

                <Field label="ผู้ตรวจสอบยืนยัน (ถ้ามี)" hint="ชื่อนักวิชาการเกษตรหรือเจ้าหน้าที่ที่ยืนยันอาการจริง">
                  <TextInput name="verifiedBy" placeholder="เช่น นักวิชาการเกษตรประจำ อ.ดอนเจดีย์" />
                </Field>
              </div>
            </Card>

            <Card className="bg-surface-low">
              <div className="flex items-start gap-3">
                <Icon name="gavel" size={22} className="mt-0.5 shrink-0 text-secondary" />
                <div>
                  <p className="text-label-lg font-bold text-on-surface">สิทธิ์ของคุณตามกฎหมาย</p>
                  <p className="mt-1 max-w-[75ch] text-body-md text-on-surface-variant">
                    ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 มาตรา 35 คุณมีสิทธิ์ขอให้แก้ไขข้อมูลที่ไม่ถูกต้อง
                    ไม่เป็นปัจจุบัน หรืออาจก่อให้เกิดความเข้าใจผิด เราจะดำเนินการตรวจสอบและแจ้งผลภายใน 30 วัน
                    หากปฏิเสธคำขอ เราจะบันทึกเหตุผลและแจ้งให้คุณทราบเป็นลายลักษณ์อักษร
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="quiet" size="lg" onClick={() => navigate('/chat')}>
                ยกเลิก
              </Button>
              <Button type="submit" size="lg" disabled={busy}>
                <Icon
                  name={busy ? 'progress_activity' : 'send'}
                  size={20}
                  className={busy ? 'animate-spin' : undefined}
                />
                {busy ? 'กำลังส่ง...' : 'ส่งเรื่องให้ทีมตรวจสอบ'}
              </Button>
            </div>
          </form>
        )}

        <Card className="mt-6">
          <CardHeader
            icon="history"
            title="ประวัติการแจ้งของคุณ"
            subtitle={`${PAST_REPORTS.length} เรื่องที่เคยแจ้งไว้`}
          />
          <div className="flex flex-col gap-3">
            {PAST_REPORTS.map((report) => (
              <div key={report.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md bg-surface-low p-4">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-caption font-bold text-on-surface-variant">{report.id}</span>
                    <span className="text-caption text-on-surface-variant">{report.date}</span>
                  </p>
                  <p className="mt-1 text-label-lg font-semibold text-on-surface">{report.subject}</p>
                  <p className="mt-0.5 text-caption text-on-surface-variant">{report.note}</p>
                </div>
                <Badge tone={STATUS_TONE[report.status]}>{report.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </PageContainer>
    </AppShell>
  );
}
