import { AppShell, PageContainer, PageHeading } from '../components/layout/AppShell';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Meter } from '../components/ui/Meter';
import { Link, useRouter } from '../lib/router';
import { useToast } from '../components/ui/Toast';
import { downloadCsv } from '../lib/export';
import { cn } from '../lib/cn';
import { INVOICES } from '../data/pricing';

const STATUS_TONE = {
  ชำระแล้ว: 'secondary',
  รอชำระ: 'primary',
  คืนเงินแล้ว: 'neutral',
} as const;

const USAGE = [
  { label: 'สแกนวินิจฉัยโรค', used: 847, limit: 0, unit: 'ครั้ง', icon: 'document_scanner' },
  { label: 'แปลงที่จัดการอยู่', used: 4, limit: 10, unit: 'แปลง', icon: 'map' },
  { label: 'พื้นที่จัดเก็บภาพถ่าย', used: 2.4, limit: 10, unit: 'GB', icon: 'cloud' },
  { label: 'การแจ้งเตือน LINE เดือนนี้', used: 156, limit: 500, unit: 'ข้อความ', icon: 'notifications' },
];

export function Billing() {
  const toast = useToast();
  const { navigate } = useRouter();

  function exportInvoices() {
    downloadCsv(
      `watermelon-ai-invoices-${new Date().toISOString().slice(0, 10)}.csv`,
      ['เลขที่ใบเสร็จ', 'วันที่', 'รายการ', 'ช่องทาง', 'จำนวนเงิน (บาท)', 'สถานะ'],
      INVOICES.map((i) => [i.id, i.date, i.plan, i.method, String(i.amount), i.status]),
    );
    toast.success('ดาวน์โหลดประวัติการชำระเงินเป็นไฟล์ CSV แล้ว');
  }

  return (
    <AppShell>
      <PageContainer>
        <PageHeading
          eyebrow={
            <Badge tone="secondary">
              <Icon name="workspace_premium" size={14} />
              PRO เกษตรกรดิจิทัล — รายปี
            </Badge>
          }
          title="การสมัครสมาชิกและประวัติการชำระเงิน"
          description="จัดการแพ็กเกจ ตรวจสอบปริมาณการใช้งาน และดาวน์โหลดใบเสร็จย้อนหลัง"
          actions={
            <Button variant="ghost" size="sm" onClick={exportInvoices}>
              <Icon name="download" size={18} />
              ดาวน์โหลดทั้งหมด
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="bg-gradient-to-br from-primary to-primary-container text-on-primary lg:col-span-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-label-md text-primary-fixed">แพ็กเกจปัจจุบัน</p>
                <h2 className="mt-1 text-headline-md font-bold">PRO เกษตรกรดิจิทัล</h2>
              </div>
              <span className="rounded-full bg-on-primary/15 px-3 py-1 text-caption font-semibold">ใช้งานอยู่</span>
            </div>

            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="text-display-sm leading-none font-bold">฿3,900</span>
              <span className="text-label-lg text-primary-fixed">/ ปี</span>
            </p>

            <dl className="mt-5 flex flex-col gap-2 border-t border-on-primary/20 pt-5 text-body-md">
              {[
                { label: 'เริ่มต้นรอบปัจจุบัน', value: '1 ต.ค. 2569' },
                { label: 'ต่ออายุอัตโนมัติ', value: '1 ต.ค. 2570' },
                { label: 'ช่องทางชำระเงิน', value: 'บัตรเครดิต •••• 4219' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <dt className="text-primary-fixed">{row.label}</dt>
                  <dd className="font-semibold">{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/pricing"
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-on-primary px-4 text-label-lg font-semibold text-primary transition-transform duration-150 ease-tactile active:scale-[0.96]"
              >
                เปลี่ยนแพ็กเกจ
              </Link>
              <button
                type="button"
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-on-primary/40 px-4 text-label-lg font-semibold transition-transform duration-150 ease-tactile active:scale-[0.96]"
              >
                ยกเลิก
              </button>
            </div>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader
              icon="monitoring"
              iconTone="secondary"
              title="ปริมาณการใช้งานรอบนี้"
              subtitle="นับตั้งแต่ 1 ต.ค. 2569 ถึงปัจจุบัน"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {USAGE.map((item) => {
                const unlimited = item.limit === 0;
                const percent = unlimited ? 100 : (item.used / item.limit) * 100;
                return (
                  <div key={item.label} className="rounded-md bg-surface-low p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-caption text-on-surface-variant">
                        <Icon name={item.icon} size={14} />
                        {item.label}
                      </span>
                      {unlimited ? <Badge tone="secondary">ไม่จำกัด</Badge> : null}
                    </div>
                    <p className="mt-1.5 flex items-baseline gap-1 text-title-md font-bold text-on-surface">
                      {item.used.toLocaleString('th-TH')}
                      <span className="text-caption font-normal text-on-surface-variant">
                        {unlimited ? item.unit : `/ ${item.limit.toLocaleString('th-TH')} ${item.unit}`}
                      </span>
                    </p>
                    <Meter
                      value={percent}
                      tone={percent > 80 && !unlimited ? 'primary' : 'secondary'}
                      className="mt-2 h-1.5"
                      label={item.label}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <Card className="mt-4 overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-4">
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface">ประวัติการชำระเงิน</h2>
              <p className="mt-1 text-body-md text-on-surface-variant">
                ใบเสร็จทุกฉบับเก็บไว้ 7 ปีตามข้อกำหนดทางบัญชี
              </p>
            </div>
            <Badge tone="outline">
              <Icon name="history" size={14} />
              {INVOICES.length} รายการ
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="bg-surface-low text-label-md text-on-surface-variant">
                  <th scope="col" className="px-6 py-3 font-semibold">เลขที่ใบเสร็จ</th>
                  <th scope="col" className="px-4 py-3 font-semibold">วันที่</th>
                  <th scope="col" className="px-4 py-3 font-semibold">รายการ</th>
                  <th scope="col" className="px-4 py-3 font-semibold">ช่องทาง</th>
                  <th scope="col" className="px-4 py-3 font-semibold">จำนวนเงิน</th>
                  <th scope="col" className="px-4 py-3 font-semibold">สถานะ</th>
                  <th scope="col" className="px-6 py-3 font-semibold">
                    <span className="sr-only">ดาวน์โหลด</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-outline-variant/30">
                    <th scope="row" className="px-6 py-4 text-left text-label-lg font-bold text-on-surface">
                      {invoice.id}
                    </th>
                    <td className="px-4 py-4 text-body-md text-on-surface-variant">{invoice.date}</td>
                    <td className="px-4 py-4 text-body-md text-on-surface">{invoice.plan}</td>
                    <td className="px-4 py-4 text-body-md text-on-surface-variant">{invoice.method}</td>
                    <td
                      className={cn(
                        'px-4 py-4 text-label-lg font-bold',
                        invoice.status === 'คืนเงินแล้ว' ? 'text-on-surface-variant line-through' : 'text-on-surface',
                      )}
                    >
                      ฿{invoice.amount.toLocaleString('th-TH')}
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={STATUS_TONE[invoice.status]}>{invoice.status}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        aria-label={`ดาวน์โหลดใบเสร็จ ${invoice.id}`}
                        onClick={() =>
                          downloadCsv(
                            `${invoice.id}.csv`,
                            ['เลขที่ใบเสร็จ', 'วันที่', 'รายการ', 'ช่องทาง', 'จำนวนเงิน (บาท)', 'สถานะ'],
                            [[invoice.id, invoice.date, invoice.plan, invoice.method, String(invoice.amount), invoice.status]],
                          )
                        }
                        className="flex size-9 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
                      >
                        <Icon name="download" size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="mt-4 flex flex-wrap items-center justify-between gap-4 bg-surface-low">
          <div className="flex items-start gap-3">
            <Icon name="info" size={22} className="mt-0.5 shrink-0 text-secondary" />
            <div>
              <p className="text-label-lg font-bold text-on-surface">ต้องการใบกำกับภาษีย้อนหลัง?</p>
              <p className="mt-0.5 max-w-[60ch] text-body-md text-on-surface-variant">
                ติดต่อทีมบัญชีพร้อมแจ้งเลขที่ใบเสร็จ ระบบจะออกใบกำกับภาษีเต็มรูปแบบและส่งเข้าอีเมลภายใน 24 ชั่วโมง
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/support')}>
            <Icon name="mail" size={18} />
            ติดต่อทีมบัญชี
          </Button>
        </Card>
      </PageContainer>
    </AppShell>
  );
}
