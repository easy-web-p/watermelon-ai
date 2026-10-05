import { useState } from 'react';
import { AppShell, PageContainer, PageHeading } from '../components/layout/AppShell';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Field, TextInput, INPUT_CLASS } from '../components/ui/Field';
import { useToast } from '../components/ui/Toast';
import { cn } from '../lib/cn';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';

type RequestType = 'access' | 'portability' | 'erasure' | 'restriction' | 'rectification';

const REQUEST_TYPES: readonly {
  id: RequestType;
  title: string;
  section: string;
  description: string;
  icon: string;
}[] = [
  {
    id: 'access',
    title: 'ขอเข้าถึงและรับสำเนาข้อมูล',
    section: 'มาตรา 30',
    description: 'ขอรับสำเนาข้อมูลส่วนบุคคลของท่านที่ระบบจัดเก็บไว้ทั้งหมด',
    icon: 'folder_shared',
  },
  {
    id: 'portability',
    title: 'ขอถ่ายโอนข้อมูลส่วนบุคคล',
    section: 'มาตรา 31',
    description: 'ขอรับข้อมูลในรูปแบบที่สามารถอ่านหรือใช้งานได้โดยทั่วไป (JSON/CSV)',
    icon: 'file_download',
  },
  {
    id: 'rectification',
    title: 'ขอแก้ไขข้อมูลให้ถูกต้อง',
    section: 'มาตรา 35',
    description: 'แก้ไขข้อมูลส่วนบุคคล เช่น ชื่อ เบอร์โทรศัพท์ หรือที่อยู่แปลงปลูก',
    icon: 'edit_note',
  },
  {
    id: 'restriction',
    title: 'ขอระงับการประมวลผลข้อมูล',
    section: 'มาตรา 34',
    description: 'ขอให้ระงับการใช้ข้อมูลส่วนบุคคลชั่วคราวระหว่างการตรวจสอบ',
    icon: 'pause_circle',
  },
  {
    id: 'erasure',
    title: 'ขอลบหรือทำลายข้อมูล (Right to be Forgotten)',
    section: 'มาตรา 33',
    description: 'ขอลบบัญชี ประวัติการแชท และภาพถ่ายแปลงทั้งหมดออกจากระบบอย่างถาวร',
    icon: 'delete_forever',
  },
];

const MOCK_REQUESTS = [
  {
    id: 'REQ-PDPA-2026-0042',
    type: 'ขอรับสำเนาข้อมูล (ม.30)',
    submittedAt: '3 ต.ค. 2569',
    status: 'เสร็จสมบูรณ์',
    note: 'ส่งลิงก์ดาวน์โหลดสำเนาข้อมูลทาง SMS เรียบร้อยแล้ว',
  },
  {
    id: 'REQ-PDPA-2026-0019',
    type: 'ขอระงับการนำภาพไปฝึก AI (ม.34)',
    submittedAt: '15 ส.ค. 2569',
    status: 'เสร็จสมบูรณ์',
    note: 'ปรับสถานะความยินยอมในฐานข้อมูลเรียบร้อยแล้ว',
  },
];

export function PrivacyRequests() {
  const [selectedType, setSelectedType] = useState<RequestType>('access');
  const [details, setDetails] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [exporting, setExporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const user = useAuth((state) => state.user);

  async function handleExportData() {
    setExporting(true);
    try {
      const data = await api.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `watermelon-ai-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('ดาวน์โหลดสำเนาข้อมูลส่วนบุคคลสำเร็จ');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'ไม่สามารถดาวน์โหลดข้อมูลได้');
    } finally {
      setExporting(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!details.trim()) {
      toast.error('กรุณาระบุรายละเอียดคำร้อง');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setDetails('');
      toast.success('ยื่นคำร้องตามสิทธิ์ PDPA เรียบร้อยแล้ว เจ้าหน้าที่จะดำเนินการภายใน 30 วัน');
    }, 800);
  }

  return (
    <AppShell>
      <PageContainer>
        <PageHeading
          eyebrow={
            <>
              <Badge tone="secondary">PDPA COMPLIANCE</Badge>
              <span className="text-caption text-on-surface-variant">
                พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
              </span>
            </>
          }
          title="คำร้องขอใช้สิทธิของเจ้าของข้อมูลส่วนบุคคล"
          description="ท่านสามารถยื่นคำขอเข้าถึง โอนย้าย แก้ไข ระงับ หรือลบข้อมูลส่วนบุคคลตามกฎหมายได้ที่หน้านี้"
          actions={
            <Button
              variant="tonal"
              size="sm"
              onClick={handleExportData}
              disabled={exporting}
            >
              <Icon name="download" size={18} />
              {exporting ? 'กำลังรวบรวมข้อมูล...' : 'ส่งออกสำเนาข้อมูลทันที'}
            </Button>
          }
        />

        {/* Notice differentiating AI Model Dispute from PDPA Subject Rights */}
        <div className="mb-6 rounded-xl border border-secondary/30 bg-mint-mist/50 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
              <Icon name="info" size={20} />
            </span>
            <div className="text-body-md">
              <p className="font-bold text-on-surface">
                ต้องการรายงานผลวินิจฉัยโรคหรือความหวานของ AI คลาดเคลื่อนใช่หรือไม่?
              </p>
              <p className="mt-1 text-on-surface-variant text-caption sm:text-body-sm">
                หากท่านพบว่า AI ระบุชื่อโรคผิด อัตราปุ๋ยยาคลาดเคลื่อน หรือผลเคาะไม่ตรงกับความเป็นจริง กรุณาไปที่หน้า{' '}
                <a
                  href="#/data-dispute"
                  className="font-bold text-primary underline underline-offset-2 hover:text-primary-dark"
                >
                  แจ้งข้อโต้แย้งผล AI (/data-dispute)
                </a>{' '}
                ซึ่งเป็นกระบวนการตรวจสอบทางวิชาการและปรับเทียบโมเดลโดยเฉพาะ
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Submit Request Form */}
          <div className="flex flex-col gap-5 lg:col-span-7">
            <Card className="flex flex-col gap-4">
              <CardHeader
                icon="assignment"
                title="ยื่นคำร้องขอใช้สิทธิ"
                subtitle="เจ้าหน้าที่จะตรวจสอบตัวตนและแจ้งผลการดำเนินการภายในระยะเวลาที่กฎหมายกำหนด (ไม่เกิน 30 วัน)"
              />

              <div>
                <label className="text-label-md font-semibold text-on-surface">
                  เลือกสิทธิที่ต้องการใช้
                </label>
                <div className="mt-2 flex flex-col gap-2">
                  {REQUEST_TYPES.map((req) => (
                    <button
                      key={req.id}
                      type="button"
                      onClick={() => setSelectedType(req.id)}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all',
                        selectedType === req.id
                          ? 'border-secondary bg-mint-mist ring-1 ring-secondary'
                          : 'border-outline-variant/30 bg-surface-low hover:bg-surface-container',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                          selectedType === req.id
                            ? 'bg-secondary text-on-secondary'
                            : 'bg-surface-highest text-on-surface-variant',
                        )}
                      >
                        <Icon name={req.icon} size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-label-lg font-bold text-on-surface">{req.title}</p>
                          <span className="rounded-full bg-surface-lowest px-2 py-0.5 text-caption font-semibold text-on-surface-variant">
                            {req.section}
                          </span>
                        </div>
                        <p className="mt-0.5 text-caption text-on-surface-variant">
                          {req.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
                <Field label="หมายเลขโทรศัพท์หรืออีเมลสำหรับติดต่อกลับ" required>
                  <TextInput
                    type="text"
                    value={contactPhone || user?.phone || ''}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                  />
                </Field>

                <Field label="รายละเอียดและเหตุผลในการขอใช้สิทธิ" required>
                  <textarea
                    rows={4}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="กรุณาระบุข้อมูลที่ท่านประสงค์จะให้ดำเนินการ เช่น ขอลบประวัติภาพถ่ายแปลงที่ 2 หรือขอสำเนาบันทึกการใช้งานทั้งหมด..."
                    className={cn(INPUT_CLASS, 'resize-none')}
                  />
                </Field>

                <div className="rounded-lg bg-surface-low p-3 text-caption text-on-surface-variant">
                  <p className="font-semibold text-on-surface">ข้อกำหนดการรักษาความปลอดภัย:</p>
                  <p className="mt-0.5">
                    เพื่อป้องกันการสวมสิทธิ บริษัทอาจติดต่อกลับเพื่อขอหลักฐานยืนยันตัวตนเพิ่มเติมก่อนดำเนินการลบหรือเปิดเผยข้อมูลที่มีความละเอียดอ่อน
                  </p>
                </div>

                <Button
                  type="submit"
                  size="md"
                  disabled={submitting}
                  className="mt-1 w-full justify-center"
                >
                  <Icon name="send" size={18} />
                  {submitting ? 'กำลังส่งคำร้อง...' : 'ส่งคำร้องขอใช้สิทธิ'}
                </Button>
              </form>
            </Card>
          </div>

          {/* Right Column: Request History & Quick Rights Actions */}
          <div className="flex flex-col gap-5 lg:col-span-5">
            <Card className="flex flex-col gap-4">
              <CardHeader
                icon="history"
                title="ประวัติคำร้องของฉัน"
                subtitle="สถานะคำร้องที่ท่านเคยยื่นไว้ก่อนหน้านี้"
              />

              <div className="flex flex-col gap-3">
                {MOCK_REQUESTS.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-1.5 rounded-xl border border-outline-variant/30 bg-surface-low p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-caption text-on-surface-variant">
                        {item.id}
                      </span>
                      <Badge tone="secondary">{item.status}</Badge>
                    </div>
                    <p className="text-label-md font-bold text-on-surface">{item.type}</p>
                    <p className="text-caption text-on-surface-variant">{item.note}</p>
                    <span className="text-[11px] text-outline">ยื่นเมื่อ: {item.submittedAt}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="flex flex-col gap-3">
              <CardHeader
                icon="security"
                title="นโยบายความเป็นส่วนตัว"
                subtitle="อ่านรายละเอียดข้อกำหนดและสิทธิของท่านฉบับเต็ม"
              />
              <p className="text-caption text-on-surface-variant">
                บริษัทให้ความสำคัญสูงสุดกับการคุ้มครองข้อมูลการเพาะปลูกและข้อมูลส่วนตัวของเกษตรกร โดยไม่มีการนำข้อมูลแปลงไปจำหน่ายให้บุคคลที่สาม
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (window.location.hash = '#/privacy')}
                >
                  <Icon name="policy" size={16} />
                  อ่านนโยบายความเป็นส่วนตัว
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (window.location.hash = '#/terms')}
                >
                  <Icon name="description" size={16} />
                  ข้อกำหนดการให้บริการ
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
