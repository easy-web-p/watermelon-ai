import { useEffect, useState } from 'react';
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
import { useToast } from '../components/ui/Toast';
import { AddPlotModal, type NewPlot } from '../components/domain/AddPlotModal';

type PlotHealth = 'ดีเยี่ยม' | 'เฝ้าระวัง' | 'ต้องดูแลด่วน';

type Plot = {
  id: string;
  name: string;
  location: string;
  size: string;
  cultivar: string;
  stage: string;
  day: number;
  totalDays: number;
  health: PlotHealth;
  moisture: number;
  brix: number;
  expectedYield: string;
  harvest: string;
  alert?: string;
};

const PLOTS: readonly Plot[] = [
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

const HEALTH_TONE: Record<PlotHealth, { badge: 'secondary' | 'primary' | 'error'; ring: string }> = {
  ดีเยี่ยม: { badge: 'secondary', ring: 'ring-secondary/30' },
  เฝ้าระวัง: { badge: 'primary', ring: 'ring-primary/30' },
  ต้องดูแลด่วน: { badge: 'error', ring: 'ring-error/40' },
};

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
  const [selectedId, setSelectedId] = useState(PLOTS[1].id);
  const [history, setHistory] = useState<DiseaseRecord[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [extraPlots, setExtraPlots] = useState<NewPlot[]>([]);
  const toast = useToast();

  const selected = PLOTS.find((plot) => plot.id === selectedId) ?? PLOTS[0];
  const activePlots = PLOTS.filter((plot) => plot.stage !== 'เก็บเกี่ยวแล้ว');

  const baseAreaRai = PLOTS.reduce((sum, p) => sum + parsePlotRai(p.size), 0);
  const extraAreaRai = extraPlots.reduce((sum, p) => sum + p.rai + p.ngan / 4 + p.wa / 400, 0);
  const totalAreaRai = baseAreaRai + extraAreaRai;

  const baseYieldTons = PLOTS.reduce((sum, p) => sum + parsePlotYieldTons(p.expectedYield), 0);
  // Average standard expected yield is approximately 3.7 tons per rai
  const extraYieldTons = extraPlots.reduce((sum, p) => sum + (p.rai + p.ngan / 4 + p.wa / 400) * 3.7, 0);
  const totalYieldTons = baseYieldTons + extraYieldTons;

  useEffect(() => {
    let cancelled = false;
    api
      .diseaseHistory()
      .then((result) => {
        if (!cancelled) setHistory(Array.isArray(result?.records) ? result.records : []);
      })
      .catch((err) => {
        if (!cancelled) {
          if ((err instanceof ApiError && err.status === 502) || err instanceof NetworkError) {
            setHistory([]);
          } else {
            setHistoryError(true);
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
              <LiveBadge>เซนเซอร์ออนไลน์ 3 แปลง</LiveBadge>
            </>
          }
          title="จัดการแปลงเพาะปลูกแตงโม"
          description="ภาพรวมสุขภาพแปลง ความชื้นดิน ระยะการเติบโต และการแจ้งเตือนที่ต้องลงมือทำในแต่ละแปลง"
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
            footnote={extraPlots.length ? `รวมแปลงที่เพิ่งเพิ่ม ${extraPlots.length} แปลง` : undefined}
          />
          <StatTile
            label="แปลงที่กำลังเพาะปลูก"
            value={`${activePlots.length + extraPlots.length}`}
            unit="แปลง"
            icon="potted_plant"
            tone="secondary"
            footnote={`จากทั้งหมด ${PLOTS.length + extraPlots.length} แปลงที่ลงทะเบียน`}
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
            value="2"
            unit="รายการ"
            icon="warning"
            tone="primary"
            footnote="1 รายการเร่งด่วน — โรคราน้ำค้าง"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="flex flex-col gap-3 lg:col-span-5">
            {PLOTS.map((plot) => {
              const active = plot.id === selectedId;
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

          <div className="flex flex-col gap-4 lg:col-span-7">
            <Card>
              <CardHeader
                icon="dashboard"
                title={selected.name}
                subtitle={`${selected.cultivar} • ${selected.size} • ${selected.stage}`}
                action={<Badge tone={HEALTH_TONE[selected.health].badge}>{selected.health}</Badge>}
              />

              {/* Plot map: rows of beds with the problem zone highlighted */}
              <div className="rounded-lg bg-gradient-to-br from-mint-mist to-surface-low p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-label-lg font-semibold text-on-surface">แผนผังแปลงและโซนเพาะปลูก</span>
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

                <div className="grid grid-cols-8 gap-1.5" role="img" aria-label={`แผนผังแปลง ${selected.name}`}>
                  {Array.from({ length: 40 }, (_, index) => {
                    const warn = selected.health !== 'ดีเยี่ยม' && [6, 7, 14, 15, 22].includes(index);
                    const empty = index >= 36;
                    return (
                      <span
                        key={index}
                        className={cn(
                          'aspect-square rounded-sm transition-colors',
                          empty ? 'bg-surface-highest' : warn ? 'bg-primary' : 'bg-secondary',
                          warn && 'animate-pulse',
                        )}
                      />
                    );
                  })}
                </div>
              </div>

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

              {selected.alert ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-melon-tint p-4">
                  <p className="flex min-w-0 items-start gap-2 text-body-md text-on-surface-variant">
                    <Icon name="priority_high" size={18} className="mt-0.5 shrink-0 text-primary" />
                    {selected.alert}
                  </p>
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate(`/chat?q=${encodeURIComponent(
                        `${selected.name}: ${selected.alert} ควรจัดการอย่างไรครับ`,
                      )}`)
                    }
                  >
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

            <Card>
              <CardHeader
                icon="history"
                iconTone="tertiary"
                title="ประวัติการวินิจฉัยโรคด้วย AI"
                subtitle="ผลสแกนทุกครั้งถูกบันทึกไว้เพื่อติดตามแนวโน้มสุขภาพแปลง"
                action={
                  history?.length ? <Badge tone="outline">{history.length} รายการ</Badge> : undefined
                }
              />

              {historyError ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Icon name="cloud_off" size={32} className="text-outline" />
                  <p className="text-body-md text-on-surface-variant">
                    โหลดประวัติไม่สำเร็จ — ตรวจสอบการเชื่อมต่อแล้วลองใหม่
                  </p>
                </div>
              ) : history === null ? (
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
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <Icon name="document_scanner" size={32} className="text-outline" />
                  <p className="max-w-xs text-body-md text-on-surface-variant">
                    ยังไม่มีประวัติการสแกน — ถ่ายรูปใบที่สงสัยแล้วให้ AI วินิจฉัยครั้งแรกได้เลย
                  </p>
                  <Button size="sm" onClick={() => (window.location.hash = '#/chat')}>
                    <Icon name="photo_camera" size={16} />
                    เริ่มสแกน
                  </Button>
                </div>
              ) : (
                <ol className="flex flex-col gap-0">
                  {history.slice(0, 6).map((record, index, array) => {
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
                to="/chat"
                className="mt-2 flex items-center justify-center gap-1.5 rounded-full bg-surface-low py-2.5 text-label-lg font-semibold text-primary transition-colors hover:bg-surface-container"
              >
                <Icon name="photo_camera" size={18} />
                สแกนวินิจฉัยโรคเพิ่ม
              </Link>
            </Card>
          </div>
        </div>
        <AddPlotModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onCreate={(plot) => {
            setExtraPlots((prev) => [...prev, plot]);
            toast.success(`เพิ่ม "${plot.name}" เรียบร้อยแล้ว`);
          }}
        />
      </PageContainer>
    </AppShell>
  );
}
