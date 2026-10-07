import { useState } from 'react';
import { MarketingShell } from '../components/layout/MarketingShell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { Segmented } from '../components/ui/Segmented';
import { Link, useRouter } from '../lib/router';
import { cn } from '../lib/cn';
import { FAQS, PLANS } from '../data/pricing';

type Cycle = 'monthly' | 'yearly';

const CYCLES = [
  { value: 'monthly', label: 'รายเดือน' },
  { value: 'yearly', label: 'รายปี (ประหยัด 2 เดือน)' },
] as const;

export function Pricing() {
  const [cycle, setCycle] = useState<Cycle>('yearly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { navigate } = useRouter();

  return (
    <MarketingShell>
      <section className="relative overflow-hidden bg-gradient-to-b from-surface-lowest via-surface-low to-surface py-14">
        <div className="pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-12">
          <div className="mx-auto mb-2 flex items-center justify-center gap-2">
            <Badge tone="secondary">
              <Icon name="workspace_premium" size={14} />
              แพ็กเกจและราคา
            </Badge>
          </div>
          <h1 className="mx-auto mt-3 max-w-3xl text-headline-lg text-on-surface lg:text-display-lg">
            เลือกแพ็กเกจที่เหมาะกับขนาดแปลงของคุณ
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-body-lg text-on-surface-variant">
            เริ่มต้นใช้งานฟรี ไม่ต้องใช้บัตรเครดิต อัปเกรดเมื่อพร้อม และยกเลิกได้ทุกเมื่อ
          </p>

          <div className="mt-7 flex justify-center">
            <Segmented options={CYCLES} value={cycle} onChange={setCycle} label="รอบการชำระเงิน" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-12">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const price = cycle === 'monthly' ? plan.monthly : plan.yearly;
            const perMonth = cycle === 'yearly' && plan.yearly > 0 ? Math.round(plan.yearly / 12) : plan.monthly;

            return (
              <Card
                key={plan.id}
                as="article"
                className={cn(
                  'relative flex flex-col gap-5',
                  plan.highlight && 'bg-gradient-to-b from-melon-tint to-surface-lowest ring-2 ring-primary',
                )}
              >
                {plan.badge ? (
                  <Badge
                    tone={plan.highlight ? 'primary' : 'neutral'}
                    className="absolute -top-3 left-6 shadow-sm"
                  >
                    {plan.highlight ? <Icon name="star" size={12} /> : null}
                    {plan.badge}
                  </Badge>
                ) : null}

                <div>
                  <h2 className="text-headline-sm font-bold text-on-surface">{plan.name}</h2>
                  <p className="mt-1 min-h-[2.75rem] text-body-md text-on-surface-variant">{plan.tagline}</p>
                </div>

                <div>
                  {price === 0 ? (
                    <p className="text-display-sm font-bold text-secondary">ฟรี</p>
                  ) : (
                    <>
                      <p className="flex items-baseline gap-1.5">
                        <span className="text-display-sm leading-none font-bold text-on-surface">
                          ฿{perMonth.toLocaleString('th-TH')}
                        </span>
                        <span className="text-label-lg text-on-surface-variant">/ เดือน</span>
                      </p>
                      <p className="mt-1.5 text-caption text-on-surface-variant">
                        {cycle === 'yearly'
                          ? `เรียกเก็บ ฿${plan.yearly.toLocaleString('th-TH')} ต่อปี — ประหยัด ฿${(plan.monthly * 12 - plan.yearly).toLocaleString('th-TH')}`
                          : 'เรียกเก็บทุกเดือน ยกเลิกได้ตลอดเวลา'}
                      </p>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => navigate(plan.id === 'free' ? '/register' : `/checkout?plan=${plan.id}&cycle=${cycle}`)}
                  className={cn(
                    'inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full text-label-lg font-semibold transition-all duration-150 ease-tactile active:scale-[0.96]',
                    plan.highlight
                      ? 'bg-primary text-on-primary shadow-cta hover:bg-primary-container'
                      : 'border border-primary/25 bg-surface-lowest text-on-surface hover:bg-surface-container',
                  )}
                >
                  {plan.cta}
                  <Icon name="arrow_forward" size={18} />
                </button>

                <ul className="flex flex-col gap-2.5 border-t border-outline-variant/30 pt-5">
                  {plan.features.map((feature) => (
                    <li key={feature.label} className="flex items-start gap-2 text-body-md">
                      <Icon
                        name={feature.included ? 'check_circle' : 'cancel'}
                        size={18}
                        className={cn('mt-0.5 shrink-0', feature.included ? 'text-secondary' : 'text-outline/50')}
                      />
                      <span className={feature.included ? 'text-on-surface' : 'text-on-surface-variant/60 line-through'}>
                        {feature.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: 'lock', title: 'ชำระเงินปลอดภัย', body: 'เข้ารหัส SSL 256-bit ผ่านเกตเวย์มาตรฐาน PCI-DSS' },
            { icon: 'autorenew', title: 'ยกเลิกได้ทุกเมื่อ', body: 'ไม่มีสัญญาผูกมัด ยกเลิกเองได้จากหน้าตั้งค่า' },
            { icon: 'receipt_long', title: 'ออกใบกำกับภาษีได้', body: 'รองรับนิติบุคคลและกลุ่มวิสาหกิจชุมชน' },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 rounded-lg bg-surface-lowest p-5 shadow-sm">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-fixed-variant">
                <Icon name={item.icon} size={20} />
              </span>
              <div>
                <p className="text-label-lg font-bold text-on-surface">{item.title}</p>
                <p className="mt-0.5 text-caption text-on-surface-variant">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="text-center text-headline-md font-bold text-on-surface">คำถามที่พบบ่อย</h2>
          <div className="mx-auto mt-6 flex max-w-3xl flex-col gap-3">
            {FAQS.map((faq, index) => {
              const open = openFaq === index;
              return (
                <div key={faq.q} className="overflow-hidden rounded-lg bg-surface-lowest shadow-sm">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : index)}
                    aria-expanded={open}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
                  >
                    <span className="text-label-lg font-semibold text-on-surface">{faq.q}</span>
                    <Icon
                      name="expand_more"
                      size={20}
                      className={cn('shrink-0 text-on-surface-variant transition-transform', open && 'rotate-180')}
                    />
                  </button>
                  {open ? <p className="px-5 pb-5 text-body-md text-on-surface-variant">{faq.a}</p> : null}
                </div>
              );
            })}
          </div>
        </section>

        <Card className="mt-12 flex flex-wrap items-center justify-between gap-5 bg-secondary text-on-secondary">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-on-secondary/15">
              <Icon name="groups" size={26} />
            </span>
            <div>
              <p className="text-headline-sm font-bold">เป็นกลุ่มวิสาหกิจหรือสหกรณ์?</p>
              <p className="mt-0.5 text-body-md text-secondary-fixed">
                เรามีราคาพิเศษสำหรับกลุ่มเกษตรกรตั้งแต่ 20 แปลงขึ้นไป พร้อมทีมอบรมการใช้งาน
              </p>
            </div>
          </div>
          <Link
            to="/support"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-on-secondary px-5 text-label-lg font-semibold text-secondary transition-transform duration-150 ease-tactile active:scale-[0.96]"
          >
            <Icon name="call" size={18} />
            ติดต่อฝ่ายขาย
          </Link>
        </Card>
      </section>
    </MarketingShell>
  );
}
