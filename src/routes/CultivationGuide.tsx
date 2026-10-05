import { useMemo, useRef, useState } from 'react';
import { AppShell, PageContainer, PageHeading } from '../components/layout/AppShell';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Meter } from '../components/ui/Meter';
import { useToast } from '../components/ui/Toast';
import { useRouter } from '../lib/router';
import { printElement } from '../lib/export';
import { cn } from '../lib/cn';
import { formatTHB, formatTHBCompact, plantingPlan } from '../lib/calc';
import { GROWTH_STAGES, WEEKLY_TASKS, PLANTING_DEFAULTS } from '../data/cultivation';
import { CULTIVARS } from '../data/cultivars';

export function CultivationGuide() {
  const [rai, setRai] = useState(PLANTING_DEFAULTS.rai);
  const [ngan, setNgan] = useState(PLANTING_DEFAULTS.ngan);
  const [wa, setWa] = useState(PLANTING_DEFAULTS.wa);
  const [cultivarId, setCultivarId] = useState(CULTIVARS[0].id);
  const [tasks, setTasks] = useState(() => WEEKLY_TASKS.map((task) => ({ ...task })));
  const [showFullSeason, setShowFullSeason] = useState(false);
  const guideSheet = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const { navigate } = useRouter();

  const cultivar = CULTIVARS.find((item) => item.id === cultivarId) ?? CULTIVARS[0];

  // Yield scales with the chosen cultivar's fruit weight, so recompute on change.
  const plan = useMemo(() => {
    const [low, high] = cultivar.weight
      .replace(/[^\d.–\-]/g, '')
      .split(/[–\-]/)
      .map(Number);
    return plantingPlan({ rai, ngan, wa }, low || 4, high || 5);
  }, [rai, ngan, wa, cultivar.weight]);

  const doneCount = tasks.filter((task) => task.done).length;

  return (
    <AppShell>
      <PageContainer>
        <PageHeading
          eyebrow={
            <Badge tone="secondary">
              <Icon name="eco" size={14} />
              โมดูลการเกษตรแม่นยำ AI Watermelon Agronomy v4.2
            </Badge>
          }
          title="คู่มือปลูก & ดูแลรักษา"
          description="วางแผนการเพาะปลูก คำนวณต้นทุนและผลผลิตจากขนาดพื้นที่จริง พร้อมไทม์ไลน์ 5 ระยะการเติบโตและตารางงานประจำสัปดาห์"
          actions={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => printElement(guideSheet.current, 'คู่มือปลูกแตงโม 5 ระยะ')}
              >
                <Icon name="download" size={18} />
                คู่มือฉบับเต็ม PDF
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  navigate(
                    `/chat?q=${encodeURIComponent('ช่วยแนะนำแผนการดูแลแปลงแตงโมในระยะออกดอกและผสมเกสรให้หน่อยครับ')}`,
                  )
                }
              >
                <Icon name="forum" size={18} />
                ปรึกษา AI เรื่องการปลูก
              </Button>
            </>
          }
        />

        <Card>
          <CardHeader
            icon="calculate"
            title="ระบบคำนวณพื้นที่และสายพันธุ์การปลูกอัจฉริยะ"
            subtitle="ประมาณการจำนวนต้น ผลผลิต และรายได้ขั้นต้นตามมาตรฐานวิชาการเกษตร"
            action={
              <Badge tone="secondary">
                <Icon name="verified" size={14} />
                อิงสูตรกรมวิชาการเกษตร
              </Badge>
            }
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="flex flex-col gap-4 rounded-lg bg-surface-low p-5 lg:col-span-5">
              <div>
                <p className="mb-2 text-label-lg font-semibold text-on-surface">ขนาดพื้นที่ปลูกจริง</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'ไร่', value: rai, set: setRai, max: 500 },
                    { label: 'งาน', value: ngan, set: setNgan, max: 3 },
                    { label: 'ตารางวา', value: wa, set: setWa, max: 99 },
                  ].map((field) => (
                    <label key={field.label} className="flex flex-col gap-1">
                      <span className="text-caption text-on-surface-variant">{field.label}</span>
                      <input
                        type="number"
                        min={0}
                        max={field.max}
                        value={field.value}
                        onChange={(event) =>
                          field.set(Math.max(0, Math.min(field.max, Number(event.target.value) || 0)))
                        }
                        className="w-full rounded-md bg-surface-lowest px-3 py-2.5 text-title-md font-bold text-on-surface shadow-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-label-lg font-semibold text-on-surface">สายพันธุ์ที่ต้องการปลูก</p>
                <div className="grid grid-cols-3 gap-2">
                  {CULTIVARS.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCultivarId(item.id)}
                      aria-pressed={cultivarId === item.id}
                      className={cn(
                        'cursor-pointer rounded-md px-2 py-2.5 text-center transition-all duration-150 ease-tactile active:scale-[0.96]',
                        cultivarId === item.id
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'bg-surface-lowest text-on-surface-variant hover:bg-surface-container',
                      )}
                    >
                      <span className="block text-label-lg font-bold">{item.name}</span>
                      <span
                        className={cn(
                          'block text-caption',
                          cultivarId === item.id ? 'text-primary-fixed' : 'text-on-surface-variant',
                        )}
                      >
                        {item.shape}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-caption text-on-surface-variant">ระยะต้น × ระยะแถว (ม.)</span>
                  <span className="rounded-md bg-surface-lowest px-3 py-2.5 text-body-md font-semibold text-on-surface shadow-sm">
                    {PLANTING_DEFAULTS.spacing}
                  </span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-caption text-on-surface-variant">รูปแบบระบบการปลูก</span>
                  <span className="rounded-md bg-surface-lowest px-3 py-2.5 text-body-md font-semibold text-on-surface shadow-sm">
                    {PLANTING_DEFAULTS.system}
                  </span>
                </label>
              </div>

              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={() => {
                  toast.success(
                    `คำนวณแล้ว: ${plan.plants.toLocaleString('th-TH')} ต้น บนพื้นที่ ${plan.sqm.toLocaleString('th-TH')} ตร.ม.`,
                  );
                  document.getElementById('planting-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >
                <Icon name="auto_awesome" size={20} />
                คำนวณและสร้างแผนผังแปลง
              </Button>
            </div>

            <div id="planting-result" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-7">
              <div className="rounded-lg bg-mint-mist p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-label-md text-on-surface-variant">จำนวนต้นกล้าที่ต้องใช้</p>
                  <Icon name="potted_plant" size={20} className="text-secondary" />
                </div>
                <p className="mt-2 flex items-baseline gap-1.5 text-display-sm leading-none font-bold text-secondary">
                  {plan.plants.toLocaleString('th-TH')}
                  <span className="text-label-lg text-on-surface-variant">ต้น</span>
                </p>
                <p className="mt-2 text-caption text-on-surface-variant">
                  พื้นที่รวม {plan.sqm.toLocaleString('th-TH')} ตร.ม. (เผื่อทางเดิน 10%)
                </p>
                <Meter value={72} tone="secondary" className="mt-3" label="ความหนาแน่นการปลูก" />
              </div>

              <div className="rounded-lg bg-melon-tint p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-label-md text-on-surface-variant">คาดการณ์ผลผลิตรวม</p>
                  <Icon name="scale" size={20} className="text-primary" />
                </div>
                <p className="mt-2 flex items-baseline gap-1.5 text-display-sm leading-none font-bold text-primary">
                  {plan.tonnesLow.toFixed(1)} – {plan.tonnesHigh.toFixed(1)}
                  <span className="text-label-lg text-on-surface-variant">ตัน</span>
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-caption text-on-surface-variant">
                  <Icon name="straighten" size={14} />
                  เฉลี่ย {cultivar.weight} ต่อผล
                </p>
                <Meter value={84} tone="primary" className="mt-3" label="คาดการณ์ผลผลิต" />
              </div>

              <div className="rounded-lg bg-surface-low p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-label-md text-on-surface-variant">ประมาณการทุนเมล็ดพันธุ์</p>
                  <Icon name="receipt_long" size={20} className="text-on-surface-variant" />
                </div>
                <p className="mt-2 text-headline-md font-bold text-on-surface">{formatTHB(plan.seedCost)}</p>
                <ul className="mt-2 flex flex-col gap-1 text-caption text-on-surface-variant">
                  <li>— ฿8.75 ต่อต้น (เมล็ดพันธุ์ ถุงเพาะ และวัสดุปลูก)</li>
                  <li>— เผื่อกล้าเสียหายและปลูกซ่อม 4.5%</li>
                </ul>
              </div>

              <div className="rounded-lg bg-surface-low p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-label-md text-on-surface-variant">รายได้ขั้นต้นที่คาดการณ์ (Gross)</p>
                  <Icon name="payments" size={20} className="text-secondary" />
                </div>
                <p className="mt-2 text-headline-md font-bold text-secondary">
                  {formatTHBCompact(plan.grossLow)} – {formatTHBCompact(plan.grossHigh)}
                </p>
                <p className="mt-2 text-caption text-on-surface-variant">
                  อ้างอิงราคาหน้าสวนปัจจุบัน 15 – 18 บาท/กก.
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-caption text-secondary">
                  <Icon name="trending_up" size={14} />
                  กำไรสุทธิคาดการณ์ {formatTHBCompact(plan.netLow)} – {formatTHBCompact(plan.netHigh)}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-container p-4 sm:col-span-2">
                <span className="flex items-center gap-2 text-body-md text-on-surface-variant">
                  <Icon name="calendar_month" size={18} className="text-primary" />
                  ระยะเวลาปลูกถึงวันเก็บเกี่ยว: เฉลี่ย {cultivar.days} วัน
                </span>
                <Badge tone="secondary">ความหวานเป้าหมาย: {cultivar.brix[0]} – {cultivar.brix[1]}° Brix</Badge>
              </div>
            </div>
          </div>
        </Card>

        <section className="mt-6" ref={guideSheet}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-headline-sm font-bold text-on-surface">
                <Icon name="timeline" size={22} className="text-secondary" />
                คู่มือการดูแล 5 ระยะการเติบโตของแตงโม
              </h2>
              <p className="mt-1 text-body-md text-on-surface-variant">
                ขั้นตอนปฏิบัติงานเชิงลึกที่สำคัญและจุดตัดสินใจที่มีผลต่อคุณภาพผลผลิต
              </p>
            </div>
            <Badge tone="primary">
              <Icon name="flag" size={14} />
              ปัจจุบันอยู่ระยะที่ 3
            </Badge>
          </div>

          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {GROWTH_STAGES.map((stage) => (
              <li
                key={stage.stage}
                className={cn(
                  'flex flex-col gap-3 rounded-lg p-5 shadow-card',
                  stage.critical ? 'bg-melon-tint ring-2 ring-primary/30' : 'bg-surface-lowest',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={stage.critical ? 'primary' : 'secondary'}>{stage.range}</Badge>
                  <span className="text-caption font-semibold text-outline">ระยะที่ {stage.stage}</span>
                </div>

                <div>
                  <h3 className="text-title-md font-bold text-on-surface">{stage.title}</h3>
                  <p className="mt-1 text-body-md text-on-surface-variant">{stage.summary}</p>
                </div>

                <ul className="flex flex-col gap-2">
                  {stage.tasks.map((task) => (
                    <li key={task} className="flex items-start gap-1.5 text-body-md text-on-surface-variant">
                      <Icon name="check_circle" size={15} className="mt-1 shrink-0 text-secondary" />
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>

                <div
                  className={cn(
                    'mt-auto rounded-md p-3',
                    stage.critical ? 'bg-surface-lowest' : 'bg-surface-low',
                  )}
                >
                  <p className="text-caption text-on-surface-variant">{stage.note.label}</p>
                  <p className={cn('mt-0.5 text-label-lg font-bold', stage.critical ? 'text-primary' : 'text-on-surface')}>
                    {stage.note.value}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              icon="checklist"
              iconTone="secondary"
              title="ตารางการให้น้ำ & สารอาหารรายสัปดาห์"
              subtitle={`สัปดาห์ที่ 4 — วันที่ 28 ของรอบแปลง (ระยะออกดอกและผสมเกสร)`}
              action={
                <Badge tone="secondary">
                  {doneCount}/{tasks.length} เสร็จแล้ว
                </Badge>
              }
            />

            <ul className="flex flex-col gap-2">
              {tasks.map((task) => (
                <li key={task.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-md p-4 transition-colors',
                      task.done ? 'bg-mint-mist' : 'bg-surface-low hover:bg-surface-container',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() =>
                        setTasks((prev) =>
                          prev.map((item) => (item.id === task.id ? { ...item, done: !item.done } : item)),
                        )
                      }
                      className="mt-0.5 size-5 shrink-0 accent-[#1b6b44]"
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block text-body-lg font-semibold',
                          task.done ? 'text-on-surface' : 'text-on-surface',
                        )}
                      >
                        {task.label}
                      </span>
                      <span className="block text-caption text-on-surface-variant">{task.detail}</span>
                    </span>
                    <Badge tone={task.urgent ? 'primary' : 'neutral'}>{task.urgent ? 'เร่งด่วน' : 'รอดำเนินการ'}</Badge>
                  </label>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-[12rem] flex-1 items-center gap-3">
                <span className="text-caption text-on-surface-variant">ความคืบหน้ารอบนี้</span>
                <Meter
                  value={(doneCount / tasks.length) * 100}
                  tone="secondary"
                  className="max-w-40"
                  label="ความคืบหน้างานประจำสัปดาห์"
                />
                <span className="text-label-md font-bold text-on-surface">
                  {Math.round((doneCount / tasks.length) * 100)}%
                </span>
              </div>
              <Button variant="quiet" size="sm" onClick={() => setShowFullSeason((value) => !value)}>
                {showFullSeason ? 'ย่อกลับ' : 'ดูตารางทั้งฤดูกาล'}
                <Icon name={showFullSeason ? 'expand_less' : 'arrow_forward'} size={16} />
              </Button>
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="border-2 border-error/20 bg-melon-tint">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-error-container text-on-error-container">
                  <Icon name="warning" size={22} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-title-md font-bold text-on-surface">การแจ้งเตือนโรคพืชประจำแปลง</h3>
                    <Badge tone="error">ด่วน</Badge>
                  </div>
                  <p className="mt-1.5 text-body-md text-on-surface-variant">
                    สภาพอากาศฝนตกสลับแดดจัด ระวังโรคราน้ำค้าง (Downy Mildew) และราแป้งในกลุ่มเถาแตงโม
                    ความหนาแน่นของสปอร์ในแปลงรอบข้างเพิ่มขึ้น 88% และคาดการณ์ว่าจะลามถึงแปลงคุณภายใน 3 วัน
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-lowest p-4">
                <div>
                  <p className="text-caption text-on-surface-variant">แนะนำพ่นป้องกันทันที</p>
                  <p className="mt-0.5 text-label-lg font-bold text-on-surface">
                    ไตรโคเดอร์มา (Trichoderma harzianum) 100 กรัม/น้ำ 20 ลิตร
                  </p>
                </div>
                <Button size="sm" onClick={() => navigate('/alerts?focus=disease')}>
                  <Icon name="notifications_active" size={16} />
                  ตั้งเตือนพ่นยา
                </Button>
              </div>
            </Card>

            <Card>
              <CardHeader icon="support_agent" iconTone="tertiary" title="นักวิชาการประจำพื้นที่" />
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-tertiary-fixed text-title-md font-bold text-on-tertiary-fixed-variant">
                  ส
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-label-lg font-bold text-on-surface">อ. สุพจน์ รุ่งโรจน์สุวรรณ</p>
                  <p className="text-caption text-on-surface-variant">
                    ผู้เชี่ยวชาญแตงโมไร้เมล็ด และการจัดการโรคพืชเขตร้อน
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-caption text-secondary">
                    <span className="size-1.5 rounded-full bg-secondary" />
                    ตอบกลับทางออนไลน์ (ตอบกลับภายใน 15 นาที)
                  </p>
                </div>
                <Button variant="tonal" size="sm" className="shrink-0">
                  <Icon name="chat" size={16} />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
