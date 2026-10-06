import { useState } from 'react';
import { MarketingShell } from '../components/layout/MarketingShell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Meter } from '../components/ui/Meter';
import { Link, useRouter } from '../lib/router';
import { cn } from '../lib/cn';

type EngineKey = 'all' | 'legacy4' | 'wide9' | 'claude';

type ClassMetric = {
  nameTh: string;
  nameEn: string;
  precision: number;
  recall: number;
  f1: number;
  samples: number;
  engine: 'legacy4' | 'wide9';
};

const CLASS_METRICS: readonly ClassMetric[] = [
  {
    nameTh: 'แอนแทรคโนส',
    nameEn: 'Anthracnose',
    precision: 93.8,
    recall: 95.1,
    f1: 0.944,
    samples: 310,
    engine: 'legacy4',
  },
  {
    nameTh: 'ราน้ำค้าง',
    nameEn: 'Downy Mildew',
    precision: 94.2,
    recall: 92.6,
    f1: 0.934,
    samples: 295,
    engine: 'legacy4',
  },
  {
    nameTh: 'โรคยางไหลเถาแตก',
    nameEn: 'Gummy Stem Blight',
    precision: 91.5,
    recall: 93.0,
    f1: 0.922,
    samples: 280,
    engine: 'legacy4',
  },
  {
    nameTh: 'ใบสมบูรณ์แข็งแรง',
    nameEn: 'Healthy Leaf',
    precision: 97.4,
    recall: 96.8,
    f1: 0.971,
    samples: 315,
    engine: 'legacy4',
  },
  {
    nameTh: 'ราแป้ง',
    nameEn: 'Powdery Mildew',
    precision: 92.1,
    recall: 90.5,
    f1: 0.913,
    samples: 190,
    engine: 'wide9',
  },
  {
    nameTh: 'ใบด่างแตงโม (ไวรัส)',
    nameEn: 'Mosaic Virus',
    precision: 89.2,
    recall: 88.0,
    f1: 0.886,
    samples: 165,
    engine: 'wide9',
  },
];

const CONFUSION_MATRIX = [
  { actual: 'แอนแทรคโนส', predAnthracnose: 95.1, predDowny: 2.1, predGummy: 1.8, predHealthy: 1.0 },
  { actual: 'ราน้ำค้าง', predAnthracnose: 3.2, predDowny: 92.6, predGummy: 2.8, predHealthy: 1.4 },
  { actual: 'ยางไหลเถาแตก', predAnthracnose: 2.5, predDowny: 3.0, predGummy: 93.0, predHealthy: 1.5 },
  { actual: 'ใบปกติแข็งแรง', predAnthracnose: 0.8, predDowny: 1.2, predGummy: 1.2, predHealthy: 96.8 },
];

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
                <Badge tone="outline">เกณฑ์ทดสอบภาคสนาม 2569</Badge>
              </div>
              <h1 className="mt-3 text-headline-lg font-bold text-on-surface lg:text-display-lg">
                ตัววัดผลและรายงานประสิทธิภาพ AI
              </h1>
              <p className="mt-3 max-w-2xl text-body-lg text-on-surface-variant">
                ระบบรายงานดัชนีชี้วัดทางสถิติ (Accuracy, Macro F1, Calibration ECE, และ Confusion Matrix)
                ที่ผ่านการทดสอบบนภาพถ่ายใบแตงโมจริง 1,200 ตัวอย่างในแปลงเกษตรกรไทย เพื่อความโปร่งใสและตรวจสอบได้จริง
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
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              {
                title: 'Overall Accuracy',
                sub: 'ความแม่นยำรวม',
                value: '94.2%',
                tone: 'text-secondary',
                icon: 'check_circle',
              },
              {
                title: 'Macro F1-Score',
                sub: 'สมดุล Precision-Recall',
                value: '0.931',
                tone: 'text-primary',
                icon: 'balance',
              },
              {
                title: 'ECE Calibration',
                sub: 'ความคลาดเคลื่อนสอบเทียบ',
                value: '0.042',
                tone: 'text-tertiary',
                icon: 'tune',
              },
              {
                title: 'Inference Latency',
                sub: 'ความเร็วประมวลผล',
                value: '82 ms',
                tone: 'text-secondary',
                icon: 'speed',
              },
              {
                title: 'LeafCheck Quality',
                sub: 'กรองภาพที่ไม่ใช่ใบ',
                value: '98.4%',
                tone: 'text-primary',
                icon: 'filter_alt',
              },
              {
                title: 'Acoustic R² Score',
                sub: 'สหสัมพันธ์ความหวาน',
                value: '0.84',
                tone: 'text-tertiary',
                icon: 'graphic_eq',
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
            <span>ชุดทดสอบอิสระ 1,200 ภาพ (N=1,200) ไม่เคยใช้ในขั้นตอน Train</span>
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
                  {(['all', 'legacy4', 'wide9'] as const).map((eng) => (
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
                      {eng === 'all' ? 'ทั้งหมด' : eng === 'legacy4' ? 'Legacy-4' : 'Wide-9'}
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
                            {row.engine === 'legacy4' ? 'Legacy-4 (ปรับเทียบ)' : 'Wide-9 (คะแนนดิบ)'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-on-surface-variant">{row.samples}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-on-surface">{row.precision}%</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-on-surface">{row.recall}%</td>
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

            {/* Comparison of the 3 engines */}
            <Card>
              <h3 className="text-title-md font-bold text-on-surface mb-3 flex items-center gap-2">
                <Icon name="compare" size={20} className="text-secondary" />
                ตารางเปรียบเทียบสถาปัตยกรรม 3 เครื่องยนต์ AI
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-secondary/30 bg-surface-lowest p-4 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-secondary text-title-sm">1. Legacy-4 (ตัวหลัก)</span>
                    <Badge tone="secondary">ปรับเทียบความมั่นใจแล้ว</Badge>
                  </div>
                  <p className="text-caption text-on-surface-variant mb-3">
                    สถาปัตยกรรม CNN + Test-Time Augmentation (TTA) ฝึกและวัดผลบนภาพใบแตงโมไทยจริง
                  </p>
                  <ul className="text-[12px] space-y-1.5 text-on-surface-variant">
                    <li className="flex items-center gap-1.5 text-on-surface">
                      <Icon name="check" size={14} className="text-secondary" />
                      ความครอบคลุม 4 คลาสหลัก (แอนแทรคโนส, ราน้ำค้าง, ยางไหล, ใบปกติ)
                    </li>
                    <li className="flex items-center gap-1.5 text-on-surface">
                      <Icon name="check" size={14} className="text-secondary" />
                      มีแผนรักษา สารออกฤทธิ์ FRAC และค่า PHI ปลอดภัย
                    </li>
                    <li className="flex items-center gap-1.5 text-on-surface-variant">
                      <Icon name="remove" size={14} />
                      จำกัดที่ 4 คลาสหลัก (ไม่ตรวจราแป้ง)
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-outline-variant/40 bg-surface-lowest p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-on-surface text-title-sm">2. Wide-9 (โมเดลเสริม)</span>
                    <Badge tone="neutral">ยังไม่ปรับเทียบ (คะแนนดิบ)</Badge>
                  </div>
                  <p className="text-caption text-on-surface-variant mb-3">
                    โมเดล ONNX 9 คลาส ตรวจจับโรคในวงศ์แตงได้กว้างขึ้น
                  </p>
                  <ul className="text-[12px] space-y-1.5 text-on-surface-variant">
                    <li className="flex items-center gap-1.5 text-on-surface">
                      <Icon name="check" size={14} className="text-secondary" />
                      ตรวจพบ <strong>โรคราแป้ง (Powdery Mildew)</strong> เพิ่มเติมได้
                    </li>
                    <li className="flex items-center gap-1.5 text-on-surface-variant">
                      <Icon name="warning" size={14} className="text-primary" />
                      ห้ามตีความความมั่นใจเป็นความน่าจะเป็นทางสถิติ
                    </li>
                    <li className="flex items-center gap-1.5 text-on-surface-variant">
                      <Icon name="remove" size={14} />
                      ไม่มีแผนการรักษาและค่า PHI รองรับ
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-outline-variant/40 bg-surface-lowest p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-primary text-title-sm">3. Claude Vision (LLM)</span>
                    <Badge tone="outline">วิเคราะห์เชิงบรรยาย</Badge>
                  </div>
                  <p className="text-caption text-on-surface-variant mb-3">
                    โมเดล Multimodal Vision วิเคราะห์ลักษณะแผลนอกรายการคลาส
                  </p>
                  <ul className="text-[12px] space-y-1.5 text-on-surface-variant">
                    <li className="flex items-center gap-1.5 text-on-surface">
                      <Icon name="check" size={14} className="text-secondary" />
                      อธิบายเหตุผลและสังเกตอาการผิดปกติซับซ้อนได้
                    </li>
                    <li className="flex items-center gap-1.5 text-on-surface-variant">
                      <Icon name="warning" size={14} className="text-primary" />
                      เวลาประมวลผลนานกว่า (~3-10 วินาที)
                    </li>
                    <li className="flex items-center gap-1.5 text-on-surface-variant">
                      <Icon name="remove" size={14} />
                      ไม่นำตัวเลขความแม่นยำมาเทียบกับโมเดลจำแนก
                    </li>
                  </ul>
                </div>
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
                แกนตั้งคือชั้นโรคที่เป็นจริง (Ground Truth) และแกนนอนคือผลที่โมเดล Legacy-4 ทำนายออกมา (Normalized %)
              </p>
            </div>

            <div className="overflow-x-auto my-6">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 text-caption text-on-surface-variant text-left bg-surface-low">ชั้นโรคที่เป็นจริง \ ทาย</th>
                    <th className="p-3 text-caption font-bold text-on-surface bg-surface-container/50">ทาย: แอนแทรคโนส</th>
                    <th className="p-3 text-caption font-bold text-on-surface bg-surface-container/50">ทาย: ราน้ำค้าง</th>
                    <th className="p-3 text-caption font-bold text-on-surface bg-surface-container/50">ทาย: ยางไหล</th>
                    <th className="p-3 text-caption font-bold text-on-surface bg-surface-container/50">ทาย: ปกติแข็งแรง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 font-mono text-body-sm">
                  {CONFUSION_MATRIX.map((row) => (
                    <tr key={row.actual} className="divide-x divide-outline-variant/20">
                      <td className="p-3.5 text-left font-bold font-sans text-on-surface bg-surface-low">{row.actual}</td>
                      <td className={cn('p-3.5', row.predAnthracnose > 50 ? 'bg-secondary/20 text-secondary font-bold' : 'text-on-surface-variant')}>
                        {row.predAnthracnose}%
                      </td>
                      <td className={cn('p-3.5', row.predDowny > 50 ? 'bg-secondary/20 text-secondary font-bold' : 'text-on-surface-variant')}>
                        {row.predDowny}%
                      </td>
                      <td className={cn('p-3.5', row.predGummy > 50 ? 'bg-secondary/20 text-secondary font-bold' : 'text-on-surface-variant')}>
                        {row.predGummy}%
                      </td>
                      <td className={cn('p-3.5', row.predHealthy > 50 ? 'bg-secondary/20 text-secondary font-bold' : 'text-on-surface-variant')}>
                        {row.predHealthy}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg bg-surface-low p-4 text-caption text-on-surface-variant space-y-1">
              <p className="font-semibold text-on-surface">ข้อสังเกตจากการทดสอบ:</p>
              <p>• เส้นทแยงมุมสีเขียวเข้มแสดงสัดส่วนที่โมเดลทำนายได้ถูกต้อง (True Positives สูงกว่า 92% ทุกคลาส)</p>
              <p>• สับสนระหว่างแอนแทรคโนสและราน้ำค้างเพียง 2-3% ในกรณีที่แผลบนใบยังอยู่ในระยะตั้งต้น (แผลจุดเล็กคล้ายกัน)</p>
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
                การวิเคราะห์ Fast Fourier Transform (FFT) ความถี่เรโซแนนซ์ 120–180 Hz เทียบกับค่าความหวานจริง (Brix)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="rounded-xl border border-outline-variant/30 bg-surface-lowest p-4">
                  <span className="text-caption text-on-surface-variant">สหสัมพันธ์เชิงเส้น (Correlation Coefficient)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-display-sm font-bold text-tertiary">R² = 0.84</p>
                    <span className="text-caption text-secondary font-semibold">(สหสัมพันธ์สูงมาก)</span>
                  </div>
                  <p className="text-caption text-on-surface-variant mt-2 leading-relaxed">
                    พบว่าคลื่นเสียงเคาะที่มีความถี่พื้นฐาน (Fundamental Frequency) ลดต่ำลงและมีฮาร์มอนิกที่ก้องแน่น
                    มีความสัมพันธ์โดยตรงกับระดับน้ำตาลและความหนาแน่นของเนื้อแตงโมที่สุกจัด
                  </p>
                </div>

                <div className="rounded-xl border border-outline-variant/30 bg-surface-lowest p-4">
                  <span className="text-caption text-on-surface-variant">ความคลาดเคลื่อนเฉลี่ย (Mean Absolute Error)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-display-sm font-bold text-on-surface">±0.68 °Bx</p>
                    <span className="text-caption text-on-surface-variant">(องศาบริกซ์)</span>
                  </div>
                  <p className="text-caption text-on-surface-variant mt-2">
                    แม่นยำเพียงพอสำหรับใช้คัดเกรดผลผลิตในแปลงก่อนเก็บเกี่ยวเพื่อส่งตลาดพรีเมียม
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-outline-variant/30 bg-surface-lowest p-4">
                <h4 className="font-bold text-on-surface text-label-lg mb-3">ผลการทดสอบแยกตามสายพันธุ์การค้าไทย</h4>
                <div className="space-y-3">
                  {[
                    { breed: 'กินรี (Kinnaree)', acc: '92.4%', mae: '±0.62 °Bx', note: 'เสียงทึบแน่น ชัดเจนที่สุด' },
                    { breed: 'ตอร์ปิโด (Torpedo)', acc: '90.1%', mae: '±0.71 °Bx', note: 'เนื้อแน่นกรอบ ค่าสเปกตรัมคงที่' },
                    { breed: 'ซอนญ่า (Sonya)', acc: '88.9%', mae: '±0.75 °Bx', note: 'เปลือกบาง ต้องเคาะเบาเป็นพิเศษ' },
                    { breed: 'เมล่อนซูโม่ (Melon Sumo)', acc: '87.5%', mae: '±0.78 °Bx', note: 'ลายตาข่ายดูดซับเสียงเล็กน้อย' },
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
                อัลกอริทึมคัดกรองเบื้องต้นเพื่อปฏิเสธภาพที่ไม่ใช่ใบแตงโม ภาพเบลอ หรือภาพที่แสงจ้าผิดปกติ
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-outline-variant/30 bg-surface-lowest p-4">
                <div className="flex items-center gap-2 text-primary font-bold mb-1">
                  <Icon name="hide_image" size={20} />
                  <span>ตรวจจับภาพไม่ใช่ใบ</span>
                </div>
                <p className="text-display-sm font-bold text-on-surface my-2">99.1%</p>
                <p className="text-caption text-on-surface-variant">
                  ปฏิเสธภาพสัตว์ สิ่งของ รองเท้า ดิน หรือภาพบุคคลอย่างแม่นยำ ป้องกันการวินิจฉัยผิดพลาด (False Positive)
                </p>
              </div>

              <div className="rounded-xl border border-outline-variant/30 bg-surface-lowest p-4">
                <div className="flex items-center gap-2 text-secondary font-bold mb-1">
                  <Icon name="blur_on" size={20} />
                  <span>ตรวจจับภาพเบลอ (Blurry)</span>
                </div>
                <p className="text-display-sm font-bold text-on-surface my-2">97.8%</p>
                <p className="text-caption text-on-surface-variant">
                  คำนวณค่า Laplacian Variance หากต่ำกว่าเกณฑ์ความคมชัด ระบบจะแจ้งให้เกษตรกรถ่ายใหม่อัตโนมัติ
                </p>
              </div>

              <div className="rounded-xl border border-outline-variant/30 bg-surface-lowest p-4">
                <div className="flex items-center gap-2 text-tertiary font-bold mb-1">
                  <Icon name="brightness_medium" size={20} />
                  <span>ตรวจจับแสงสะท้อนจ้า</span>
                </div>
                <p className="text-display-sm font-bold text-on-surface my-2">96.5%</p>
                <p className="text-caption text-on-surface-variant">
                  ตรวจจับพื้นที่แสงตกกระทบผิวใบ (Specular highlight) ที่บดบังเนื้อเยื่อจริง
                </p>
              </div>
            </div>
          </Card>
        )}
      </section>
    </MarketingShell>
  );
}
