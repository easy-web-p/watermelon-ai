import { useEffect, useRef, useState } from 'react';
import { AppShell, PageContainer, PageHeading } from '../components/layout/AppShell';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge, LiveBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { useToast } from '../components/ui/Toast';
import { useRouter } from '../lib/router';
import { cn } from '../lib/cn';

type AlertKey = 'disease' | 'price' | 'weather' | 'tasks' | 'harvest' | 'digest';

const ALERT_TYPES: readonly {
  key: AlertKey;
  icon: string;
  tone: string;
  title: string;
  body: string;
  example: string;
}[] = [
  {
    key: 'disease',
    icon: 'coronavirus',
    tone: 'bg-primary-fixed text-primary',
    title: 'เตือนโรคระบาดในพื้นที่',
    body: 'แจ้งทันทีเมื่อพบการระบาดในรัศมี 10 กม. จากแปลงของคุณ',
    example: '⚠️ พบการระบาดราน้ำค้างใน อ.ดอนเจดีย์ ห่างจากแปลงคุณ 4.2 กม. แนะนำพ่นป้องกันภายใน 48 ชม.',
  },
  {
    key: 'price',
    icon: 'trending_up',
    tone: 'bg-secondary-container text-on-secondary-fixed-variant',
    title: 'ราคาตลาดถึงเป้าหมาย',
    body: 'เตือนเมื่อราคารับซื้อแตะระดับที่คุณตั้งไว้',
    example: '📈 ราคาแตงโมตอร์ปิโดเกรด A ที่ตลาดไทแตะ 24.50 ฿/กก. แล้ว (+1.00 ฿ จากเมื่อวาน)',
  },
  {
    key: 'weather',
    icon: 'thunderstorm',
    tone: 'bg-surface-container text-on-surface-variant',
    title: 'สภาพอากาศที่มีผลต่อแปลง',
    body: 'เตือนฝนตกหนัก ลมแรง หรืออุณหภูมิผิดปกติล่วงหน้า 24 ชม.',
    example: '🌧️ คาดการณ์ฝนตกหนักพรุ่งนี้ 06:00–12:00 น. ควรเลื่อนการพ่นยาออกไปก่อน',
  },
  {
    key: 'tasks',
    icon: 'task_alt',
    tone: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
    title: 'งานดูแลแปลงที่ถึงกำหนด',
    body: 'เตือนรอบให้ปุ๋ย พ่นยา ผสมเกสร และงานตามแผน',
    example: '✅ วันนี้ถึงรอบพ่นยาป้องกันราน้ำค้าง แปลงที่ 2 — แนะนำพ่นช่วงเช้าตรู่',
  },
  {
    key: 'harvest',
    icon: 'agriculture',
    tone: 'bg-primary-fixed text-primary',
    title: 'ใกล้ถึงวันเก็บเกี่ยว',
    body: 'เตือนล่วงหน้า 7 วัน พร้อมคำแนะนำวันตัดที่ทำกำไรสูงสุด',
    example: '🍉 แปลงที่ 1 ครบอายุเก็บเกี่ยวใน 7 วัน — วันตัดที่แนะนำคือ 18–20 พ.ค.',
  },
  {
    key: 'digest',
    icon: 'summarize',
    tone: 'bg-surface-container text-on-surface-variant',
    title: 'สรุปภาพรวมรายสัปดาห์',
    body: 'สรุปสุขภาพแปลง ราคาตลาด และงานที่ต้องทำสัปดาห์หน้า ทุกวันอาทิตย์',
    example: '📋 สรุปสัปดาห์: แปลงทั้ง 4 สุขภาพดี • ราคาเฉลี่ย +4.2% • มี 3 งานรอดำเนินการ',
  },
];

export function LineAlerts() {
  const [connected, setConnected] = useState(true);
  const [enabled, setEnabled] = useState<Record<AlertKey, boolean>>({
    disease: true,
    price: true,
    weather: true,
    tasks: true,
    harvest: true,
    digest: false,
  });
  const [quietHours, setQuietHours] = useState(true);
  const [priceTarget, setPriceTarget] = useState(20);
  const [sending, setSending] = useState(false);
  const toast = useToast();
  const { query } = useRouter();
  const focusCard = useRef<HTMLDivElement>(null);

  // Other screens link here with ?focus=price|disease to jump to that switch.
  const focus = query.get('focus');
  useEffect(() => {
    if (!focus) return;
    const key = focus === 'price' ? 'price' : focus === 'disease' ? 'disease' : null;
    if (!key) return;
    setEnabled((prev) => ({ ...prev, [key]: true }));
    focusCard.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focus]);

  const activeCount = Object.values(enabled).filter(Boolean).length;

  return (
    <AppShell>
      <PageContainer>
        <PageHeading
          eyebrow={
            <>
              <Badge tone="secondary">
                <Icon name="chat" size={14} />
                LINE Official Account
              </Badge>
              {connected ? <LiveBadge>เชื่อมต่อแล้ว</LiveBadge> : null}
            </>
          }
          title="ตั้งค่าการแจ้งเตือนผ่าน LINE"
          description="รับเตือนเรื่องที่สำคัญกับแปลงของคุณถึงมือถือทันที โดยไม่ต้องเปิดแอป"
        />

        <Card
          className={cn(
            'mb-4',
            connected ? 'bg-mint-mist' : 'border-2 border-dashed border-outline-variant bg-surface-low',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span
                className={cn(
                  'flex size-14 shrink-0 items-center justify-center rounded-full',
                  connected ? 'bg-secondary text-on-secondary' : 'bg-surface-container text-on-surface-variant',
                )}
              >
                <Icon name={connected ? 'check' : 'link'} size={28} />
              </span>
              <div>
                <p className="text-title-md font-bold text-on-surface">
                  {connected ? 'เชื่อมต่อกับ LINE เรียบร้อยแล้ว' : 'ยังไม่ได้เชื่อมต่อกับ LINE'}
                </p>
                <p className="mt-0.5 text-body-md text-on-surface-variant">
                  {connected
                    ? 'บัญชี LINE: สมศักดิ์ สวนแตงโม • เชื่อมต่อเมื่อ 12 มี.ค. 2566'
                    : 'สแกน QR หรือเพิ่มเพื่อน @WatermelonAI เพื่อเริ่มรับการแจ้งเตือน'}
                </p>
              </div>
            </div>

            <Button
              variant={connected ? 'ghost' : 'secondary'}
              size="md"
              onClick={() => setConnected((value) => !value)}
            >
              <Icon name={connected ? 'link_off' : 'qr_code_2'} size={18} />
              {connected ? 'ยกเลิกการเชื่อมต่อ' : 'เชื่อมต่อ LINE'}
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-7" ref={focusCard}>
            <CardHeader
              icon="notifications_active"
              title="ประเภทการแจ้งเตือน"
              subtitle="เลือกเฉพาะเรื่องที่คุณอยากรู้ เพื่อไม่ให้ข้อความรบกวนเกินจำเป็น"
              action={
                <Badge tone="secondary">
                  เปิดอยู่ {activeCount}/{ALERT_TYPES.length}
                </Badge>
              }
            />

            <div className="flex flex-col gap-3">
              {ALERT_TYPES.map((item) => {
                const on = enabled[item.key];
                return (
                  <div
                    key={item.key}
                    className={cn(
                      'rounded-md p-4 transition-colors',
                      on ? 'bg-surface-low' : 'bg-surface-low/50 opacity-70',
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', item.tone)}>
                          <Icon name={item.icon} size={20} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-label-lg font-bold text-on-surface">{item.title}</p>
                          <p className="mt-0.5 text-caption text-on-surface-variant">{item.body}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={item.title}
                        disabled={!connected}
                        onClick={() => setEnabled((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                        className={cn(
                          'relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40',
                          on ? 'bg-secondary' : 'bg-surface-highest',
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-1 size-5 rounded-full bg-surface-lowest shadow-sm transition-all duration-200 ease-tactile',
                            on ? 'left-6' : 'left-1',
                          )}
                        />
                      </button>
                    </div>

                    {on ? (
                      <p className="mt-3 rounded-md bg-surface-lowest p-3 text-caption text-on-surface-variant">
                        <span className="mb-1 block font-semibold tracking-wider text-outline uppercase">
                          ตัวอย่างข้อความ
                        </span>
                        {item.example}
                      </p>
                    ) : null}

                    {item.key === 'price' && on ? (
                      <label className="mt-3 flex flex-wrap items-center gap-3 rounded-md bg-surface-lowest p-3">
                        <span className="text-label-md font-semibold text-on-surface">
                          แจ้งเตือนเมื่อราคาแตะ
                        </span>
                        <span className="flex items-center gap-2">
                          <input
                            type="range"
                            min={15}
                            max={35}
                            step={0.5}
                            value={priceTarget}
                            onChange={(event) => setPriceTarget(Number(event.target.value))}
                            className="w-40 accent-[#ba0035]"
                          />
                          <span className="rounded-full bg-primary-fixed px-3 py-1 text-label-lg font-bold text-on-primary-fixed-variant">
                            {priceTarget.toFixed(2)} ฿/กก.
                          </span>
                        </span>
                      </label>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="flex flex-col gap-4 lg:col-span-5">
            <Card>
              <CardHeader icon="schedule" iconTone="secondary" title="ช่วงเวลาที่รับการแจ้งเตือน" />

              <label className="flex items-start justify-between gap-4 rounded-md bg-surface-low p-4">
                <div className="min-w-0">
                  <p className="text-label-lg font-semibold text-on-surface">งดรบกวนช่วงกลางคืน</p>
                  <p className="mt-0.5 text-caption text-on-surface-variant">
                    พักการแจ้งเตือนระหว่าง 21:00 – 05:30 น. ยกเว้นเรื่องเร่งด่วน
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={quietHours}
                  aria-label="งดรบกวนช่วงกลางคืน"
                  onClick={() => setQuietHours((value) => !value)}
                  className={cn(
                    'relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
                    quietHours ? 'bg-secondary' : 'bg-surface-highest',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 size-5 rounded-full bg-surface-lowest shadow-sm transition-all duration-200 ease-tactile',
                      quietHours ? 'left-6' : 'left-1',
                    )}
                  />
                </button>
              </label>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-md bg-surface-low p-4">
                  <p className="text-caption text-on-surface-variant">เริ่มงดรบกวน</p>
                  <p className="mt-0.5 text-title-md font-bold text-on-surface">21:00 น.</p>
                </div>
                <div className="rounded-md bg-surface-low p-4">
                  <p className="text-caption text-on-surface-variant">กลับมาแจ้งเตือน</p>
                  <p className="mt-0.5 text-title-md font-bold text-on-surface">05:30 น.</p>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader icon="smartphone" title="ตัวอย่างบนหน้าจอ LINE" subtitle="ข้อความจะแสดงแบบนี้บนมือถือของคุณ" />

              <div className="rounded-lg bg-[#8cabd8]/25 p-4">
                <div className="flex items-start gap-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
                    <Icon name="eco" size={18} filled />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-caption font-semibold text-on-surface-variant">Watermelon AI</p>
                    <div className="rounded-[4px_16px_16px_16px] bg-surface-lowest p-3 shadow-sm">
                      <p className="text-body-md text-on-surface">
                        ⚠️ พบการระบาดราน้ำค้างใน อ.ดอนเจดีย์ ห่างจากแปลงคุณ 4.2 กม.
                      </p>
                      <p className="mt-2 text-caption text-on-surface-variant">
                        แนะนำพ่นไตรโคเดอร์มา 100 ก./น้ำ 20 ล. ภายใน 48 ชม. ช่วงเช้าตรู่
                      </p>
                      <div className="mt-3 flex gap-2 border-t border-outline-variant/40 pt-2">
                        <span className="rounded-full bg-primary-fixed px-2.5 py-1 text-caption font-semibold text-on-primary-fixed-variant">
                          ดูแผนจัดการ
                        </span>
                        <span className="rounded-full bg-surface-container px-2.5 py-1 text-caption font-semibold text-on-surface-variant">
                          เลื่อนเตือน
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-on-surface-variant">09:14 น.</p>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="md"
                className="mt-4 w-full"
                disabled={!connected || sending}
                onClick={() => {
                  setSending(true);
                  window.setTimeout(() => {
                    setSending(false);
                    toast.success('ส่งข้อความทดสอบแล้ว — ตรวจสอบใน LINE ของคุณ');
                  }, 700);
                }}
              >
                <Icon name={sending ? 'progress_activity' : 'send'} size={18} className={sending ? 'animate-spin' : undefined} />
                {sending ? 'กำลังส่ง...' : 'ส่งข้อความทดสอบถึง LINE ของฉัน'}
              </Button>
            </Card>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
