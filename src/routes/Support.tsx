import { useState } from 'react';
import { MarketingShell } from '../components/layout/MarketingShell';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge, LiveBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Field, TextInput, INPUT_CLASS } from '../components/ui/Field';
import { Link } from '../lib/router';
import { cn } from '../lib/cn';

const CHANNELS = [
  {
    icon: 'chat',
    title: 'LINE Official',
    value: '@WatermelonAI',
    note: 'ตอบเร็วที่สุด เฉลี่ย 5 นาที',
    tone: 'bg-secondary-container text-on-secondary-fixed-variant',
    live: true,
  },
  {
    icon: 'call',
    title: 'โทรศัพท์',
    value: '02-123-4567',
    note: 'ทุกวัน 08:00 – 20:00 น.',
    tone: 'bg-primary-fixed text-primary',
    live: false,
  },
  {
    icon: 'mail',
    title: 'อีเมล',
    value: 'support@watermelon.ai',
    note: 'ตอบกลับภายใน 24 ชั่วโมง',
    tone: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
    live: false,
  },
];

const HELP_TOPICS = [
  { icon: 'photo_camera', title: 'การสแกนและวินิจฉัยโรค', count: 12 },
  { icon: 'map', title: 'การจัดการแปลงเพาะปลูก', count: 8 },
  { icon: 'notifications', title: 'การแจ้งเตือนผ่าน LINE', count: 7 },
  { icon: 'payments', title: 'การชำระเงินและแพ็กเกจ', count: 9 },
  { icon: 'lock', title: 'บัญชีและความปลอดภัย', count: 11 },
  { icon: 'smartphone', title: 'การใช้งานบนมือถือ', count: 6 },
];

export function Support() {
  const [sent, setSent] = useState(false);

  return (
    <MarketingShell>
      <section className="relative overflow-hidden bg-gradient-to-b from-surface-lowest via-surface-low to-surface py-14">
        <div className="pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-secondary-container/50 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Badge tone="secondary" className="mx-auto">
            <Icon name="support_agent" size={14} />
            ศูนย์ช่วยเหลือ
          </Badge>
          <h1 className="mt-3 text-headline-lg text-on-surface lg:text-display-lg">เราพร้อมช่วยคุณเสมอ</h1>
          <p className="mx-auto mt-3 max-w-2xl text-body-lg text-on-surface-variant">
            ทีมดูแลเกษตรกรและนักวิชาการเกษตรของเราพร้อมตอบทุกคำถาม ตั้งแต่การใช้งานแอปไปจนถึงเรื่องการจัดการแปลง
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {CHANNELS.map((channel) => (
            <Card key={channel.title} as="article" className="flex flex-col items-center gap-3 text-center">
              <span className={cn('flex size-14 items-center justify-center rounded-full', channel.tone)}>
                <Icon name={channel.icon} size={28} />
              </span>
              <div>
                <p className="flex items-center justify-center gap-2 text-label-lg font-bold text-on-surface">
                  {channel.title}
                  {channel.live ? <LiveBadge>ออนไลน์</LiveBadge> : null}
                </p>
                <p className="mt-1 text-title-md font-bold text-primary">{channel.value}</p>
                <p className="mt-0.5 text-caption text-on-surface-variant">{channel.note}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <CardHeader
              icon="forum"
              title="ส่งคำถามถึงทีมงาน"
              subtitle="กรอกรายละเอียดให้ครบ เราจะตอบกลับทางอีเมลและ LINE ของคุณ"
            />

            {sent ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <span className="flex size-16 items-center justify-center rounded-full bg-secondary-container">
                  <Icon name="check" size={36} className="text-secondary" />
                </span>
                <div>
                  <p className="text-headline-sm font-bold text-on-surface">ส่งคำถามเรียบร้อยแล้ว</p>
                  <p className="mx-auto mt-2 max-w-sm text-body-md text-on-surface-variant">
                    เลขที่คำขอ <span className="font-mono font-bold text-on-surface">SUP-2026-3391</span> —
                    ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง
                  </p>
                </div>
                <Button variant="ghost" onClick={() => setSent(false)}>
                  ส่งคำถามอื่น
                </Button>
              </div>
            ) : (
              <form
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSent(true);
                }}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="ชื่อ-นามสกุล" required>
                    <TextInput placeholder="สมศักดิ์ เกษตรมั่งคั่ง" required />
                  </Field>
                  <Field label="เบอร์โทรศัพท์" required>
                    <TextInput type="tel" placeholder="08X-XXX-XXXX" required />
                  </Field>
                </div>

                <Field label="อีเมล" required>
                  <TextInput type="email" placeholder="you@example.com" required />
                </Field>

                <Field label="หัวข้อที่ต้องการสอบถาม" required>
                  <select className={cn(INPUT_CLASS, 'cursor-pointer')} required>
                    <option value="">เลือกหัวข้อ</option>
                    {HELP_TOPICS.map((topic) => (
                      <option key={topic.title}>{topic.title}</option>
                    ))}
                    <option>เรื่องอื่น ๆ</option>
                  </select>
                </Field>

                <Field label="รายละเอียด" required hint="อธิบายสิ่งที่เกิดขึ้นให้ละเอียดที่สุด เพื่อให้เราช่วยได้ตรงจุด">
                  <textarea
                    rows={5}
                    required
                    placeholder="เช่น อัปโหลดภาพใบแล้วระบบขึ้นว่าประมวลผลไม่ได้ ลองมาแล้ว 3 ครั้ง ใช้มือถือ Android..."
                    className={cn(INPUT_CLASS, 'resize-none rounded-lg')}
                  />
                </Field>

                <div className="flex justify-end gap-2">
                  <Button type="submit" size="lg">
                    <Icon name="send" size={20} />
                    ส่งคำถาม
                  </Button>
                </div>
              </form>
            )}
          </Card>

          <div className="flex flex-col gap-4 lg:col-span-5">
            <Card>
              <CardHeader icon="menu_book" iconTone="secondary" title="หัวข้อช่วยเหลือยอดนิยม" />
              <ul className="flex flex-col gap-1">
                {HELP_TOPICS.map((topic) => (
                  <li key={topic.title}>
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-surface-low"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon name={topic.icon} size={20} className="text-on-surface-variant" />
                        <span className="truncate text-body-lg text-on-surface">{topic.title}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-caption text-on-surface-variant">{topic.count} บทความ</span>
                        <Icon name="chevron_right" size={18} className="text-outline" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="bg-mint-mist">
              <div className="flex items-start gap-3">
                <Icon name="edit_note" size={22} className="mt-0.5 shrink-0 text-secondary" />
                <div>
                  <p className="text-label-lg font-bold text-on-surface">พบว่า AI วิเคราะห์คลาดเคลื่อน?</p>
                  <p className="mt-1 text-body-md text-on-surface-variant">
                    แจ้งเราได้โดยตรง ทีมนักวิชาการจะตรวจสอบและปรับปรุงโมเดลให้แม่นยำขึ้น
                  </p>
                  <Link
                    to="/data-dispute"
                    className="mt-3 inline-flex items-center gap-1.5 text-label-lg font-semibold text-primary hover:underline"
                  >
                    แจ้งข้อมูลคลาดเคลื่อน
                    <Icon name="arrow_forward" size={16} />
                  </Link>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader icon="monitor_heart" title="สถานะระบบ" />
              <Link
                to="/status/200"
                className="flex items-center justify-between gap-3 rounded-md bg-mint-mist p-4 transition-colors hover:bg-secondary-container"
              >
                <span className="flex items-center gap-3">
                  <span className="size-2.5 animate-pulse rounded-full bg-secondary" />
                  <span className="text-body-lg font-semibold text-on-surface">ระบบทำงานปกติทุกส่วน</span>
                </span>
                <Icon name="chevron_right" size={18} className="text-on-surface-variant" />
              </Link>
            </Card>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
