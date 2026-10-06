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
import { formatTHB, formatTHBCompact } from '../lib/calc';
import {
  calculateAgronomyPlan,
  generate10WeekPlan,
  SPACING_PRESETS,
  PLANTING_SYSTEMS,
  SEASONS,
  SOIL_TYPES,
  type SeasonType,
  type SoilType,
} from '../lib/agronomyEngine';
import { GROWTH_STAGES, WEEKLY_TASKS, PLANTING_DEFAULTS } from '../data/cultivation';
import { CULTIVARS } from '../data/cultivars';

export function CultivationGuide() {
  // Scenario inputs
  const [rai, setRai] = useState(PLANTING_DEFAULTS.rai);
  const [ngan, setNgan] = useState(PLANTING_DEFAULTS.ngan);
  const [wa, setWa] = useState(PLANTING_DEFAULTS.wa);
  const [cultivarId, setCultivarId] = useState(CULTIVARS[0].id);
  const [spacingId, setSpacingId] = useState('standard');
  const [customPlantDist, setCustomPlantDist] = useState(0.5);
  const [customRowDist, setCustomRowDist] = useState(2.5);
  const [systemId, setSystemId] = useState('plastic_mulch');
  const [seasonId, setSeasonId] = useState<SeasonType>('dry_winter');
  const [soilId, setSoilId] = useState<SoilType>('sandy_loam');
  const [targetPrice, setTargetPrice] = useState<number | undefined>(undefined);

  // UI state
  const [tasks, setTasks] = useState(() => WEEKLY_TASKS.map((task) => ({ ...task })));
  const [showFullSeason, setShowFullSeason] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'nutrition' | 'water' | 'layout'>('overview');
  const [seasonTasksState, setSeasonTasksState] = useState<Record<string, boolean>>({});

  const guideSheet = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const { navigate } = useRouter();

  // Real AI Agronomy calculation
  const plan = useMemo(() => {
    return calculateAgronomyPlan({
      rai,
      ngan,
      wa,
      cultivarId,
      spacingId,
      customPlantDist: spacingId === 'custom' ? customPlantDist : undefined,
      customRowDist: spacingId === 'custom' ? customRowDist : undefined,
      systemId,
      seasonId,
      soilId,
      targetFruitPrice: targetPrice,
    });
  }, [
    rai,
    ngan,
    wa,
    cultivarId,
    spacingId,
    customPlantDist,
    customRowDist,
    systemId,
    seasonId,
    soilId,
    targetPrice,
  ]);

  // 10-week lifecycle generated from calculated values
  const tenWeeks = useMemo(() => {
    return generate10WeekPlan(plan.cultivar, plan.plants);
  }, [plan.cultivar, plan.plants]);

  const doneCount = tasks.filter((task) => task.done).length;

  function toggleSeasonTask(taskKey: string) {
    setSeasonTasksState((prev) => ({
      ...prev,
      [taskKey]: !prev[taskKey],
    }));
  }

  function handleCalculate() {
    toast.success(
      `AI คำนวณสำเร็จ: ได้จำนวน ${plan.plants.toLocaleString(
        'th-TH',
      )} ต้น คาดการณ์ผลผลิต ${plan.tonnesLow}–${plan.tonnesHigh} ตัน`,
    );
    document.getElementById('planting-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <AppShell>
      <PageContainer>
        <PageHeading
          eyebrow={
            <Badge tone="secondary">
              <Icon name="psychology" size={14} />
              โมดูลการเกษตรแม่นยำ AI Watermelon Agronomy Engine v4.5
            </Badge>
          }
          title="คู่มือปลูก & คำนวณแปลงอัจฉริยะ"
          description="วางแผนการเพาะปลูก จำลองผลผลิตและต้นทุนจากปัจจัยแปลงจริง พร้อมไทม์ไลน์ 5 ระยะการเติบโตและตารางงานตลอดฤดูกาล"
          actions={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => printElement(guideSheet.current, 'คู่มือปลูกแตงโมและแผนผังแปลง')}
              >
                <Icon name="download" size={18} />
                ส่งออกคู่มือ PDF
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  navigate(
                    `/chat?q=${encodeURIComponent(
                      `สวัสดีครับ ช่วยวางแผนการปลูกแตงโมสายพันธุ์ ${plan.cultivar.name} บนพื้นที่ ${rai} ไร่ ${ngan} งาน ใน${
                        SEASONS.find((s) => s.id === seasonId)?.label
                      } พร้อมแผนการให้น้ำและปุ๋ยทีครับ`,
                    )}`,
                  )
                }
              >
                <Icon name="forum" size={18} />
                ปรึกษา AI เรื่องแปลงนี้
              </Button>
            </>
          }
        />

        {/* SECTION 1: Interactive Scenario Builder & Calculator */}
        <Card className="mb-6">
          <CardHeader
            icon="tune"
            title="1. แผงจำลองปัจจัยแปลงเพาะปลูก & สายพันธุ์ (AI Simulator)"
            subtitle="กำหนดขนาดพื้นที่ สายพันธุ์ ระยะปลูก ระบบการปลูก และสภาพแวดล้อมเพื่อประมวลผลเชิงวิชาการ"
            action={
              <Badge tone="secondary">
                <Icon name="verified" size={14} />
                อิงสูตรวิชาการเกษตรแม่นยำ
              </Badge>
            }
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column: Form Controls */}
            <div className="flex flex-col gap-4.5 rounded-xl bg-surface-low p-5 lg:col-span-5">
              {/* Area Input */}
              <div>
                <label className="mb-2 block text-label-lg font-semibold text-on-surface">
                  <Icon name="square_foot" size={16} className="inline mr-1 text-primary" />
                  ขนาดพื้นที่ปลูกจริง
                </label>
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
                        className="w-full rounded-md bg-surface-lowest px-3 py-2 text-title-md font-bold text-on-surface shadow-sm outline-none transition-shadow focus:ring-2 focus:ring-primary"
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-caption text-on-surface-variant">
                  รวม {plan.totalSqm.toLocaleString('th-TH')} ตารางเมตร (พื้นที่ยกร่องใช้งานจริง{' '}
                  {Math.round(plan.usableSqm).toLocaleString('th-TH')} ตร.ม.)
                </p>
              </div>

              {/* Cultivar Selector */}
              <div>
                <label className="mb-2 block text-label-lg font-semibold text-on-surface">
                  <Icon name="eco" size={16} className="inline mr-1 text-secondary" />
                  สายพันธุ์แตงโม
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CULTIVARS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCultivarId(item.id)}
                      aria-pressed={cultivarId === item.id}
                      className={cn(
                        'flex cursor-pointer flex-col justify-between rounded-lg p-2.5 text-left transition-all duration-150 ease-tactile active:scale-[0.96]',
                        cultivarId === item.id
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'bg-surface-lowest text-on-surface-variant hover:bg-surface-container',
                      )}
                    >
                      <div>
                        <span className="block text-label-md font-bold leading-tight">{item.name}</span>
                        <span
                          className={cn(
                            'block text-caption mt-0.5',
                            cultivarId === item.id ? 'text-primary-fixed' : 'text-on-surface-variant',
                          )}
                        >
                          {item.shape} • {item.weight}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'mt-2 text-caption font-semibold',
                          cultivarId === item.id ? 'text-white/90' : 'text-secondary',
                        )}
                      >
                        {item.days} วัน • {item.brix[0]}–{item.brix[1]}° Brix
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Spacing & Planting System */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-caption font-semibold text-on-surface-variant">
                    ระยะต้น × ระยะแถว
                  </label>
                  <select
                    value={spacingId}
                    onChange={(e) => setSpacingId(e.target.value)}
                    className="w-full rounded-md bg-surface-lowest px-3 py-2 text-label-md font-medium text-on-surface shadow-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    {SPACING_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                    <option value="custom">กำหนดระยะเอง...</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-caption font-semibold text-on-surface-variant">
                    ระบบการปลูก
                  </label>
                  <select
                    value={systemId}
                    onChange={(e) => setSystemId(e.target.value)}
                    className="w-full rounded-md bg-surface-lowest px-3 py-2 text-label-md font-medium text-on-surface shadow-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    {PLANTING_SYSTEMS.map((sys) => (
                      <option key={sys.id} value={sys.id}>
                        {sys.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Spacing Inputs if selected */}
              {spacingId === 'custom' && (
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-lowest p-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-caption text-on-surface-variant">ระยะห่างระหว่างต้น (ม.)</span>
                    <input
                      type="number"
                      step={0.05}
                      min={0.3}
                      max={1.5}
                      value={customPlantDist}
                      onChange={(e) => setCustomPlantDist(Math.max(0.3, Number(e.target.value) || 0.5))}
                      className="rounded border border-outline-variant/40 px-2 py-1 text-label-md font-bold"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-caption text-on-surface-variant">ระยะห่างระหว่างแถว (ม.)</span>
                    <input
                      type="number"
                      step={0.1}
                      min={1.5}
                      max={4.0}
                      value={customRowDist}
                      onChange={(e) => setCustomRowDist(Math.max(1.5, Number(e.target.value) || 2.5))}
                      className="rounded border border-outline-variant/40 px-2 py-1 text-label-md font-bold"
                    />
                  </label>
                </div>
              )}

              {/* Season & Soil */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-caption font-semibold text-on-surface-variant">
                    ฤดูกาลเพาะปลูก
                  </label>
                  <select
                    value={seasonId}
                    onChange={(e) => setSeasonId(e.target.value as SeasonType)}
                    className="w-full rounded-md bg-surface-lowest px-3 py-2 text-label-md font-medium text-on-surface shadow-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    {SEASONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-caption font-semibold text-on-surface-variant">
                    สภาพดินประจำแปลง
                  </label>
                  <select
                    value={soilId}
                    onChange={(e) => setSoilId(e.target.value as SoilType)}
                    className="w-full rounded-md bg-surface-lowest px-3 py-2 text-label-md font-medium text-on-surface shadow-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    {SOIL_TYPES.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price override */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-caption font-semibold text-on-surface-variant">
                    ราคาจำหน่ายเป้าหมายหน้าสวน (บาท/กก.)
                  </label>
                  <span className="text-caption text-secondary">
                    ค่าเฉลี่ยตลาด: {plan.cultivar.market}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={60}
                    value={targetPrice ?? plan.avgPricePerKg}
                    onChange={(e) => setTargetPrice(Number(e.target.value) || undefined)}
                    className="w-32 rounded-md bg-surface-lowest px-3 py-2 text-label-lg font-bold text-on-surface shadow-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-label-md text-on-surface-variant">บาท/กก.</span>
                  {targetPrice !== undefined && (
                    <button
                      type="button"
                      onClick={() => setTargetPrice(undefined)}
                      className="cursor-pointer text-caption text-primary hover:underline"
                    >
                      รีเซ็ตเป็นค่าแนะนำ
                    </button>
                  )}
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="mt-2 w-full shadow-cta"
                onClick={handleCalculate}
              >
                <Icon name="auto_awesome" size={20} />
                คำนวณและจำลองผลผลิต AI ทันที
              </Button>
            </div>

            {/* Right Column: Key KPI Result Cards */}
            <div id="planting-result" className="flex flex-col gap-4 lg:col-span-7">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* 1. Seedlings */}
                <div className="rounded-xl bg-mint-mist p-5 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-label-md text-on-surface-variant font-medium">จำนวนต้นกล้าที่ต้องใช้</p>
                      <p className="mt-2 flex items-baseline gap-1.5 text-display-sm leading-none font-bold text-secondary">
                        {plan.plants.toLocaleString('th-TH')}
                        <span className="text-label-lg text-on-surface-variant">ต้น</span>
                      </p>
                    </div>
                    <span className="flex size-10 items-center justify-center rounded-full bg-secondary-container text-secondary">
                      <Icon name="potted_plant" size={22} />
                    </span>
                  </div>

                  <p className="mt-2 text-caption text-on-surface-variant">
                    เตรียมกล้าเผื่อปลูกซ่อม 4.5% ={' '}
                    <strong className="text-on-surface">
                      {plan.totalSeedlings.toLocaleString('th-TH')} ต้น
                    </strong>
                  </p>
                  <p className="text-caption text-on-surface-variant">
                    ความหนาแน่น {plan.plantsPerRai.toLocaleString('th-TH')} ต้น/ไร่ ({plan.densityStatus})
                  </p>
                  <Meter
                    value={plan.densityScore}
                    tone="secondary"
                    className="mt-3"
                    label={`ดัชนีความหนาแน่น: ${plan.densityScore}%`}
                  />
                </div>

                {/* 2. Yield projection */}
                <div className="rounded-xl bg-melon-tint p-5 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-label-md text-on-surface-variant font-medium">คาดการณ์ผลผลิตรวม</p>
                      <p className="mt-2 flex items-baseline gap-1.5 text-display-sm leading-none font-bold text-primary">
                        {plan.tonnesLow} – {plan.tonnesHigh}
                        <span className="text-label-lg text-on-surface-variant">ตัน</span>
                      </p>
                    </div>
                    <span className="flex size-10 items-center justify-center rounded-full bg-primary-fixed text-primary">
                      <Icon name="scale" size={22} />
                    </span>
                  </div>

                  <p className="mt-2 text-caption text-on-surface-variant">
                    เกรด A (ส่งออก/ห้าง): <strong className="text-on-surface">{plan.gradeAYieldTonnes} ตัน</strong> •
                    เกรด B: {plan.gradeBYieldTonnes} ตัน
                  </p>
                  <p className="text-caption text-on-surface-variant">
                    ความหวานเป้าหมาย {plan.expectedBrixLow} – {plan.expectedBrixHigh}° Brix
                  </p>
                  <Meter
                    value={plan.yieldScore}
                    tone="primary"
                    className="mt-3"
                    label={`ศักยภาพผลผลิต: ${plan.yieldScore}%`}
                  />
                </div>

                {/* 3. Cost */}
                <div className="rounded-xl bg-surface-low p-5 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-label-md text-on-surface-variant font-medium">ประมาณการต้นทุนรวม</p>
                      <p className="mt-2 text-headline-md font-bold text-on-surface">
                        {formatTHB(plan.totalCost)}
                      </p>
                    </div>
                    <span className="flex size-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
                      <Icon name="receipt_long" size={22} />
                    </span>
                  </div>

                  <ul className="mt-2 flex flex-col gap-1 text-caption text-on-surface-variant">
                    <li>• เมล็ด & เพาะกล้า: {formatTHB(plan.seedCost)} ({formatTHB(plan.costPerPlant)}/ต้น)</li>
                    <li>• พลาสติก & สายน้ำหยด: {formatTHB(plan.mulchAndDripCost)}</li>
                    <li>• ปุ๋ย & ธาตุอาหาร: {formatTHB(plan.fertilizerCost)}</li>
                    <li>• แรงงาน & เตรียมดิน: {formatTHB(plan.laborAndPrepCost)}</li>
                  </ul>
                  <p className="mt-2 text-caption font-semibold text-outline">
                    เฉลี่ย {formatTHB(plan.costPerRai)} / ไร่
                  </p>
                </div>

                {/* 4. Revenue & Net Profit */}
                <div className="rounded-xl bg-surface-low p-5 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-label-md text-on-surface-variant font-medium">รายได้ & กำไรสุทธิคาดการณ์</p>
                      <p className="mt-2 text-headline-md font-bold text-secondary">
                        {formatTHBCompact(plan.netProfitLow)} – {formatTHBCompact(plan.netProfitHigh)}
                      </p>
                    </div>
                    <span className="flex size-10 items-center justify-center rounded-full bg-secondary-container text-secondary">
                      <Icon name="payments" size={22} />
                    </span>
                  </div>

                  <p className="mt-2 text-caption text-on-surface-variant">
                    รายได้ขั้นต้น (Gross): {formatTHBCompact(plan.grossRevenueLow)} –{' '}
                    {formatTHBCompact(plan.grossRevenueHigh)}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-caption font-bold text-secondary">
                    <Icon name="trending_up" size={16} />
                    ผลตอบแทนการลงทุน (ROI): {plan.roiLow}% – {plan.roiHigh}%
                  </p>
                  <p className="mt-1 text-caption text-outline">
                    คิดจากราคาขาย {plan.avgPricePerKg} ฿/กก.
                  </p>
                </div>
              </div>

              {/* Sub-tabs for deep agronomic details: nutrition, water, layout */}
              <div className="rounded-xl border border-outline-variant/30 bg-surface-lowest p-4">
                <div className="mb-3 flex border-b border-outline-variant/20 pb-2">
                  {[
                    { id: 'overview', label: 'สรุปคำแนะนำ AI', icon: 'lightbulb' },
                    { id: 'nutrition', label: 'โปรแกรมปุ๋ย 5 ระยะ', icon: 'science' },
                    { id: 'water', label: 'ความต้องการน้ำ', icon: 'water_drop' },
                    { id: 'layout', label: 'ผังโครงสร้างแปลง', icon: 'grid_view' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-label-md font-semibold transition-colors',
                        activeTab === tab.id
                          ? 'bg-surface-container font-bold text-primary shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface',
                      )}
                    >
                      <Icon name={tab.icon} size={16} />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab 1: AI Insights */}
                {activeTab === 'overview' && (
                  <div className="flex flex-col gap-2.5">
                    {plan.aiInsights.map((insight, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'rounded-lg p-3 text-body-md',
                          insight.tone === 'positive' && 'bg-mint-mist/70 text-on-surface',
                          insight.tone === 'warning' && 'bg-melon-tint/80 text-on-surface',
                          insight.tone === 'info' && 'bg-surface-low text-on-surface',
                        )}
                      >
                        <p className="flex items-center gap-1.5 font-bold text-label-lg">
                          <Icon
                            name={
                              insight.tone === 'positive'
                                ? 'check_circle'
                                : insight.tone === 'warning'
                                ? 'warning'
                                : 'info'
                            }
                            size={16}
                            className={
                              insight.tone === 'positive'
                                ? 'text-secondary'
                                : insight.tone === 'warning'
                                ? 'text-primary'
                                : 'text-outline'
                            }
                          />
                          {insight.title}
                        </p>
                        <p className="mt-1 text-body-md text-on-surface-variant">{insight.detail}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab 2: Fertilizer Breakdown */}
                {activeTab === 'nutrition' && (
                  <div>
                    <p className="mb-2 text-caption text-on-surface-variant">
                      สูตรและปริมาณปุ๋ยมาตรฐานกรมวิชาการเกษตร คำนวณตามพื้นที่ {rai} ไร่ {ngan} งาน:
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-body-md">
                        <thead>
                          <tr className="border-b border-outline-variant/30 text-caption text-outline">
                            <th className="py-2">ระยะการเติบโต</th>
                            <th className="py-2">สูตรปุ๋ยที่แนะนำ</th>
                            <th className="py-2 text-right">ปริมาณทั้งแปลง</th>
                            <th className="py-2">วิธีการใส่</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/20">
                          {plan.stageFertilizers.map((sf) => (
                            <tr key={sf.stage}>
                              <td className="py-2.5 font-medium text-on-surface">
                                ระยะที่ {sf.stage}: {sf.title}
                              </td>
                              <td className="py-2.5 text-secondary font-semibold">{sf.formula}</td>
                              <td className="py-2.5 text-right font-bold text-on-surface">
                                {sf.kgTotal > 0 ? `${sf.kgTotal.toLocaleString('th-TH')} กก.` : '—'}
                              </td>
                              <td className="py-2.5 text-caption text-on-surface-variant">{sf.timing}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab 3: Water Requirements */}
                {activeTab === 'water' && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg bg-surface-low p-3 text-center">
                        <span className="text-caption text-on-surface-variant">ความต้องการน้ำ/วัน</span>
                        <p className="mt-1 text-title-md font-bold text-primary">
                          {plan.dailyWaterCubicMeters} ลบ.ม.
                        </p>
                      </div>
                      <div className="rounded-lg bg-surface-low p-3 text-center">
                        <span className="text-caption text-on-surface-variant">น้ำรวมตลอดฤดู</span>
                        <p className="mt-1 text-title-md font-bold text-secondary">
                          {plan.totalWaterCubicMeters.toLocaleString('th-TH')} ลบ.ม.
                        </p>
                      </div>
                      <div className="rounded-lg bg-surface-low p-3 text-center">
                        <span className="text-caption text-on-surface-variant">รอบการให้น้ำ</span>
                        <p className="mt-1 text-title-md font-bold text-on-surface">
                          {plan.waterCyclesPerDay} รอบ/วัน
                        </p>
                      </div>
                      <div className="rounded-lg bg-surface-low p-3 text-center">
                        <span className="text-caption text-on-surface-variant">ระยะเวลาต่อรอบ</span>
                        <p className="mt-1 text-title-md font-bold text-on-surface">
                          {plan.cycleDurationMinutes} นาที
                        </p>
                      </div>
                    </div>
                    <p className="text-caption text-on-surface-variant">
                      💡 คำแนะนำ: สำหรับ{SOIL_TYPES.find((s) => s.id === soilId)?.label} ควรให้น้ำช่วงเช้าตรู่ 06:00 –
                      08:00 น. และงดน้ำโดยเด็ดขาด 5–7 วันก่อนเก็บเกี่ยวเพื่อความหวานสูงสุด
                    </p>
                  </div>
                )}

                {/* Tab 4: Physical Layout Blueprint */}
                {activeTab === 'layout' && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg bg-surface-low p-3 text-center">
                        <span className="text-caption text-on-surface-variant">จำนวนแถวปลูก</span>
                        <p className="mt-1 text-title-md font-bold text-on-surface">
                          ~{plan.rowsCount} แถว
                        </p>
                      </div>
                      <div className="rounded-lg bg-surface-low p-3 text-center">
                        <span className="text-caption text-on-surface-variant">ความยาวแถวเฉลี่ย</span>
                        <p className="mt-1 text-title-md font-bold text-on-surface">
                          {plan.avgRowLengthMeters} เมตร
                        </p>
                      </div>
                      <div className="rounded-lg bg-surface-low p-3 text-center">
                        <span className="text-caption text-on-surface-variant">จำนวนต้นต่อแถว</span>
                        <p className="mt-1 text-title-md font-bold text-on-surface">
                          ~{plan.plantsPerRow} ต้น
                        </p>
                      </div>
                      <div className="rounded-lg bg-surface-low p-3 text-center">
                        <span className="text-caption text-on-surface-variant">พลาสติกคลุมดิน</span>
                        <p className="mt-1 text-title-md font-bold text-primary">
                          {plan.mulchRollsNeeded} ม้วน (400ม.)
                        </p>
                      </div>
                    </div>
                    <p className="text-caption text-on-surface-variant">
                      สายน้ำหยดที่ต้องใช้: รวม {plan.dripLineMeters.toLocaleString('th-TH')} เมตร (หัวน้ำหยดระยะ{' '}
                      {plan.plantSpacingArea < 1 ? '30–40 ซม.' : '50 ซม.'})
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* SECTION 2: 5 Growth Stages (Printable in PDF) */}
        <section className="mt-8" ref={guideSheet}>
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
              ปัจจุบันแปลงต้นแบบอยู่ระยะที่ 3
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
                  <p
                    className={cn(
                      'mt-0.5 text-label-lg font-bold',
                      stage.critical ? 'text-primary' : 'text-on-surface',
                    )}
                  >
                    {stage.note.value}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* SECTION 3: Weekly Tasks & Full 10-Week Schedule */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              icon="checklist"
              iconTone="secondary"
              title="ตารางการให้น้ำ & สารอาหารประจำสัปดาห์ปัจจุบัน"
              subtitle="สัปดาห์ที่ 4 — วันที่ 28 ของรอบแปลง (ระยะออกดอกและผสมเกสร)"
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
                      className="mt-0.5 size-5 shrink-0 accent-secondary"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-body-lg font-semibold text-on-surface">{task.label}</span>
                      <span className="block text-caption text-on-surface-variant">{task.detail}</span>
                    </span>
                    <Badge tone={task.urgent ? 'primary' : 'neutral'}>
                      {task.urgent ? 'เร่งด่วน' : 'รอดำเนินการ'}
                    </Badge>
                  </label>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/20 pt-4">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullSeason((value) => !value)}
              >
                <Icon name={showFullSeason ? 'expand_less' : 'calendar_month'} size={16} />
                {showFullSeason ? 'ซ่อนตารางทั้งฤดูกาล' : 'ดูตารางปฏิบัติงานทั้ง 10 สัปดาห์'}
              </Button>
            </div>

            {/* FULL 10-WEEK SEASON ACCORDION */}
            {showFullSeason && (
              <div className="mt-6 border-t border-outline-variant/30 pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-headline-sm font-bold text-on-surface">
                    🗓️ ตารางงานตลอดฤดูกาล 10 สัปดาห์ (คำนวณสำหรับพันธุ์ {plan.cultivar.name})
                  </h3>
                  <Badge tone="primary">ครบวงจร 70 วัน</Badge>
                </div>

                <div className="flex flex-col gap-4">
                  {tenWeeks.map((week) => {
                    return (
                      <div
                        key={week.week}
                        className={cn(
                          'rounded-xl border p-4 transition-all',
                          week.critical
                            ? 'border-primary/40 bg-melon-tint/40'
                            : 'border-outline-variant/30 bg-surface-lowest',
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/20 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-caption font-bold text-on-secondary">
                              W{week.week}
                            </span>
                            <span className="text-label-lg font-bold text-on-surface">
                              สัปดาห์ที่ {week.week} ({week.days})
                            </span>
                            <span className="text-caption text-on-surface-variant">• {week.stageName}</span>
                          </div>
                          {week.critical && <Badge tone="primary">ช่วงวิกฤตชี้ขาดผลผลิต</Badge>}
                        </div>

                        <p className="mt-2 text-title-md font-semibold text-primary">{week.focusTitle}</p>

                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <span className="text-caption font-semibold text-outline uppercase tracking-wider">
                              รายการปฏิบัติงาน:
                            </span>
                            <ul className="mt-1 flex flex-col gap-1.5">
                              {week.checklist.map((item, idx) => {
                                const key = `w${week.week}_${idx}`;
                                const isChecked = !!seasonTasksState[key];
                                return (
                                  <li key={idx} className="flex items-start gap-2">
                                    <input
                                      type="checkbox"
                                      id={key}
                                      checked={isChecked}
                                      onChange={() => toggleSeasonTask(key)}
                                      className="mt-1 size-4 accent-secondary cursor-pointer shrink-0"
                                    />
                                    <label
                                      htmlFor={key}
                                      className={cn(
                                        'text-body-md cursor-pointer',
                                        isChecked ? 'text-outline line-through' : 'text-on-surface',
                                      )}
                                    >
                                      {item}
                                    </label>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>

                          <div className="flex flex-col gap-2 rounded-lg bg-surface-low p-3 text-caption">
                            <div>
                              <strong className="text-secondary flex items-center gap-1">
                                <Icon name="water_drop" size={14} /> การให้น้ำ:
                              </strong>
                              <span className="text-on-surface-variant block mt-0.5">{week.waterAdvice}</span>
                            </div>
                            <div>
                              <strong className="text-primary flex items-center gap-1">
                                <Icon name="science" size={14} /> ปุ๋ย & ธาตุอาหาร:
                              </strong>
                              <span className="text-on-surface-variant block mt-0.5">{week.fertilizerPlan}</span>
                            </div>
                            <div>
                              <strong className="text-error flex items-center gap-1">
                                <Icon name="warning" size={14} /> ข้อควรระวัง:
                              </strong>
                              <span className="text-on-surface-variant block mt-0.5">{week.riskAlert}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Right Column: Disease Alert & Agronomist Support */}
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
                    สภาพอากาศ{SEASONS.find((s) => s.id === seasonId)?.label} ระวังโรคราน้ำค้าง (Downy Mildew)
                    และแอนแทรคโนส ความหนาแน่นของสปอร์ในพื้นที่เพิ่มขึ้น คาดการณ์ระบาดรวดเร็ว
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-lowest p-4">
                <div>
                  <p className="text-caption text-on-surface-variant">แนะนำพ่นชีวภัณฑ์ป้องกัน</p>
                  <p className="mt-0.5 text-label-lg font-bold text-on-surface">
                    ไตรโคเดอร์มา 100 กรัม / น้ำ 20 ลิตร (PHI 0 วัน ปลอดสารพิษ)
                  </p>
                </div>
                <Button size="sm" onClick={() => navigate('/alerts?focus=disease')}>
                  <Icon name="notifications_active" size={16} />
                  ตั้งเตือนพ่นยา
                </Button>
              </div>
            </Card>

            <Card>
              <CardHeader icon="support_agent" iconTone="tertiary" title="นักวิชาการเกษตรประจำพื้นที่" />
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
                    ตอบกลับทางออนไลน์ (เชื่อมต่อผ่าน Melon AI)
                  </p>
                </div>
                <Button
                  variant="tonal"
                  size="sm"
                  className="shrink-0"
                  onClick={() =>
                    navigate(
                      `/chat?q=${encodeURIComponent(
                        `เรียน อาจารย์สุพจน์ ครับ ผมกำลังวางแผนปลูกแตงโม ${plan.cultivar.name} จำนวน ${rai} ไร่ อยากขอคำปรึกษาเพิ่มเติมเรื่องการจัดการแปลงและการผสมเกสรครับ`,
                      )}`,
                    )
                  }
                >
                  <Icon name="chat" size={16} />
                  ปรึกษา
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
