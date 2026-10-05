import { MarketingShell } from '../components/layout/MarketingShell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { MelonAvatar } from '../components/brand/Logo';
import { Link } from '../lib/router';

const NEXT_STEPS = [
  {
    icon: 'add_location_alt',
    title: 'ลงทะเบียนแปลงเพาะปลูก',
    body: 'บันทึกขนาดแปลง สายพันธุ์ และวันเริ่มปลูก เพื่อให้ AI วางแผนดูแลให้ตรงรอบของคุณ',
    to: '/plots',
    cta: 'เพิ่มแปลงแรก',
  },
  {
    icon: 'photo_camera',
    title: 'สแกนวินิจฉัยโรคครั้งแรก',
    body: 'ถ่ายภาพใบหรือลำต้นที่สงสัย แล้วรับผลวิเคราะห์พร้อมแผนการรักษาใน 3 วินาที',
    to: '/chat',
    cta: 'เริ่มสแกน',
  },
  {
    icon: 'notifications_active',
    title: 'เชื่อมต่อแจ้งเตือน LINE',
    body: 'รับเตือนโรคระบาดประจำพื้นที่ ราคาถึงเป้าหมาย และงานดูแลแปลงที่ถึงกำหนด',
    to: '/alerts',
    cta: 'ตั้งค่าแจ้งเตือน',
  },
];

export function PaymentSuccess() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <Card className="flex flex-col items-center gap-5 py-12 text-center">
          <span className="relative flex size-20 items-center justify-center rounded-full bg-secondary-container">
            <Icon name="check" size={44} className="text-secondary" />
            <span className="absolute inset-0 animate-ping rounded-full bg-secondary/20" />
          </span>

          <div>
            <Badge tone="secondary" className="mx-auto mb-3">
              <Icon name="verified" size={14} />
              ชำระเงินสำเร็จ
            </Badge>
            <h1 className="text-headline-lg font-bold text-on-surface">
              ยินดีต้อนรับสู่ Watermelon AI PRO
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-body-lg text-on-surface-variant">
              บัญชีของคุณได้รับการอัปเกรดเรียบร้อยแล้ว ใบเสร็จและใบกำกับภาษีถูกส่งไปที่
              <span className="font-semibold text-on-surface"> somsak.farm@gmail.com</span>
            </p>
          </div>

          <dl className="mt-2 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: 'เลขที่ใบเสร็จ', value: 'INV-2026-0412' },
              { label: 'แพ็กเกจ', value: 'PRO รายปี' },
              { label: 'ต่ออายุถัดไป', value: '1 ต.ค. 2570' },
            ].map((item) => (
              <div key={item.label} className="rounded-md bg-surface-low p-4">
                <dt className="text-caption text-on-surface-variant">{item.label}</dt>
                <dd className="mt-0.5 text-label-lg font-bold text-on-surface">{item.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/chat"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-label-lg font-semibold text-on-primary shadow-cta transition-transform duration-150 ease-tactile active:scale-[0.96]"
            >
              เริ่มใช้งานทันที
              <Icon name="arrow_forward" size={18} />
            </Link>
            <Link
              to="/billing"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-primary/25 px-6 text-label-lg font-semibold text-on-surface transition-transform duration-150 ease-tactile hover:bg-surface-container active:scale-[0.96]"
            >
              <Icon name="receipt_long" size={18} />
              ดูใบเสร็จ
            </Link>
          </div>
        </Card>

        <section className="mt-8">
          <h2 className="mb-4 text-headline-sm font-bold text-on-surface">3 ขั้นตอนแรกที่แนะนำให้ทำ</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {NEXT_STEPS.map((step, index) => (
              <Card key={step.title} as="article" className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-full bg-primary-fixed text-primary">
                    <Icon name={step.icon} size={22} />
                  </span>
                  <span className="text-headline-md font-bold text-primary/15">{index + 1}</span>
                </div>
                <h3 className="text-title-md font-bold text-on-surface">{step.title}</h3>
                <p className="text-body-md text-on-surface-variant">{step.body}</p>
                <Link
                  to={step.to}
                  className="mt-auto inline-flex items-center gap-1.5 text-label-lg font-semibold text-primary hover:underline"
                >
                  {step.cta}
                  <Icon name="arrow_forward" size={16} />
                </Link>
              </Card>
            ))}
          </div>
        </section>

        <Card className="mt-6 flex flex-wrap items-center justify-between gap-4 bg-mint-mist">
          <div className="flex items-center gap-4">
            <MelonAvatar size={48} />
            <div>
              <p className="text-title-md font-bold text-on-surface">มีคำถามเรื่องการใช้งาน?</p>
              <p className="mt-0.5 text-body-md text-on-surface-variant">
                ทีมดูแลเกษตรกรพร้อมช่วยเหลือทุกวัน 08:00 – 20:00 น.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-label-lg font-semibold">
            <span className="inline-flex items-center gap-1.5 text-secondary">
              <Icon name="chat" size={18} />
              LINE: @WatermelonAI
            </span>
            <span className="inline-flex items-center gap-1.5 text-primary">
              <Icon name="call" size={18} />
              02-123-4567
            </span>
          </div>
        </Card>
      </div>
    </MarketingShell>
  );
}
