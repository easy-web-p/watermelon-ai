import { useState } from 'react';
import { MarketingShell } from '../components/layout/MarketingShell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Meter } from '../components/ui/Meter';
import { useRouter } from '../lib/router';
import { cn } from '../lib/cn';
import { MODEL_CLASSES, MODEL_CLASS_THAI, MODEL_METRICS, MODEL_SUMMARY } from '../lib/diseaseModel';
import rawMetrics from '../../fastapi_service/metrics.json';
import wide9Meta from '../../fastapi_service/melon_m0.labels.json';
import wide11Meta from '../../fastapi_service/melon_pv0.labels.json';
import baseline9Meta from '../../fastapi_service/watermelon_cls.labels.json';

type EngineKey = 'all' | 'legacy4';

type ClassMetric = {
  nameTh: string;
  nameEn: string;
  precision: number;
  recall: number;
  f1: number;
  samples: number;
  engine: 'legacy4';
};

const CLASS_METRICS: readonly ClassMetric[] = MODEL_CLASSES.map((modelClass) => ({
  nameTh: MODEL_CLASS_THAI[modelClass],
  nameEn: modelClass,
  precision: MODEL_METRICS[modelClass].precision * 100,
  recall: MODEL_METRICS[modelClass].recall * 100,
  f1: MODEL_METRICS[modelClass].f1,
  samples: MODEL_METRICS[modelClass].support,
  engine: 'legacy4',
}));

/** Use the measured counts directly, in the model's documented class order. */
const CONFUSION_MATRIX = rawMetrics.test.confusion_matrix;

const LOCAL_ONNX_ARTIFACTS = [
  'model.onnx',
  'melon_m0.onnx',
  'melon_e1.onnx',
  'wide9.onnx',
  'melon_pv0.onnx',
  'watermelon_cls.onnx',
] as const;

const MODEL_INVENTORY = [
  {
    id: 'legacy4',
    title: 'Legacy-4 · EfficientNet-B0',
    kind: 'โมเดลหลัก · ONNX',
    scope: '4 คลาสจากภาพใบแตงโมโดยตรง',
    evidence: `Accuracy ${(MODEL_SUMMARY.accuracy * 100).toFixed(1)}% · Macro F1 ${MODEL_SUMMARY.macroF1.toFixed(3)} · ชุดทดสอบ ${MODEL_SUMMARY.testImages} ภาพ`,
    limit: 'ยังไม่มี calibration.json และยังไม่มีผลทดสอบภาคสนามอิสระ ตรวจโรคนอก 4 คลาสไม่ได้',
    tone: 'primary' as const,
  },
  {
    id: 'wide9',
    title: 'Wide-9 · Ensemble 3 น้ำหนัก',
    kind: 'โมเดลเสริม · ONNX',
    scope: '9 คลาส รวมราแป้ง; ใช้ MobileNetV3-Large และ EfficientNet-B0 ร่วมกัน',
    evidence: `Validation ${(wide9Meta.val_accuracy * 100).toFixed(1)}% · ECE ${wide9Meta.val_ece.toFixed(4)} · ${wide9Meta.train_images.toLocaleString('th-TH')} ภาพฝึก`,
    limit: 'ชุด validation เป็นภาพพืชอื่น/ภาพตัวแทนข้ามพืช ไม่ใช่ภาพแปลงแตงโม คะแนนจึงเป็นข้อสังเกต ไม่ใช่คำวินิจฉัย',
    tone: 'secondary' as const,
  },
  {
    id: 'wide11',
    title: 'Wide-11 · รุ่นทดลอง',
    kind: 'โมเดลเสริม · ONNX',
    scope: '11 คลาส เพิ่มไรแดงและโรคใบจุดวงแหวน',
    evidence: `Validation ${(wide11Meta.val_accuracy * 100).toFixed(1)}% · ECE ${wide11Meta.val_ece.toFixed(4)} · ${wide11Meta.train_images.toLocaleString('th-TH')} ภาพฝึก`,
    limit: 'ตัวเลขมาจากชุดข้อมูล mapped ข้ามพืช ไม่ใช่การทดสอบภาคสนามบนแตงโม ใช้เปรียบเทียบเท่านั้น',
    tone: 'tertiary' as const,
  },
  {
    id: 'baseline9',
    title: 'Baseline-9 · MobileNetV3-Large',
    kind: 'รุ่นเทียบเคียง · ONNX',
    scope: '9 คลาส เก็บไว้เปรียบเทียบพัฒนาการของ Wide-9',
    evidence: `Validation ${(baseline9Meta.val_accuracy * 100).toFixed(1)}% · ${baseline9Meta.train_images.toLocaleString('th-TH')} ภาพฝึก`,
    limit: 'ผลต่ำกว่ารุ่น Wide-9 และไม่มีผลทดสอบบนแปลงแตงโม ห้ามใช้เป็นผลหลักหรือเลือกสารเคมี',
    tone: 'neutral' as const,
  },
  {
    id: 'claude',
    title: 'Claude Vision · Multimodal LLM',
    kind: 'บริการภายนอก · เปิดแบบ opt-in',
    scope: 'อ่านภาพเชิงบรรยายและเลือกจากรายการโรคที่ระบบส่งให้',
    evidence: 'ยังไม่มี benchmark ของโครงการบนภาพแตงโม',
    limit: 'มีค่าใช้จ่าย ช้ากว่าโมเดลในเครื่อง และ confidence ไม่ใช่ความน่าจะเป็นที่ปรับเทียบแล้ว',
    tone: 'outline' as const,
  },
] as const;

export function AiEvaluation() {
  const [selectedEngine, setSelectedEngine] = useState<EngineKey>('all');
  const [activeTab, setActiveTab] = useState<'vision' | 'confusion' | 'acoustic' | 'leafcheck'>('vision');
  const { navigate } = useRouter();

  const filteredMetrics =
    selectedEngine === 'all'
      ? CLASS_METRICS
      : CLASS_METRICS.filter((m) => m.engine === selectedEngine);

  return (
    <MarketingShell>
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-surface-lowest via-surface-low to-surface py-12">
        <div className="pointer-events-none absolute -top-24 -right-20 size-96 rounded-full bg-secondary-container/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 size-96 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="secondary">
                  <Icon name="verified" size={14} />
                  การประเมินผล AI ทางวิชาการ
                </Badge>
                <Badge tone="outline">ทะเบียน 6 น้ำหนัก ONNX · 5 เส้นทาง Vision</Badge>
              </div>
              <h1 className="mt-3 text-headline-lg font-bold text-on-surface lg:text-display-lg">
                ตัววัดผลและรายงานประสิทธิภาพ AI
              </h1>
              <p className="mt-3 max-w-2xl text-body-lg text-on-surface-variant">
                รวมโมเดลภาพ โมเดลภาษา ตัวกรองคุณภาพภาพ และระบบวัดเสียงที่พัฒนาหรือผนวกเข้ากับโครงการ โดยแยกผลวัดตามชุดข้อมูลของแต่ละรุ่น ไม่ยืมตัวเลขจากโมเดลหนึ่งไปอ้างกับอีกโมเดล และยังไม่มีรุ่นใดผ่านการทดสอบภาคสนามอิสระในสวนแตงโม
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => navigate('/research')}>
                <Icon name="menu_book" size={16} />
                เอกสารงานวิจัย
              </Button>
              <Button variant="primary" onClick={() => navigate('/disease-scan')}>
                <Icon name="biotech" size={16} />
                ทดลองสแกนโรคจริง
              </Button>
            </div>
          </div>

          {/* KPI Dashboard Cards */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[
              {
                title: 'Local Weights',
                sub: 'ไฟล์น้ำหนัก ONNX ในโครงการ',
                value: String(LOCAL_ONNX_ARTIFACTS.length),
                tone: 'text-secondary',
                icon: 'memory',
              },
              {
                title: 'Vision Engines',
                sub: 'รวมตัวเลือกภายนอกแบบ opt-in',
                value: String(MODEL_INVENTORY.length),
                tone: 'text-primary',
                icon: 'account_tree',
              },
              {
                title: 'Legacy Test',
                sub: 'ภาพใบแตงโมชุดทดสอบภายใน',
                value: String(MODEL_SUMMARY.testImages),
                tone: 'text-tertiary',
                icon: 'image',
              },
              {
                title: 'Field Validation',
                sub: 'ชุดทดสอบสวนอิสระที่ยืนยันแล้ว',
                value: '0',
                tone: 'text-tertiary',
                icon: 'science',
              },
            ].map((kpi) => (
              <div
                key={kpi.title}
                className="rounded-xl border border-outline-variant/30 bg-surface-lowest p-4 shadow-sm transition-all hover:border-outline-variant/60 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-caption text-on-surface-variant font-medium">{kpi.title}</span>
                  <Icon name={kpi.icon} size={16} className={kpi.tone} />
                </div>
                <p className={cn('mt-2 text-headline-sm font-extrabold', kpi.tone)}>{kpi.value}</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">{kpi.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Tabs */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-12">
        <Card className="mb-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-title-lg font-bold text-on-surface">
                <Icon name="deployed_code" size={22} className="text-primary" />
                ทะเบียนโมเดลและระบบวิเคราะห์ทั้งหมด
              </h2>
              <p className="mt-1 max-w-3xl text-body-sm text-on-surface-variant">
                คำว่า “Validation” ในการ์ด Wide และ Baseline หมายถึงชุดตรวจสอบของข้อมูล mapped ข้ามพืช ไม่ใช่ผลแม่นยำบนใบแตงโมจริง ส่วนตัวเลข Legacy-4 มาจากชุดทดสอบภายใน 173 ภาพของแหล่งข้อมูลเดียวกับชุดฝึก
              </p>
            </div>
            <Badge tone="outline">ค่าเริ่มต้น: legacy4</Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {MODEL_INVENTORY.map((model) => (
              <article key={model.id} className="rounded-xl border border-outline-variant/35 bg-surface-lowest p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-title-sm font-bold text-on-surface">{model.title}</h3>
                  <Badge tone={model.tone}>{model.kind}</Badge>
                </div>
                <p className="mt-3 text-body-sm font-medium text-on-surface">{model.scope}</p>
                <p className="mt-2 text-caption text-secondary">หลักฐาน: {model.evidence}</p>
                <p className="mt-2 text-caption leading-relaxed text-on-surface-variant">ข้อจำกัด: {model.limit}</p>
              </article>
            ))}
          </div>
        </Card>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'vision', label: 'ความแม่นยำรายโรค (Vision Models)', icon: 'biotech' },
              { id: 'confusion', label: 'Confusion Matrix (ตารางทายผิด/ถูก)', icon: 'grid_view' },
              { id: 'acoustic', label: 'การวัดผลเคาะความหวาน (Acoustic)', icon: 'graphic_eq' },
              { id: 'leafcheck', label: 'ตัวกรองคุณภาพภาพ (LeafCheck)', icon: 'verified_user' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-label-md font-semibold transition-all duration-150 active:scale-[0.97]',
                  activeTab === tab.id
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-lowest text-on-surface-variant hover:bg-surface-container',
                )}
              >
                <Icon name={tab.icon} size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-caption text-on-surface-variant">
            <Icon name="info" size={16} />
            <span>{MODEL_SUMMARY.provenance}</span>
          </div>
        </div>

        {/* TAB 1: Vision Models Breakdown */}
        {activeTab === 'vision' && (
          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-title-lg font-bold text-on-surface flex items-center gap-2">
                    <Icon name="analytics" size={22} className="text-primary" />
                    ดัชนี Precision, Recall และ F1-Score รายโรค
                  </h2>
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    เปรียบเทียบความสามารถในการจับโรคจริง (Recall) และความแม่นยำเมื่อโมเดลทำนาย (Precision)
                  </p>
                </div>

                {/* Filter Engine */}
                <div className="flex items-center gap-2">
                  <span className="text-caption text-on-surface-variant">กรองโมเดล:</span>
                  {(['all', 'legacy4'] as const).map((eng) => (
                    <button
                      key={eng}
                      type="button"
                      onClick={() => setSelectedEngine(eng)}
                      className={cn(
                        'cursor-pointer rounded-lg px-2.5 py-1 text-caption font-semibold transition-all',
                        selectedEngine === eng
                          ? 'bg-secondary text-on-secondary'
                          : 'bg-surface-lowest text-on-surface-variant hover:bg-surface-container',
                      )}
                    >
                      {eng === 'all' ? 'ทั้งหมด' : 'Legacy-4'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-caption text-on-surface-variant">
                      <th className="py-3 px-4 font-semibold">โรค / สภาพใบ</th>
                      <th className="py-3 px-4 font-semibold">โมเดล</th>
                      <th className="py-3 px-4 font-semibold text-right">จำนวนตัวอย่าง (N)</th>
                      <th className="py-3 px-4 font-semibold text-right">Precision</th>
                      <th className="py-3 px-4 font-semibold text-right">Recall</th>
                      <th className="py-3 px-4 font-semibold text-right">F1-Score</th>
                      <th className="py-3 px-4 font-semibold w-40">คะแนนความสมบูรณ์</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20 text-body-sm">
                    {filteredMetrics.map((row) => (
                      <tr key={row.nameEn} className="hover:bg-surface-container/40 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-on-surface">
                          <div>{row.nameTh}</div>
                          <div className="text-[11px] text-on-surface-variant italic">{row.nameEn}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge tone={row.engine === 'legacy4' ? 'primary' : 'secondary'} className="text-[10px]">
                            Legacy-4 (ยังไม่ปรับเทียบ)
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-on-surface-variant">{row.samples}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-on-surface">{row.precision.toFixed(1)}%</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-on-surface">{row.recall.toFixed(1)}%</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-primary">{row.f1.toFixed(3)}</td>
                        <td className="py-3.5 px-4">
                          <Meter value={row.precision} tone={row.precision >= 93 ? 'secondary' : 'primary'} label={row.nameTh} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: Confusion Matrix */}
        {activeTab === 'confusion' && (
          <Card>
            <div className="mb-4">
              <h2 className="text-title-lg font-bold text-on-surface flex items-center gap-2">
                <Icon name="grid_view" size={22} className="text-secondary" />
                Confusion Matrix Heatmap (ตารางความสัมพันธ์ผลทำนาย)
              </h2>
              <p className="text-body-sm text-on-surface-variant mt-1">
                แกนตั้งคือคลาสจริง แกนนอนคือผลทำนายของ Legacy-4 ตัวเลขเป็นจำนวนภาพจากชุดทดสอบ 173 ภาพ
              </p>
            </div>

            <div className="overflow-x-auto my-6">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 text-caption text-on-surface-variant text-left bg-surface-low">ชั้นโรคที่เป็นจริง \ ทาย</th>
                    <th className="p-3 text-caption font-bold text-on-surface bg-surface-container/50">ทาย: แอนแทรคโนส</th>
                    <th className="p-3 text-caption font-bold text-on-surface bg-surface-container/50">ทาย: ราน้ำค้าง</th>
                    <th className="p-3 text-caption font-bold text-on-surface bg-surface-container/50">ทาย: ปกติแข็งแรง</th>
                    <th className="p-3 text-caption font-bold text-on-surface bg-surface-container/50">ทาย: ไวรัสใบด่าง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 font-mono text-body-sm">
                  {CONFUSION_MATRIX.map((row, rowIndex) => (
                    <tr key={MODEL_CLASSES[rowIndex]} className="divide-x divide-outline-variant/20">
                      <td className="p-3.5 text-left font-bold font-sans text-on-surface bg-surface-low">{MODEL_CLASS_THAI[MODEL_CLASSES[rowIndex]]}</td>
                      {row.map((count, columnIndex) => (
                        <td key={MODEL_CLASSES[columnIndex]} className={cn('p-3.5', rowIndex === columnIndex ? 'bg-secondary/20 text-secondary font-bold' : 'text-on-surface-variant')}>
                          {count}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg bg-surface-low p-4 text-caption text-on-surface-variant space-y-1">
              <p className="font-semibold text-on-surface">ข้อสังเกตจากการทดสอบ:</p>
              <p>• ช่องทแยงสีเขียวคือภาพที่ทำนายตรงคลาสจริง</p>
              <p>• ในชุดทดสอบนี้ ราน้ำค้าง 10 ภาพและไวรัสใบด่าง 9 ภาพถูกทำนายเป็นใบปกติ จึงไม่ควรใช้ผล “ปกติ” ยืนยันว่าไม่มีโรค</p>
            </div>
          </Card>
        )}

        {/* TAB 3: Acoustic Sweetness */}
        {activeTab === 'acoustic' && (
          <Card>
            <div className="mb-6">
              <h2 className="text-title-lg font-bold text-on-surface flex items-center gap-2">
                <Icon name="graphic_eq" size={22} className="text-tertiary" />
                การประเมินผลการตรวจวัดคลื่นเสียงเคาะความหวาน (Acoustic Brix Model)
              </h2>
              <p className="text-body-sm text-on-surface-variant mt-1">
                ยังไม่มีโมเดลเสียงเคาะที่ผ่านการสอบเทียบกับค่าความหวาน Brix จริง ระบบจึงไม่รายงานความสุกจากเสียง
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="rounded-xl border border-outline-variant/30 bg-surface-lowest p-4">
                  <span className="text-caption text-on-surface-variant">สหสัมพันธ์เชิงเส้น (Correlation Coefficient)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-display-sm font-bold text-tertiary">ยังไม่มีผลวัด</p>
                    <span className="text-caption text-secondary font-semibold">ไม่มีโมเดลที่ยืนยันได้</span>
                  </div>
                  <p className="text-caption text-on-surface-variant mt-2 leading-relaxed">
                    ยังไม่มีชุดข้อมูลเสียงเคาะคู่กับผลวัด Brix จริงที่ใช้ยืนยันความสัมพันธ์นี้
                  </p>
                </div>

                <div className="rounded-xl border border-outline-variant/30 bg-surface-lowest p-4">
                  <span className="text-caption text-on-surface-variant">ความคลาดเคลื่อนเฉลี่ย (Mean Absolute Error)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-display-sm font-bold text-on-surface">ยังไม่มีผลวัด</p>
                    <span className="text-caption text-on-surface-variant">(องศาบริกซ์)</span>
                  </div>
                  <p className="text-caption text-on-surface-variant mt-2">
                    ห้ามใช้เสียงเคาะจากระบบนี้ตัดสินใจเก็บเกี่ยวหรือคัดเกรดจนกว่าจะมีผลสอบเทียบจริง
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-outline-variant/30 bg-surface-lowest p-4">
                <h4 className="font-bold text-on-surface text-label-lg mb-3">ผลการทดสอบแยกตามสายพันธุ์การค้าไทย</h4>
                <div className="space-y-3">
                  {[
                    { breed: 'ยังไม่มีผลทดสอบแยกสายพันธุ์', acc: '—', mae: '—', note: 'ต้องเก็บเสียงและค่า Brix จริงของแต่ละผลก่อน' },
                  ].map((item) => (
                    <div key={item.breed} className="flex items-center justify-between p-2 rounded-lg bg-surface-low">
                      <div>
                        <p className="font-bold text-body-sm text-on-surface">{item.breed}</p>
                        <p className="text-[11px] text-on-surface-variant">{item.note}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-secondary text-body-sm">{item.acc}</span>
                        <p className="text-[11px] font-mono text-on-surface-variant">{item.mae}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* TAB 4: LeafCheck Pre-filtering */}
        {activeTab === 'leafcheck' && (
          <Card>
            <div className="mb-6">
              <h2 className="text-title-lg font-bold text-on-surface flex items-center gap-2">
                <Icon name="verified_user" size={22} className="text-primary" />
                LeafCheck: ระบบตรวจสอบคุณภาพภาพก่อนเข้าโมเดล
              </h2>
              <p className="text-body-sm text-on-surface-variant mt-1">
                ตัวกรองคุณภาพภาพเป็นกฎเชิงภาพเบื้องต้น ยังไม่มีผลทดสอบความแม่นยำที่แยกตรวจอิสระ และไม่ยืนยันชนิดพืช
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-outline-variant/30 bg-surface-lowest p-4">
                <div className="flex items-center gap-2 text-primary font-bold mb-1">
                  <Icon name="hide_image" size={20} />
                  <span>ตรวจจับภาพไม่ใช่ใบ</span>
                </div>
                <p className="text-display-sm font-bold text-on-surface my-2">ไม่มีผลวัด</p>
                <p className="text-caption text-on-surface-variant">
                  ตรวจสัดส่วนเนื้อใบโดยประมาณ แต่ยังแยกใบแตงโมจากพืชอื่นอย่างยืนยันไม่ได้
                </p>
              </div>

              <div className="rounded-xl border border-outline-variant/30 bg-surface-lowest p-4">
                <div className="flex items-center gap-2 text-secondary font-bold mb-1">
                  <Icon name="blur_on" size={20} />
                  <span>ตรวจจับภาพเบลอ (Blurry)</span>
                </div>
                <p className="text-display-sm font-bold text-on-surface my-2">ไม่มีผลวัด</p>
                <p className="text-caption text-on-surface-variant">
                  ใช้เกณฑ์ความคมชัดเพื่อขอภาพใหม่เมื่ออ่านไม่ได้ แต่ยังไม่มีตัวเลขอัตราตรวจถูกต้อง
                </p>
              </div>

              <div className="rounded-xl border border-outline-variant/30 bg-surface-lowest p-4">
                <div className="flex items-center gap-2 text-tertiary font-bold mb-1">
                  <Icon name="brightness_medium" size={20} />
                  <span>ตรวจจับแสงสะท้อนจ้า</span>
                </div>
                <p className="text-display-sm font-bold text-on-surface my-2">ไม่มีผลวัด</p>
                <p className="text-caption text-on-surface-variant">
                  ประเมินความสว่างของภาพเบื้องต้น ยังไม่มีผลทดสอบประสิทธิภาพแยกต่างหาก
                </p>
              </div>
            </div>
          </Card>
        )}
      </section>
    </MarketingShell>
  );
}
