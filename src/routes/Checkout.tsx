import { useRef, useState } from 'react';
import { MarketingShell } from '../components/layout/MarketingShell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { useRouter } from '../lib/router';
import { cn } from '../lib/cn';
import { PLANS } from '../data/pricing';

type PaymentMethod = 'card' | 'promptpay' | 'transfer';

const METHODS: readonly { id: PaymentMethod; label: string; icon: string; note: string }[] = [
  { id: 'card', label: 'บัตรเครดิต / เดบิต', icon: 'credit_card', note: 'Visa, Mastercard, JCB, UnionPay' },
  { id: 'promptpay', label: 'พร้อมเพย์ QR', icon: 'qr_code_2', note: 'สแกนจ่ายผ่านแอปธนาคาร ยืนยันทันที' },
  { id: 'transfer', label: 'โอนผ่านบัญชีธนาคาร', icon: 'account_balance', note: 'ยืนยันยอดภายใน 1 ชั่วโมงทำการ' },
];

/** Field shell so every input on this form shares one shape and focus ring. */
function Field({
  label,
  children,
  hint,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-label-lg font-medium text-on-surface">
        {label}
        {required ? <span className="ml-0.5 text-primary">*</span> : null}
      </span>
      {children}
      {hint ? <span className="text-caption text-on-surface-variant">{hint}</span> : null}
    </label>
  );
}

const INPUT_CLASS =
  'w-full rounded-full bg-surface-low px-5 py-3 text-body-lg text-on-surface outline-none transition-all placeholder:text-on-surface-variant/50 focus:bg-surface-lowest focus:ring-2 focus:ring-primary';

export function Checkout() {
  const { query, navigate } = useRouter();
  const [method, setMethod] = useState<PaymentMethod>('promptpay');
  const [needsInvoice, setNeedsInvoice] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [slipName, setSlipName] = useState('');
  const slipInput = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const planId = query.get('plan') ?? 'pro';
  const cycle = query.get('cycle') === 'monthly' ? 'monthly' : 'yearly';
  const plan = PLANS.find((item) => item.id === planId) ?? PLANS[1];

  const subtotal = cycle === 'monthly' ? plan.monthly : plan.yearly;
  const discount = couponApplied ? Math.round(subtotal * 0.15) : 0;
  const vat = Math.round((subtotal - discount) * 0.07);
  const total = subtotal - discount + vat;

  return (
    <MarketingShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-12">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate('/pricing')}
            className="inline-flex cursor-pointer items-center gap-1.5 text-label-lg text-on-surface-variant transition-colors hover:text-primary"
          >
            <Icon name="arrow_back" size={18} />
            กลับไปเลือกแพ็กเกจ
          </button>
          <h1 className="mt-3 text-headline-lg font-bold text-on-surface">ยืนยันการสมัครและชำระเงิน</h1>
          <p className="mt-1 text-body-lg text-on-surface-variant">
            ตรวจสอบรายละเอียดแพ็กเกจ เลือกช่องทางชำระเงิน แล้วเริ่มใช้งานได้ทันที
          </p>
        </div>

        <ol className="mb-8 flex flex-wrap items-center gap-3">
          {['เลือกแพ็กเกจ', 'ชำระเงิน', 'เริ่มใช้งาน'].map((step, index) => (
            <li key={step} className="flex items-center gap-3">
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full text-caption font-bold',
                    index <= 1 ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant',
                  )}
                >
                  {index < 1 ? <Icon name="check" size={14} /> : index + 1}
                </span>
                <span
                  className={cn(
                    'text-label-lg',
                    index === 1 ? 'font-bold text-on-surface' : 'text-on-surface-variant',
                  )}
                >
                  {step}
                </span>
              </span>
              {index < 2 ? <span className="h-px w-8 bg-outline-variant sm:w-12" /> : null}
            </li>
          ))}
        </ol>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="flex flex-col gap-5 lg:col-span-7">
            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-headline-sm font-bold text-on-surface">
                <Icon name="person" size={22} className="text-primary" />
                ข้อมูลผู้สมัคร
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="ชื่อ-นามสกุล" required>
                  <input className={INPUT_CLASS} defaultValue="สมศักดิ์ เกษตรมั่งคั่ง" />
                </Field>
                <Field label="เบอร์โทรศัพท์" required>
                  <input className={INPUT_CLASS} defaultValue="084-592-8190" inputMode="tel" />
                </Field>
                <Field label="อีเมล" required className="sm:col-span-2" hint="ใบเสร็จและใบกำกับภาษีจะส่งไปยังอีเมลนี้">
                  <input className={INPUT_CLASS} type="email" defaultValue="somsak.farm@gmail.com" />
                </Field>
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md bg-surface-low p-4">
                <input
                  type="checkbox"
                  checked={needsInvoice}
                  onChange={(event) => setNeedsInvoice(event.target.checked)}
                  className="mt-0.5 size-5 accent-[#1b6b44]"
                />
                <span>
                  <span className="block text-label-lg font-semibold text-on-surface">
                    ต้องการใบกำกับภาษีเต็มรูปแบบ (นิติบุคคล)
                  </span>
                  <span className="block text-caption text-on-surface-variant">
                    สำหรับกลุ่มวิสาหกิจชุมชน สหกรณ์ หรือบริษัท
                  </span>
                </span>
              </label>

              {needsInvoice ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="ชื่อนิติบุคคล" required>
                    <input className={INPUT_CLASS} placeholder="เช่น วิสาหกิจชุมชนแตงโมสุพรรณ" />
                  </Field>
                  <Field label="เลขประจำตัวผู้เสียภาษี" required>
                    <input className={INPUT_CLASS} placeholder="13 หลัก" inputMode="numeric" />
                  </Field>
                  <Field label="ที่อยู่สำหรับออกใบกำกับภาษี" required className="sm:col-span-2">
                    <textarea rows={3} className={cn(INPUT_CLASS, 'resize-none rounded-lg')} />
                  </Field>
                </div>
              ) : null}
            </Card>

            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-headline-sm font-bold text-on-surface">
                <Icon name="payments" size={22} className="text-primary" />
                ช่องทางการชำระเงิน
              </h2>

              <div className="flex flex-col gap-3">
                {METHODS.map((item) => (
                  <label
                    key={item.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg p-4 transition-all',
                      method === item.id
                        ? 'bg-melon-tint ring-2 ring-primary'
                        : 'bg-surface-low hover:bg-surface-container',
                    )}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      checked={method === item.id}
                      onChange={() => setMethod(item.id)}
                      className="size-5 accent-[#ba0035]"
                    />
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-lowest text-primary">
                      <Icon name={item.icon} size={22} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-label-lg font-bold text-on-surface">{item.label}</span>
                      <span className="block text-caption text-on-surface-variant">{item.note}</span>
                    </span>
                  </label>
                ))}
              </div>

              {method === 'card' ? (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="หมายเลขบัตร" required className="sm:col-span-2">
                    <input className={INPUT_CLASS} placeholder="0000 0000 0000 0000" inputMode="numeric" />
                  </Field>
                  <Field label="วันหมดอายุ" required>
                    <input className={INPUT_CLASS} placeholder="MM / YY" inputMode="numeric" />
                  </Field>
                  <Field label="CVV" required hint="ตัวเลข 3 หลักหลังบัตร">
                    <input className={INPUT_CLASS} placeholder="123" inputMode="numeric" maxLength={4} />
                  </Field>
                </div>
              ) : null}

              {method === 'promptpay' ? (
                <div className="mt-5 flex flex-col items-center gap-3 rounded-lg bg-surface-low p-6 text-center">
                  <div className="grid size-40 grid-cols-7 gap-1 rounded-md bg-surface-lowest p-3 shadow-sm">
                    {Array.from({ length: 49 }, (_, index) => (
                      <span
                        key={index}
                        className={cn(
                          'rounded-[2px]',
                          // Deterministic pattern — this is a placeholder, not a scannable code.
                          [0, 1, 2, 5, 6, 7, 9, 13, 14, 16, 18, 20, 22, 24, 27, 29, 31, 33, 35, 38, 40, 42, 44, 46, 48].includes(
                            index,
                          )
                            ? 'bg-on-surface'
                            : 'bg-transparent',
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-label-lg font-semibold text-on-surface">
                    สแกน QR ด้วยแอปธนาคารเพื่อชำระ ฿{total.toLocaleString('th-TH')}
                  </p>
                  <p className="text-caption text-on-surface-variant">
                    QR นี้จะหมดอายุใน 15 นาที • ระบบจะยืนยันผลอัตโนมัติ
                  </p>
                </div>
              ) : null}

              {method === 'transfer' ? (
                <div className="mt-5 rounded-lg bg-surface-low p-5">
                  <dl className="flex flex-col gap-2 text-body-md">
                    {[
                      { label: 'ธนาคาร', value: 'กสิกรไทย (KBank)' },
                      { label: 'ชื่อบัญชี', value: 'บริษัท วอเตอร์เมลอน เอไอ จำกัด' },
                      { label: 'เลขที่บัญชี', value: '123-4-56789-0' },
                      { label: 'จำนวนเงิน', value: `฿${total.toLocaleString('th-TH')}` },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-3">
                        <dt className="text-on-surface-variant">{row.label}</dt>
                        <dd className="font-bold text-on-surface">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <input
                    ref={slipInput}
                    type="file"
                    accept="image/*,application/pdf"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        setSlipName(file.name);
                        toast.success('แนบสลิปแล้ว — ทีมงานจะตรวจสอบภายใน 1 ชั่วโมงทำการ');
                      }
                      event.target.value = '';
                    }}
                  />
                  <Button variant="ghost" size="sm" className="mt-4 w-full" onClick={() => slipInput.current?.click()}>
                    <Icon name={slipName ? 'check_circle' : 'upload_file'} size={18} />
                    {slipName ? `แนบแล้ว: ${slipName}` : 'แนบสลิปการโอนเงิน'}
                  </Button>
                </div>
              ) : null}
            </Card>
          </div>

          <div className="lg:col-span-5">
            <Card className="lg:sticky lg:top-24">
              <h2 className="mb-4 text-headline-sm font-bold text-on-surface">สรุปรายการสั่งซื้อ</h2>

              <div className="flex items-start justify-between gap-3 rounded-lg bg-melon-tint p-4">
                <div className="min-w-0">
                  <p className="text-title-md font-bold text-on-surface">{plan.name}</p>
                  <p className="mt-0.5 text-caption text-on-surface-variant">
                    รอบชำระ{cycle === 'yearly' ? 'รายปี' : 'รายเดือน'} • ทดลองฟรี 14 วันแรก
                  </p>
                </div>
                <Badge tone="primary">{cycle === 'yearly' ? 'ประหยัด 2 เดือน' : 'ยืดหยุ่น'}</Badge>
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  value={coupon}
                  onChange={(event) => setCoupon(event.target.value)}
                  placeholder="กรอกรหัสส่วนลด"
                  className="min-w-0 flex-1 rounded-full bg-surface-low px-4 py-2.5 text-body-md text-on-surface outline-none focus:bg-surface-lowest focus:ring-2 focus:ring-primary"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCouponApplied(coupon.trim().length > 0)}
                  disabled={!coupon.trim()}
                >
                  ใช้รหัส
                </Button>
              </div>
              {couponApplied ? (
                <p className="mt-2 flex items-center gap-1.5 text-caption text-secondary">
                  <Icon name="check_circle" size={14} />
                  ใช้ส่วนลด 15% เรียบร้อยแล้ว
                </p>
              ) : null}

              <dl className="mt-5 flex flex-col gap-2.5 border-t border-outline-variant/30 pt-5 text-body-md">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-on-surface-variant">ราคาแพ็กเกจ</dt>
                  <dd className="text-on-surface">฿{subtotal.toLocaleString('th-TH')}</dd>
                </div>
                {discount > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-secondary">ส่วนลด</dt>
                    <dd className="font-semibold text-secondary">−฿{discount.toLocaleString('th-TH')}</dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-on-surface-variant">ภาษีมูลค่าเพิ่ม 7%</dt>
                  <dd className="text-on-surface">฿{vat.toLocaleString('th-TH')}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-outline-variant/30 pt-3">
                  <dt className="text-title-md font-bold text-on-surface">ยอดชำระทั้งหมด</dt>
                  <dd className="text-headline-md font-bold text-primary">฿{total.toLocaleString('th-TH')}</dd>
                </div>
              </dl>

              <Button size="lg" className="mt-5 w-full" onClick={() => navigate('/payment-success')}>
                <Icon name="lock" size={20} />
                ยืนยันการชำระเงิน
              </Button>

              <p className="mt-3 text-center text-caption text-on-surface-variant">
                การกดยืนยันถือว่าคุณยอมรับ{' '}
                <a href="#/terms" className="font-semibold text-primary hover:underline">
                  ข้อกำหนดการใช้งาน
                </a>{' '}
                และ{' '}
                <a href="#/privacy" className="font-semibold text-primary hover:underline">
                  นโยบายความเป็นส่วนตัว
                </a>
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-outline-variant/30 pt-4 text-caption text-on-surface-variant">
                {[
                  { icon: 'lock', label: 'SSL 256-bit' },
                  { icon: 'verified_user', label: 'PCI-DSS' },
                  { icon: 'policy', label: 'PDPA' },
                ].map((item) => (
                  <span key={item.label} className="flex items-center gap-1.5">
                    <Icon name={item.icon} size={14} className="text-secondary" />
                    {item.label}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MarketingShell>
  );
}
