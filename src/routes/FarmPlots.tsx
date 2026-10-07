import { useEffect, useMemo, useState } from 'react';
import { AppShell, PageContainer, PageHeading } from '../components/layout/AppShell';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge, LiveBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Meter } from '../components/ui/Meter';
import { StatTile } from '../components/ui/StatTile';
import { Link, useRouter } from '../lib/router';
import { cn } from '../lib/cn';
import { api, ApiError, NetworkError, type DiseaseRecord } from '../lib/api';
import { getLocalDiseaseHistory } from '../lib/chatHistory';
import { useToast } from '../components/ui/Toast';
import { AddPlotModal, type NewPlot } from '../components/domain/AddPlotModal';
import { ZoneDetailModal, type ZoneData } from '../components/domain/ZoneDetailModal';
import { ActionPlanModal } from '../components/domain/ActionPlanModal';
import { EditPlotModal, type EditablePlot, type PlotHealth } from '../components/domain/EditPlotModal';
import { AddActivityModal, type FarmActivity } from '../components/domain/AddActivityModal';
import { CULTIVARS } from '../data/cultivars';

export type Plot = EditablePlot;

const DEFAULT_PLOTS: readonly Plot[] = [
  {
    id: 'plot-1',
    name: 'แปลงที่ 1 — ทุ่งเหนือ',
    location: 'ต.สระกระโจม อ.ดอนเจดีย์ จ.สุพรรณบุรี',
    size: '8 ไร่ 2 งาน',
    cultivar: 'ตอร์ปิโด',
    stage: 'ขยายผล & สะสมแป้ง',
    day: 44,
    totalDays: 65,
    health: 'ดีเยี่ยม',
    moisture: 68,
    brix: 10.8,
    expectedYield: '31.5 ตัน',
    harvest: '28 พ.ค. 2569',
  },
  {
    id: 'plot-2',
    name: 'แปลงที่ 2 — ริมคลอง',
    location: 'ต.สระกระโจม อ.ดอนเจดีย์ จ.สุพรรณบุรี',
    size: '5 ไร่',
    cultivar: 'กินรี 202',
    stage: 'ออกดอก & ผสมเกสร',
    day: 28,
    totalDays: 60,
    health: 'เฝ้าระวัง',
    moisture: 54,
    brix: 0,
    expectedYield: '18.0 ตัน',
    harvest: '15 มิ.ย. 2569',
    alert: 'ความชื้นดินต่ำกว่าเกณฑ์ 11% — เพิ่มรอบน้ำอีก 1 รอบ/วัน',
  },
  {
    id: 'plot-3',
    name: 'แปลงที่ 3 — หลังบ้าน',
    location: 'ต.หนองสาหร่าย อ.ดอนเจดีย์ จ.สุพรรณบุรี',
    size: '3 ไร่ 1 งาน',
    cultivar: 'ชอนญ่า พลัส',
    stage: 'เลื้อยเถา',
    day: 19,
    totalDays: 68,
    health: 'ต้องดูแลด่วน',
    moisture: 81,
    brix: 0,
    expectedYield: '12.8 ตัน',
    harvest: '2 ก.ค. 2569',
    alert: 'พบจุดราน้ำค้างระยะเริ่มต้นในโซนตะวันออก 3 จุด — พ่นป้องกันภายใน 48 ชม.',
  },
  {
    id: 'plot-4',
    name: 'แปลงที่ 4 — กาญจนบุรี',
    location: 'ต.หนองโรง อ.พนมทวน จ.กาญจนบุรี',
    size: '8 ไร่',
    cultivar: 'หยกไร้เมล็ด',
    stage: 'เก็บเกี่ยวแล้ว',
    day: 70,
    totalDays: 70,
    health: 'ดีเยี่ยม',
    moisture: 0,
    brix: 12.9,
    expectedYield: '34.2 ตัน (เก็บจริง)',
    harvest: 'เก็บเกี่ยวเมื่อ 12 เม.ย. 2569',
  },
];

const DEFAULT_ACTIVITIES: FarmActivity[] = [
  {
    id: 'act-sample-1',
    plotId: 'plot-1',
    type: 'ให้น้ำ',
    title: 'ให้น้ำหยดตามรอบปกติ 45 นาที',
    detail: 'ความชื้นดินหลังให้น้ำ 68% ท่อส่งน้ำแรงดันสม่ำเสมอ',
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    operator: 'สมหมาย',
  },
  {
    id: 'act-sample-2',
    plotId: 'plot-1',
    type: 'วัดความหวาน Brix',
    title: 'สุ่มวัดความหวานแตงโม 3 ผล',
    detail: 'ค่าเฉลี่ย 10.8°Bx (ผลที่ 1: 10.5, ผลที่ 2: 11.0, ผลที่ 3: 10.9) เนื้อแน่น กรอบ',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    operator: 'สมหมาย',
  },
  {
    id: 'act-sample-3',
    plotId: 'plot-2',
    type: 'ใส่ปุ๋ย',
    title: 'ให้ปุ๋ยทางระบบน้ำ สูตร 0-0-50 + โบรอน',
    detail: 'เสริมสะสมแป้งและน้ำตาล อัตรา 1.5 กก./ไร่',
    timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    cost: 450,
    operator: 'สมหมาย',
  },
  {
    id: 'act-sample-4',
    plotId: 'plot-3',
    type: 'พ่นสารป้องกัน/กำจัด',
    title: 'พ่นสารกำจัดราน้ำค้าง ไดเมโทมอร์ฟ 50% WDG',
    detail: 'พ่นเน้นใต้ใบโซนตะวันออกตามคำแนะนำของ AI PHI 7 วัน',
    timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    cost: 320,
    operator: 'ลุงเปี๊ยก',
  },
];

const HEALTH_TONE: Record<PlotHealth, { badge: 'secondary' | 'primary' | 'error'; ring: string }> = {
  ดีเยี่ยม: { badge: 'secondary', ring: 'ring-secondary/30' },
  เฝ้าระวัง: { badge: 'primary', ring: 'ring-primary/30' },
  ต้องดูแลด่วน: { badge: 'error', ring: 'ring-error/40' },
};

const STORAGE_PLOTS_KEY = 'wm_farm_plots_v2';
const STORAGE_ACTIVITIES_KEY = 'wm_farm_activities_v2';

function loadPersistedPlots(): Plot[] {
  try {
    const raw = localStorage.getItem(STORAGE_PLOTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return [...DEFAULT_PLOTS];
}

function loadPersistedActivities(): FarmActivity[] {
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVITIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [...DEFAULT_ACTIVITIES];
}

/** Relative time in Thai, for the scan history feed. */
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'เมื่อสักครู่';
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

function parsePlotRai(sizeStr: string): number {
  const raiMatch = sizeStr.match(/(\d+(?:\.\d+)?)\s*ไร่/);
  const nganMatch = sizeStr.match(/(\d+(?:\.\d+)?)\s*งาน/);
  const waMatch = sizeStr.match(/(\d+(?:\.\d+)?)\s*ตารางวา/);
  const rai = raiMatch ? parseFloat(raiMatch[1]) : 0;
  const ngan = nganMatch ? parseFloat(nganMatch[1]) : 0;
  const wa = waMatch ? parseFloat(waMatch[1]) : 0;
  return rai + ngan / 4 + wa / 400;
}

function parsePlotYieldTons(yieldStr: string): number {
  const match = yieldStr.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

export function FarmPlots() {
  const { navigate } = useRouter();
  const toast = useToast();

  const [plots, setPlots] = useState<Plot[]>(loadPersistedPlots);
  const [selectedId, setSelectedId] = useState(() => (plots.length > 1 ? plots[1].id : plots[0]?.id || 'plot-1'));
  const [activities, setActivities] = useState<FarmActivity[]>(loadPersistedActivities);

  const [history, setHistory] = useState<DiseaseRecord[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [historyFilterPlotOnly, setHistoryFilterPlotOnly] = useState(false);

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [actionPlanOpen, setActionPlanOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<ZoneData | null>(null);
  const [zoneOpen, setZoneOpen] = useState(false);

  // Save plots to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PLOTS_KEY, JSON.stringify(plots));
    } catch {
      // ignore
    }
  }, [plots]);

  // Save activities to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACTIVITIES_KEY, JSON.stringify(activities));
    } catch {
      // ignore
    }
  }, [activities]);

  const selected = useMemo(() => {
    return plots.find((plot) => plot.id === selectedId) ?? plots[0] ?? DEFAULT_PLOTS[0];
  }, [plots, selectedId]);

  const activePlots = plots.filter((plot) => plot.stage !== 'เก็บเกี่ยวแล้ว');
  const alertCount = plots.filter((plot) => Boolean(plot.alert)).length;

  const totalAreaRai = plots.reduce((sum, p) => sum + parsePlotRai(p.size), 0);
  const totalYieldTons = plots.reduce((sum, p) => sum + parsePlotYieldTons(p.expectedYield), 0);

  const selectedPlotActivities = useMemo(() => {
    return activities.filter((a) => a.plotId === selected.id);
  }, [activities, selected.id]);

  useEffect(() => {
    let cancelled = false;
    const local = getLocalDiseaseHistory();
    if (local.length > 0) {
      setHistory(local);
    }

    api
      .diseaseHistory()
      .then((result) => {
        if (!cancelled) {
          const list = Array.isArray(result?.records) ? result.records : [];
          const map = new Map<string, DiseaseRecord>();
          for (const item of local) map.set(item.id, item);
          for (const item of list) map.set(item.id, item);
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
          );
          setHistory(merged);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const isOffline =
            (err instanceof ApiError && (err.status === 404 || err.status === 502)) ||
            err instanceof NetworkError;
          if (isOffline) {
            if (local.length > 0) setHistory(local);
          } else {
            setHistoryError(true);
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleCreatePlot(p: NewPlot) {
    const cultivar = CULTIVARS.find((c) => c.id === p.cultivarId);
    const cultivarName = cultivar?.name ?? 'ตอร์ปิโด';
    const totalDays = cultivar?.days ?? 65;

    const plantedDate = new Date(p.plantedOn);
    const validPlanted = !Number.isNaN(plantedDate.getTime());
    const now = Date.now();
    const daysPassed = validPlanted ? Math.max(1, Math.floor((now - plantedDate.getTime()) / (1000 * 60 * 60 * 24))) : 1;
    const day = Math.min(daysPassed, totalDays);

    let stage = 'ต้นกล้า & แตกใบ';
    if (day >= totalDays) stage = 'เก็บเกี่ยวแล้ว';
    else if (day >= 40) stage = 'ขยายผล & สะสมแป้ง';
    else if (day >= 25) stage = 'ออกดอก & ผสมเกสร';
    else if (day >= 12) stage = 'เลื้อยเถา';

    const harvestDateObj = validPlanted ? new Date(plantedDate.getTime() + totalDays * 24 * 60 * 60 * 1000) : new Date();
    const harvestStr = harvestDateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

    const areaRai = p.rai + p.ngan / 4 + p.wa / 400;
    const expectedYieldNum = (areaRai * 3.7).toFixed(1);
    const sizeStr = `${p.rai} ไร่${p.ngan > 0 ? ` ${p.ngan} งาน` : ''}${p.wa > 0 ? ` ${p.wa} ตร.ว.` : ''}`;
    const newId = `plot-${Date.now()}`;

    const newPlot: Plot = {
      id: newId,
      name: p.name || `แปลงใหม่ ${plots.length + 1}`,
      location: p.province ? `จ.${p.province}` : 'ไม่ระบุสถานที่',
      size: sizeStr,
      cultivar: cultivarName,
      stage,
      day,
      totalDays,
      health: 'ดีเยี่ยม',
      moisture: 70,
      brix: day >= 45 ? 11.0 : 0,
      expectedYield: `${expectedYieldNum} ตัน`,
      harvest: harvestStr,
      alert: undefined,
    };

    setPlots((prev) => [...prev, newPlot]);
    setSelectedId(newId);
    toast.success(`เพิ่มแปลง "${newPlot.name}" เรียบร้อยแล้ว`);
  }

  function handleSavePlot(updated: EditablePlot) {
    setPlots((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    toast.success(`บันทึกข้อมูล "${updated.name}" สำเร็จ`);
  }

  function handleDeletePlot(plotId: string) {
    if (plots.length <= 1) {
      toast.error('ต้องมีแปลงเพาะปลูกอย่างน้อย 1 แปลงในระบบ');
      return;
    }
    const remaining = plots.filter((p) => p.id !== plotId);
    setPlots(remaining);
    setSelectedId(remaining[0].id);
    toast.success('ลบแปลงเพาะปลูกเรียบร้อยแล้ว');
  }

  function handleResolveAlert() {
    setPlots((prev) =>
      prev.map((p) =>
        p.id === selected.id
          ? {
              ...p,
              alert: undefined,
              health: 'ดีเยี่ยม',
              moisture: Math.max(p.moisture, 65),
            }
          : p,
      ),
    );
  }

  function handleAddActivity(activity: FarmActivity) {
    setActivities((prev) => [activity, ...prev]);
    toast.success(`บันทึกกิจกรรม "${activity.title}" สำเร็จ`);
  }

  function handleDeleteActivity(activityId: string) {
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
    toast.success('ลบรายการกิจกรรมเรียบร้อยแล้ว');
  }

  function handleUpdateZoneMoisture(_zoneIndex: number, newMoisture: number) {
    setPlots((prev) =>
      prev.map((p) =>
        p.id === selected.id
          ? {
              ...p,
              moisture: Math.round((p.moisture + newMoisture) / 2),
            }
          : p,
      ),
    );
    // Auto log irrigation activity
    const autoAct: FarmActivity = {
      id: `act-${Date.now()}`,
      plotId: selected.id,
      type: 'ให้น้ำ',
      title: `เปิดน้ำหยดโซน ${selectedZone?.name || ''} 45 นาที`,
      detail: `ปรับระดับความชื้นโซนเป็น ${newMoisture}% สภาพระบบทำงานปกติ`,
      timestamp: new Date().toISOString(),
      operator: 'ระบบอัตโนมัติ / ผู้จัดการแปลง',
    };
    setActivities((prev) => [autoAct, ...prev]);
  }

  const filteredHistory = useMemo(() => {
    if (!history) return null;
    if (!historyFilterPlotOnly) return history;
    const matchNum = selected.name.match(/แปลงที่\s*(\d+)/)?.[1];
    return history.filter((r) => {
      if (r.farmId.includes(selected.name) || r.farmId.includes(selected.id)) return true;
      if (matchNum && (r.farmId.includes(`แปลง ${matchNum}`) || r.farmId.includes(`แปลงที่ ${matchNum}`))) return true;
      return false;
    });
  }, [history, historyFilterPlotOnly, selected.name, selected.id]);

  return (
    <AppShell>
      <PageContainer>
        <PageHeading
          eyebrow={
            <>
              <Badge tone="secondary">
                <Icon name="map" size={14} />
                ระบบจัดการแปลงเพาะปลูก
              </Badge>
              <LiveBadge>เซนเซอร์ออนไลน์ {Math.min(plots.length, 3)} แปลง</LiveBadge>
            </>
          }
          title="จัดการแปลงเพาะปลูกแตงโม"
          description="ภาพรวมสุขภาพแปลง แผนผังโซน ความชื้นดิน สมุดบันทึกกิจกรรม GAP และการแจ้งเตือนที่ต้องลงมือทำ"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  window.print();
                  toast.success('กำลังเปิดหน้าพิมพ์รายงานสรุปแปลงเพาะปลูก...');
                }}
              >
                <Icon name="picture_as_pdf" size={16} />
                ส่งออก PDF
              </Button>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Icon name="add_circle" size={18} />
                + เพิ่มแปลงใหม่
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="พื้นที่เพาะปลูกรวม"
            value={totalAreaRai.toFixed(2)}
            unit="ไร่"
            icon="landscape"
            tone="neutral"
            footnote={`จากทั้งหมด ${plots.length} แปลงในระบบ`}
          />
          <StatTile
            label="แปลงที่กำลังเพาะปลูก"
            value={`${activePlots.length}`}
            unit="แปลง"
            icon="potted_plant"
            tone="secondary"
            footnote={`เก็บเกี่ยวแล้ว ${plots.length - activePlots.length} แปลง`}
          />
          <StatTile
            label="ผลผลิตคาดการณ์รวมรอบนี้"
            value={totalYieldTons.toFixed(1)}
            unit="ตัน"
            icon="scale"
            tone="primary"
            delta={{ value: '+8.4%', direction: 'up', note: 'เทียบรอบก่อน' }}
          />
          <StatTile
            label="การแจ้งเตือนที่รอดำเนินการ"
            value={`${alertCount}`}
            unit="รายการ"
            icon="warning"
            tone={alertCount > 0 ? 'primary' : 'neutral'}
            footnote={alertCount > 0 ? 'คลิกที่แปลงเพื่อดูแผนจัดการ' : 'ทุกแปลงอยู่ในเกณฑ์ปกติ'}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Plot List (Left column) */}
          <div className="flex flex-col gap-3 lg:col-span-5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-label-lg font-bold text-on-surface">รายชื่อแปลงเพาะปลูก ({plots.length})</h3>
              <span className="text-caption text-on-surface-variant">เลือกแปลงเพื่อดูข้อมูลย่อย</span>
            </div>
            {plots.map((plot) => {
              const active = plot.id === selected.id;
              const tone = HEALTH_TONE[plot.health];
              const retired = plot.stage === 'เก็บเกี่ยวแล้ว';

              return (
                <button
                  key={plot.id}
                  type="button"
                  onClick={() => setSelectedId(plot.id)}
                  aria-pressed={active}
                  className={cn(
                    'cursor-pointer rounded-lg bg-surface-lowest p-5 text-left shadow-card transition-all duration-150 ease-tactile active:scale-[0.99]',
                    active ? `ring-2 ${tone.ring}` : 'hover:bg-surface-low',
                    retired && 'opacity-70',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-title-md font-bold text-on-surface">{plot.name}</h3>
                      <p className="mt-0.5 flex items-center gap-1 text-caption text-on-surface-variant">
                        <Icon name="location_on" size={13} className="text-outline" />
                        {plot.location}
                      </p>
                    </div>
                    <Badge tone={tone.badge}>{plot.health}</Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone="outline">{plot.size}</Badge>
                    <Badge tone="outline">{plot.cultivar}</Badge>
                    <Badge tone="neutral">{plot.stage}</Badge>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-caption text-on-surface-variant">
                      <span>
                        วันที่ {plot.day} จาก {plot.totalDays} วัน
                      </span>
                      <span className="font-bold text-on-surface">
                        {Math.round((plot.day / plot.totalDays) * 100)}%
                      </span>
                    </div>
                    <Meter
                      value={(plot.day / plot.totalDays) * 100}
                      tone={plot.health === 'ต้องดูแลด่วน' ? 'primary' : 'secondary'}
                      className="mt-1.5"
                      label={`ความคืบหน้า ${plot.name}`}
                    />
                  </div>

                  {plot.alert ? (
                    <p className="mt-3 flex items-start gap-1.5 rounded-md bg-melon-tint p-2.5 text-caption text-on-surface-variant">
                      <Icon name="warning" size={14} className="mt-0.5 shrink-0 text-primary" />
                      {plot.alert}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Plot Details (Right column) */}
          <div className="flex flex-col gap-4 lg:col-span-7">
            {/* Main Plot Overview Card */}
            <Card>
              <CardHeader
                icon="dashboard"
                title={selected.name}
                subtitle={`${selected.cultivar} • ${selected.size} • ${selected.stage}`}
                action={
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditOpen(true)}
                      className="h-8 text-xs"
                    >
                      <Icon name="edit" size={14} />
                      แก้ไขแปลง
                    </Button>
                    <Badge tone={HEALTH_TONE[selected.health].badge}>{selected.health}</Badge>
                  </div>
                }
              />

              {/* Interactive Plot Grid: rows of beds with clickable zones */}
              <div className="rounded-lg bg-gradient-to-br from-mint-mist to-surface-low p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-label-lg font-semibold text-on-surface">แผนผังแปลงและโซนเพาะปลูก</span>
                    <p className="text-[11px] text-on-surface-variant">คลิกที่ช่องเพื่อดูสถานะเซนเซอร์และเปิดน้ำหยดเฉพาะโซน</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-caption text-on-surface-variant">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-sm bg-secondary" />
                      ปกติ
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-sm bg-primary" />
                      เฝ้าระวัง
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-sm bg-surface-highest" />
                      ยังไม่ปลูก
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-8 gap-1.5" role="region" aria-label={`แผนผังแปลง ${selected.name}`}>
                  {Array.from({ length: 40 }, (_, index) => {
                    const row = Math.floor(index / 8) + 1;
                    const col = (index % 8) + 1;
                    const warn = selected.health !== 'ดีเยี่ยม' && [6, 7, 14, 15, 22].includes(index);
                    const empty = index >= 36;
                    const zoneName = `โซน ${String.fromCharCode(65 + Math.floor(index / 8))}-${col}`;
                    const zoneMoisture = empty ? 0 : warn ? Math.max(35, selected.moisture - 14) : selected.moisture || 68;

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setSelectedZone({
                            index,
                            name: zoneName,
                            status: empty ? 'ยังไม่ปลูก' : warn ? 'เฝ้าระวัง' : 'ปกติ',
                            warn,
                            empty,
                            moisture: zoneMoisture,
                          });
                          setZoneOpen(true);
                        }}
                        title={`${zoneName} (แถว ${row} ร่อง ${col}): ${
                          empty ? 'ยังไม่ปลูก' : warn ? `เฝ้าระวัง (ความชื้น ${zoneMoisture}%)` : `ปกติ (ความชื้น ${zoneMoisture}%)`
                        } — คลิกเพื่อดูรายละเอียด`}
                        className={cn(
                          'group relative aspect-square cursor-pointer rounded-sm transition-all hover:scale-110 hover:ring-2 hover:ring-on-surface/40 hover:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                          empty ? 'bg-surface-highest' : warn ? 'bg-primary' : 'bg-secondary',
                          warn && 'animate-pulse',
                        )}
                      >
                        <span className="sr-only">
                          {zoneName}: แถว {row} ร่อง {col}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plot metrics */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: 'ความชื้นดิน',
                    value: selected.moisture > 0 ? `${selected.moisture}%` : '—',
                    icon: 'water_drop',
                    tone: selected.moisture > 0 && selected.moisture < 60 ? 'text-primary' : 'text-secondary',
                  },
                  {
                    label: 'ความหวานปัจจุบัน',
                    value: selected.brix > 0 ? `${selected.brix}°Bx` : 'ยังไม่วัด',
                    icon: 'science',
                    tone: 'text-on-surface',
                  },
                  { label: 'ผลผลิตคาดการณ์', value: selected.expectedYield, icon: 'scale', tone: 'text-on-surface' },
                  { label: 'กำหนดเก็บเกี่ยว', value: selected.harvest, icon: 'event', tone: 'text-secondary' },
                ].map((item) => (
                  <div key={item.label} className="rounded-md bg-surface-low p-3">
                    <p className="flex items-center gap-1.5 text-caption text-on-surface-variant">
                      <Icon name={item.icon} size={14} />
                      {item.label}
                    </p>
                    <p className={cn('mt-1 text-label-lg font-bold', item.tone)}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Alert box */}
              {selected.alert ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-melon-tint p-4">
                  <p className="flex min-w-0 items-start gap-2 text-body-md text-on-surface-variant">
                    <Icon name="priority_high" size={18} className="mt-0.5 shrink-0 text-primary" />
                    {selected.alert}
                  </p>
                  <Button size="sm" onClick={() => setActionPlanOpen(true)}>
                    ดูแผนจัดการ
                  </Button>
                </div>
              ) : null}

              {/* Quick Actions for Selected Plot */}
              <div className="mt-5 border-t border-surface-container-high/60 pt-4">
                <p className="mb-2.5 flex items-center gap-1.5 text-caption font-bold text-on-surface-variant">
                  <Icon name="bolt" size={14} className="text-tertiary" />
                  เมนูลัดสำหรับ {selected.name}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-center text-xs"
                    onClick={() => navigate('/disease-scan')}
                  >
                    <Icon name="biotech" size={16} className="text-primary" />
                    ตรวจโรคใบ
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-center text-xs"
                    onClick={() => navigate('/scanner')}
                  >
                    <Icon name="graphic_eq" size={16} className="text-secondary" />
                    เคาะวัด Brix
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-center text-xs"
                    onClick={() => navigate('/fertilizer')}
                  >
                    <Icon name="science" size={16} className="text-tertiary" />
                    สูตรปุ๋ยยา
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-center text-xs"
                    onClick={() => navigate('/market')}
                  >
                    <Icon name="trending_up" size={16} className="text-on-surface-variant" />
                    เช็กราคาตลาด
                  </Button>
                </div>
              </div>
            </Card>

            {/* Farm Activity Log (GAP Log Book) Card */}
            <Card>
              <CardHeader
                icon="assignment"
                iconTone="secondary"
                title={`สมุดบันทึกกิจกรรมประจำแปลง (${selectedPlotActivities.length})`}
                subtitle="บันทึกการให้น้ำ ใส่ปุ๋ย พ่นยา และวัดค่าความหวานตามมาตรฐาน GAP"
                action={
                  <Button size="sm" onClick={() => setActivityOpen(true)}>
                    <Icon name="add" size={16} />
                    + บันทึกงาน
                  </Button>
                }
              />

              {selectedPlotActivities.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Icon name="assignment_late" size={32} className="text-outline" />
                  <p className="text-body-md text-on-surface-variant">
                    ยังไม่มีบันทึกกิจกรรมสำหรับ {selected.name}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setActivityOpen(true)}>
                    เริ่มบันทึกกิจกรรมแรก
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedPlotActivities.map((act) => {
                    const icon =
                      act.type === 'ให้น้ำ'
                        ? 'water_drop'
                        : act.type === 'ใส่ปุ๋ย'
                          ? 'science'
                          : act.type === 'พ่นสารป้องกัน/กำจัด'
                            ? 'pest_control'
                            : act.type === 'วัดความหวาน Brix'
                              ? 'speed'
                              : 'check_circle';

                    const tone =
                      act.type === 'ให้น้ำ'
                        ? 'bg-secondary/15 text-secondary'
                        : act.type === 'พ่นสารป้องกัน/กำจัด'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-surface-container text-on-surface';

                    return (
                      <div
                        key={act.id}
                        className="group flex items-start justify-between gap-3 rounded-xl border border-outline-variant/30 bg-surface-low p-3.5 transition-all hover:bg-surface-container/60"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', tone)}>
                            <Icon name={icon} size={18} />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-label-md font-bold text-on-surface">{act.title}</span>
                              <Badge tone="neutral" className="text-[10px] py-0 px-1.5">
                                {act.type}
                              </Badge>
                              {act.cost && (
                                <Badge tone="secondary" className="text-[10px] py-0 px-1.5">
                                  {act.cost.toLocaleString('th-TH')} บาท
                                </Badge>
                              )}
                            </div>
                            {act.detail && (
                              <p className="mt-1 text-caption text-on-surface-variant leading-relaxed">
                                {act.detail}
                              </p>
                            )}
                            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-outline">
                              <span>{timeAgo(act.timestamp)}</span>
                              {act.operator && <span>โดย {act.operator}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteActivity(act.id)}
                          title="ลบรายการนี้"
                          className="opacity-0 group-hover:opacity-100 p-1 text-outline hover:text-error transition-opacity"
                        >
                          <Icon name="delete" size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* AI Diagnosis History Card */}
            <Card>
              <CardHeader
                icon="history"
                iconTone="tertiary"
                title="ประวัติการวินิจฉัยโรคด้วย AI"
                subtitle="ผลสแกนทุกครั้งถูกบันทึกไว้เพื่อติดตามแนวโน้มสุขภาพแปลง"
                action={
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHistoryFilterPlotOnly((prev) => !prev)}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer',
                        historyFilterPlotOnly
                          ? 'bg-secondary text-on-secondary'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
                      )}
                    >
                      {historyFilterPlotOnly ? 'เฉพาะแปลงนี้' : 'ทุกแปลง'}
                    </button>
                    {filteredHistory?.length ? <Badge tone="outline">{filteredHistory.length} รายการ</Badge> : undefined}
                  </div>
                }
              />

              {historyError ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Icon name="cloud_off" size={32} className="text-outline" />
                  <p className="text-body-md text-on-surface-variant">
                    โหลดประวัติไม่สำเร็จ — ตรวจสอบการเชื่อมต่อแล้วลองใหม่
                  </p>
                </div>
              ) : filteredHistory === null ? (
                <div className="flex flex-col gap-3" aria-busy="true">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="flex animate-pulse gap-3">
                      <span className="size-9 shrink-0 rounded-full bg-surface-container" />
                      <div className="flex-1 space-y-2 py-1">
                        <span className="block h-3 w-1/3 rounded-full bg-surface-container" />
                        <span className="block h-3 w-2/3 rounded-full bg-surface-container" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <Icon name="document_scanner" size={32} className="text-outline" />
                  <p className="max-w-xs text-body-md text-on-surface-variant">
                    {historyFilterPlotOnly
                      ? `ยังไม่มีประวัติการสแกนสำหรับ ${selected.name}`
                      : 'ยังไม่มีประวัติการสแกน — ถ่ายรูปใบที่สงสัยแล้วให้ AI วินิจฉัยครั้งแรกได้เลย'}
                  </p>
                  <Button size="sm" onClick={() => navigate('/disease-scan')}>
                    <Icon name="photo_camera" size={16} />
                    เริ่มสแกน
                  </Button>
                </div>
              ) : (
                <ol className="flex flex-col gap-0">
                  {filteredHistory.slice(0, 6).map((record, index, array) => {
                    const tone =
                      record.severity_level >= 4
                        ? 'bg-error-container text-on-error-container'
                        : record.severity_level === 3
                          ? 'bg-primary-fixed text-on-primary-fixed-variant'
                          : 'bg-secondary-container text-on-secondary-fixed-variant';

                    return (
                      <li key={record.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', tone)}>
                            <Icon name="coronavirus" size={18} />
                          </span>
                          {index < array.length - 1 ? <span className="w-px flex-1 bg-outline-variant/50" /> : null}
                        </div>
                        <div className="min-w-0 pb-5">
                          <p className="flex flex-wrap items-center gap-2 text-caption text-on-surface-variant">
                            {timeAgo(record.detectedAt)}
                            <span className="rounded-full bg-surface-container px-2 py-0.5">{record.farmId}</span>
                          </p>
                          <p className="mt-0.5 text-body-md font-semibold text-on-surface">{record.thai_name}</p>
                          {record.from_verified_model ? (
                            <p className="mt-0.5 text-caption text-on-surface-variant">
                              ความมั่นใจ {record.confidence_percentage}% • {record.severity}
                            </p>
                          ) : (
                            <p className="mt-1 flex items-start gap-1.5 text-caption text-on-surface-variant">
                              <Icon name="warning" size={14} className="mt-0.5 shrink-0 text-primary" />
                              {record.unverified_note}
                            </p>
                          )}
                          {record.urgent_action ? (
                            <p className="mt-1.5 rounded-md bg-surface-low p-2 text-caption text-on-surface-variant">
                              {record.urgent_action}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}

              <Link
                to="/disease-scan"
                className="mt-2 flex items-center justify-center gap-1.5 rounded-full bg-surface-low py-2.5 text-label-lg font-semibold text-primary transition-colors hover:bg-surface-container"
              >
                <Icon name="photo_camera" size={18} />
                สแกนวินิจฉัยโรคเพิ่ม
              </Link>
            </Card>
          </div>
        </div>

        {/* Add Plot Modal */}
        <AddPlotModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onCreate={handleCreatePlot}
        />

        {/* Edit Plot Modal */}
        <EditPlotModal
          open={editOpen}
          plot={selected}
          onClose={() => setEditOpen(false)}
          onSave={handleSavePlot}
          onDelete={handleDeletePlot}
        />

        {/* Zone Detail Modal (when clicking any grid cell) */}
        <ZoneDetailModal
          open={zoneOpen}
          plotName={selected.name}
          zone={selectedZone}
          onClose={() => setZoneOpen(false)}
          onUpdateMoisture={handleUpdateZoneMoisture}
        />

        {/* Action Plan Modal (when clicking "ดูแผนจัดการ") */}
        <ActionPlanModal
          open={actionPlanOpen}
          onClose={() => setActionPlanOpen(false)}
          plotName={selected.name}
          alertMessage={selected.alert}
          onResolveAlert={handleResolveAlert}
          onLogActivity={(title, detail) => {
            const act: FarmActivity = {
              id: `act-${Date.now()}`,
              plotId: selected.id,
              type: 'อื่น ๆ',
              title,
              detail,
              timestamp: new Date().toISOString(),
              operator: 'ผู้จัดการแปลง',
            };
            setActivities((prev) => [act, ...prev]);
          }}
        />

        {/* Add Activity Modal (GAP Log) */}
        <AddActivityModal
          open={activityOpen}
          plotId={selected.id}
          plotName={selected.name}
          onClose={() => setActivityOpen(false)}
          onAdd={handleAddActivity}
        />
      </PageContainer>
    </AppShell>
  );
}
