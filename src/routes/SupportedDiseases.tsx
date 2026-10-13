import { useMemo, useState } from 'react';
import { MarketingShell } from '../components/layout/MarketingShell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Meter } from '../components/ui/Meter';
import { Link } from '../lib/router';
import { cn } from '../lib/cn';
import { DISEASES, SEVERITY_LABEL, SEVERITY_TONE, type Disease } from '../data/diseases';
import { modelCoverage } from '../lib/diseaseModel';
import legacyMetrics from '../../fastapi_service/metrics.json';
import wide9Meta from '../../fastapi_service/melon_m0.labels.json';
import wide11Meta from '../../fastapi_service/melon_pv0.labels.json';
import baseline9Meta from '../../fastapi_service/watermelon_cls.labels.json';

const CATEGORIES = ['ทั้งหมด', 'เชื้อรา', 'ไวรัส', 'แบคทีเรีย', 'แมลงศัตรูพืช'] as const;
type Category = (typeof CATEGORIES)[number];
type ModelKey = 'legacy4' | 'wide9' | 'wide11' | 'baseline9' | 'claude';

const DISEASE_TO_MODEL_CLASS: Record<string, string> = {
  'alternaria-blight': 'alternaria_blight',
  'angular-leaf-spot': 'angular_leaf_spot',
  'cercospora-leaf-spot': 'cercospora_leaf_spot',
  'downy-mildew': 'downy_mildew',
  'leaf-curl-virus': 'leaf_curl_virus',
  'phytophthora-blight': 'phytophthora_blight',
  'powdery-mildew': 'powdery_mildew',
  'watermelon-mosaic-virus': 'watermelon_mosaic_virus',
  'thrips-mites': 'spider_mite',
  'target-leaf-spot': 'target_leaf_spot',
};

const VISION_SCOPE = [
  {
    id: 'legacy4',
    name: 'Legacy-4',
    classes: '4 คลาส',
    role: 'ผลวินิจฉัยหลัก',
    evidence: `ทดสอบภายใน ${legacyMetrics.split_counts.test} ภาพ · Accuracy ${(legacyMetrics.test.accuracy * 100).toFixed(1)}%`,
    coverage: 'แอนแทรคโนส · ราน้ำค้าง · ไวรัสใบด่าง · ใบปกติ',
    limit: 'ไม่รู้จักโรคนอก 4 คลาส และรุ่นปัจจุบันยังไม่ปรับเทียบความน่าจะเป็น',
    tone: 'primary' as const,
  },
  {
    id: 'wide9',
    name: 'Wide-9',
    classes: '9 คลาส',
    role: 'ข้อสังเกตเพิ่มเติม',
    evidence: `Validation ${(wide9Meta.val_accuracy * 100).toFixed(1)}% บนข้อมูล mapped ข้ามพืช`,
    coverage: 'เพิ่มราแป้ง ใบจุด Alternaria/Cercospora/Angular โรคใบม้วน และ Phytophthora',
    limit: 'ยังไม่มีผลวัดบนแปลงแตงโม ห้ามใช้คะแนนเป็นความน่าจะเป็นหรือเลือกสารเคมี',
    tone: 'secondary' as const,
  },
  {
    id: 'wide11',
    name: 'Wide-11',
    classes: '11 คลาส',
    role: 'รุ่นทดลอง',
    evidence: `Validation ${(wide11Meta.val_accuracy * 100).toFixed(1)}% บนข้อมูล mapped ข้ามพืช`,
    coverage: 'ขยายจาก Wide-9 ด้วยไรแดงและโรคใบจุดวงแหวน',
    limit: 'ตัวเลขสูงจากชุดข้อมูลคนละโดเมน ไม่ใช่หลักฐานความแม่นยำบนแตงโม',
    tone: 'tertiary' as const,
  },
  {
    id: 'baseline9',
    name: 'Baseline-9',
    classes: '9 คลาส',
    role: 'รุ่นเทียบเคียงย้อนหลัง',
    evidence: `Validation ${(baseline9Meta.val_accuracy * 100).toFixed(1)}% บนข้อมูล mapped ข้ามพืช`,
    coverage: 'ใช้ฉลากชุดเดียวกับ Wide-9 เพื่อเปรียบเทียบพัฒนาการ',
    limit: 'ไม่ใช่ตัวเลือกหลักและไม่มีผลทดสอบภาคสนามบนแตงโม',
    tone: 'neutral' as const,
  },
  {
    id: 'claude',
    name: 'Claude Vision',
    classes: 'ไม่ตรึงคลาส',
    role: 'ตัวเลือกเสียเงินแบบ opt-in',
    evidence: 'ยังไม่มี benchmark ของโครงการบนภาพแตงโม',
    coverage: 'เลือกได้จากรหัสโรคในแคตตาล็อกที่ระบบส่งให้ และอธิบายสิ่งที่เห็นในภาพ',
    limit: 'ไม่ได้หมายความว่าตรวจได้จริงทุกโรค ผลเป็นข้อสังเกต ไม่ใช่คำวินิจฉัย',
    tone: 'outline' as const,
  },
] as const;

type VisionModel = (typeof VISION_SCOPE)[number];
type DiseaseEvidence =
  | { kind: 'measured'; percent: number; title: string; note: string; meterLabel: string }
  | { kind: 'candidate'; title: string; note: string }
  | { kind: 'unsupported'; title: string; note: string };

function modelRecall(model: ModelKey, className: string) {
  if (model === 'wide9') return (wide9Meta.per_class_recall as Record<string, number>)[className];
  if (model === 'wide11') return (wide11Meta.per_class_recall as Record<string, number>)[className];
  if (model === 'baseline9') return (baseline9Meta.per_class_recall as Record<string, number>)[className];
  return undefined;
}

function diseaseEvidence(disease: Disease, model: VisionModel): DiseaseEvidence {
  if (model.id === 'legacy4') {
    const coverage = modelCoverage(disease.id);
    return coverage
      ? {
          kind: 'measured',
          percent: coverage.recall * 100,
          title: 'ตรวจพบในชุดทดสอบใบแตงโม',
          note: `จากชุดทดสอบ ${coverage.support} ภาพ`,
          meterLabel: `สัดส่วนภาพโรค${disease.name}ที่ Legacy-4 ตรวจพบในชุดทดสอบ`,
        }
      : {
          kind: 'unsupported',
          title: 'ไม่อยู่ใน 4 คลาส',
          note: 'โมเดลนี้ไม่รู้จักโรคนี้และอาจบังคับเลือกคลาสที่ใกล้ที่สุด',
        };
  }

  if (model.id === 'claude') {
    return {
      kind: 'candidate',
      title: 'อยู่ในรายการ candidate',
      note: 'ระบบส่งโรคนี้ให้โมเดลพิจารณาได้ แต่ยังไม่มี benchmark ยืนยันความแม่นยำ',
    };
  }

  const className = DISEASE_TO_MODEL_CLASS[disease.id];
  const recall = className ? modelRecall(model.id, className) : undefined;
  return recall === undefined
    ? {
        kind: 'unsupported',
        title: `ไม่อยู่ใน ${model.classes}`,
        note: 'โมเดลนี้ไม่มีคลาสผลลัพธ์สำหรับโรคนี้',
      }
    : {
        kind: 'measured',
        percent: recall * 100,
        title: 'Recall บน validation ข้ามพืช',
        note: 'เป็นข้อมูล mapped ข้ามพืช ไม่ใช่ผลทดสอบความแม่นยำบนแตงโม',
        meterLabel: `Recall ของคลาส ${className} บนชุด validation ข้ามพืช`,
      };
}

function DiseaseCard({
  disease,
  expanded,
  onToggle,
  model,
}: {
  disease: Disease;
  expanded: boolean;
  onToggle: () => void;
  model: VisionModel;
}) {
  const panelId = `disease-panel-${disease.id}`;
  const evidence = diseaseEvidence(disease, model);

  return (
    <Card as="article" className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-title-md font-bold text-on-surface">{disease.name}</h3>
            <Badge tone={SEVERITY_TONE[disease.severity]}>{SEVERITY_LABEL[disease.severity]}</Badge>
          </div>
          <p className="mt-0.5 text-caption text-on-surface-variant italic">
            {disease.latin} • {disease.pathogen}
          </p>
        </div>
        <Badge tone="outline">{disease.category}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-surface-low p-3">
          <p className="text-caption text-on-surface-variant">ความเสียหายต่อผลผลิต</p>
          <p className="mt-0.5 text-title-md font-bold text-primary">{disease.yieldLoss}</p>
        </div>
        <div className="rounded-md bg-surface-low p-3">
          {evidence.kind === 'measured' ? (
            <>
              <p className="text-caption text-on-surface-variant">{model.name} · {evidence.title}</p>
              <p className="mt-0.5 text-title-md font-bold text-secondary">{Math.round(evidence.percent * 10) / 10}%</p>
              <Meter
                value={evidence.percent}
                tone={model.id === 'legacy4' ? 'secondary' : 'primary'}
                className="mt-2 h-1.5"
                label={evidence.meterLabel}
              />
              <p className="mt-1.5 text-caption text-on-surface-variant">{evidence.note}</p>
            </>
          ) : (
            <>
              <p className="text-caption text-on-surface-variant">{model.name} · ขอบเขตการตรวจ</p>
              <p className={cn('mt-0.5 text-title-md font-bold', evidence.kind === 'candidate' ? 'text-secondary' : 'text-on-surface-variant')}>
                {evidence.title}
              </p>
              <p className="mt-1.5 text-caption text-on-surface-variant">{evidence.note}</p>
            </>
          )}
        </div>
      </div>

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-label-lg font-semibold text-on-surface">
          <Icon name="visibility" size={16} className="text-primary" />
          อาการที่สังเกตได้
        </p>
        <ul className="flex flex-col gap-1.5 text-body-md text-on-surface-variant">
          {disease.symptoms.map((symptom) => (
            <li key={symptom} className="flex items-start gap-2">
              <span className="font-bold text-primary">•</span>
              <span>{symptom}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex cursor-pointer items-center justify-between rounded-md bg-surface-low px-4 py-2.5 text-label-lg font-semibold text-on-surface transition-colors hover:bg-surface-container"
      >
        {expanded ? 'ย่อแผนการรักษา' : 'ดูแผนการรักษาและป้องกัน'}
        <Icon name={expanded ? 'expand_less' : 'expand_more'} size={20} className="text-on-surface-variant" />
      </button>

      {expanded ? (
        <div id={panelId} className="flex flex-col gap-3">
          <div className="rounded-md bg-melon-tint p-4">
            <p className="flex items-center gap-1.5 text-label-lg font-bold text-on-surface">
              <Icon name="cloudy_snowing" size={16} className="text-primary" />
              สภาพที่กระตุ้นการระบาด
            </p>
            <p className="mt-1 text-body-md text-on-surface-variant">{disease.conditions}</p>
          </div>

          {[
            { icon: 'medication', title: 'สารเคมีควบคุม', body: disease.chemical, tone: 'bg-surface-low' },
            { icon: 'biotech', title: 'ชีวภัณฑ์ทางเลือก', body: disease.biological, tone: 'bg-mint-mist' },
            { icon: 'agriculture', title: 'การจัดการแปลง', body: disease.cultural, tone: 'bg-surface-low' },
          ].map((item) => (
            <div key={item.title} className={cn('rounded-md p-4', item.tone)}>
              <p className="flex items-center gap-1.5 text-label-lg font-bold text-on-surface">
                <Icon name={item.icon} size={16} className="text-secondary" />
                {item.title}
              </p>
              <p className="mt-1 text-body-md text-on-surface-variant">{item.body}</p>
            </div>
          ))}

          <div className="flex items-center gap-2 rounded-md border border-outline-variant/60 px-4 py-2.5">
            <Icon name="schedule" size={16} className="text-primary" />
            <span className="text-body-md text-on-surface-variant">
              ระยะปลอดภัยก่อนเก็บเกี่ยว (PHI):{' '}
              <span className="font-bold text-on-surface">
                {disease.phi > 0 ? `${disease.phi} วัน` : 'ไม่ใช้สารเคมีรักษา'}
              </span>
            </span>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export function SupportedDiseases() {
  const [category, setCategory] = useState<Category>('ทั้งหมด');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(DISEASES[0].id);
  const [selectedModel, setSelectedModel] = useState<ModelKey>('legacy4');
  const activeModel = VISION_SCOPE.find((model) => model.id === selectedModel) ?? VISION_SCOPE[0];

  const filtered = useMemo(() => {
    const rawTokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return DISEASES.filter((disease) => {
      const matchesCategory = category === 'ทั้งหมด' || disease.category === category;
      if (!matchesCategory) return false;
      if (rawTokens.length === 0) return true;

      // ค้นหาครอบคลุมทุกข้อมูล: ชื่อไทย, ชื่อวิทยาศาสตร์, เชื้อสาเหตุ, อาการ, สภาพแวดล้อม, สารเคมี, ชีวภัณฑ์, เขตกรรม, ความรุนแรง และ PHI
      const searchable = [
        disease.name,
        disease.latin,
        disease.pathogen,
        disease.category,
        SEVERITY_LABEL[disease.severity],
        disease.yieldLoss,
        ...(disease.symptoms ?? []),
        disease.conditions,
        disease.chemical,
        disease.biological,
        disease.cultural,
        `phi ${disease.phi} วัน`,
        `${disease.phi} วัน`,
      ]
        .join(' ')
        .toLowerCase();

      return rawTokens.every((token) => searchable.includes(token));
    });
  }, [category, query]);

  return (
    <MarketingShell>
      <section className="relative overflow-hidden bg-gradient-to-b from-surface-lowest via-surface-low to-surface py-14">
        <div className="pointer-events-none absolute -top-24 -left-20 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2">
              <Badge tone="secondary">
                <Icon name="coronavirus" size={14} />
                คลังความรู้โรคแตงโม
              </Badge>
            </div>
            <h1 className="mt-3 text-headline-lg text-on-surface lg:text-display-lg">
              คลังความรู้โรคแตงโมและขอบเขตการตรวจของ AI
            </h1>
            <p className="mt-3 max-w-2xl text-body-lg text-on-surface-variant">
              กำลังแสดงขอบเขตของ <span className="font-bold text-on-surface">{activeModel.name}</span>: {activeModel.coverage} ฐานข้อมูลมี {DISEASES.length} รายการ แต่ไม่ใช่จำนวนโรคที่ AI ยืนยันได้
            </p>
          </div>

          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
            {[
              { value: activeModel.classes, label: activeModel.role, tone: 'text-primary' },
              { value: activeModel.name, label: activeModel.evidence, tone: 'text-secondary' },
              { value: `${DISEASES.length} รายการ`, label: 'คลังความรู้อ้างอิงทั้งหมด', tone: 'text-tertiary' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-surface-lowest p-4 shadow-sm">
                <p className={cn('text-headline-md font-bold', stat.tone)}>{stat.value}</p>
                <p className="text-label-md text-on-surface-variant">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-12">
        <Card className="mb-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-title-lg font-bold text-on-surface">
                <Icon name="account_tree" size={22} className="text-primary" />
                โมเดลใดครอบคลุมโรคอะไร
              </h2>
              <p className="mt-1 max-w-3xl text-body-sm text-on-surface-variant">
                ตัวเลขของแต่ละรุ่นเปรียบเทียบตรง ๆ ไม่ได้: Legacy‑4 วัดกับภาพใบแตงโมจากแหล่งเดียวกับชุดฝึก ส่วน Wide และ Baseline วัดกับชุดข้อมูล mapped ที่มีภาพพืชอื่นเป็นตัวแทนหลายคลาส
              </p>
              <p className="mt-2 text-label-md font-semibold text-primary">เลือกการ์ดโมเดลเพื่อเปลี่ยนข้อมูลทั้งหน้า</p>
            </div>
            <Link to="/evaluation" className="inline-flex items-center gap-1.5 text-label-lg font-semibold text-primary hover:underline">
              ดูหลักฐานการวัดผล
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5" role="radiogroup" aria-label="เลือกโมเดล AI ที่ต้องการดูขอบเขต">
            {VISION_SCOPE.map((model) => (
              <button
                key={model.id}
                type="button"
                role="radio"
                aria-checked={selectedModel === model.id}
                onClick={() => setSelectedModel(model.id)}
                className={cn(
                  'cursor-pointer rounded-xl border bg-surface-lowest p-4 text-left transition-all duration-200 ease-tactile hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  selectedModel === model.id
                    ? 'border-primary bg-primary-fixed/25 shadow-md ring-2 ring-primary/15'
                    : 'border-outline-variant/35',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-title-sm font-bold text-on-surface">{model.name}</h3>
                  <Badge tone={model.tone}>{model.classes}</Badge>
                </div>
                {selectedModel === model.id ? (
                  <span className="mt-2 inline-flex items-center gap-1 text-caption font-bold text-primary">
                    <Icon name="check_circle" size={15} />
                    กำลังแสดงข้อมูลรุ่นนี้
                  </span>
                ) : null}
                <p className="mt-2 text-caption font-semibold text-secondary">{model.role}</p>
                <p className="mt-3 text-body-sm text-on-surface">{model.coverage}</p>
                <p className="mt-2 text-caption text-on-surface-variant">หลักฐาน: {model.evidence}</p>
                <p className="mt-2 text-caption leading-relaxed text-primary">ข้อจำกัด: {model.limit}</p>
              </button>
            ))}
          </div>
        </Card>

        {/* แถบค้นหาและตัวกรอง — ล็อกอยู่กับที่ (Sticky) ด้านบนเมื่อเลื่อนหน้าจอ */}
        <div className="sticky top-16 z-30 -mx-4 mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-outline-variant/30 bg-surface/95 px-4 py-3 shadow-sm backdrop-blur-md sm:-mx-6 sm:px-6">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-surface-lowest px-4 py-2.5 shadow-sm sm:max-w-md">
            <Icon name="search" size={18} className="text-outline" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาข้อมูลทั้งหมด: ชื่อโรค, เชื้อสาเหตุ, อาการ, สารเคมีรักษา, ชีวภัณฑ์ หรือ PHI..."
              className="w-full min-w-0 border-0 bg-transparent text-body-md text-on-surface outline-none placeholder:text-outline"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="cursor-pointer text-outline hover:text-on-surface p-0.5"
                title="ล้างคำค้นหา"
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={cn(
                  'cursor-pointer rounded-full px-3.5 py-1.5 text-label-md font-semibold transition-all duration-150 ease-tactile active:scale-[0.96]',
                  category === item
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-lowest text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* แถบสรุปจำนวนรายการที่พบ */}
        <div className="mb-4 flex items-center justify-between px-1 text-caption text-on-surface-variant">
          <span>
            แสดง {filtered.length} จากทั้งหมด {DISEASES.length} โรคในคลังความรู้ · ขอบเขตของ <span className="font-semibold text-primary">{activeModel.name}</span>
            {query && <span className="font-semibold text-primary"> (คำค้น: "{query}")</span>}
          </span>
          {(query || category !== 'ทั้งหมด') && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory('ทั้งหมด');
              }}
              className="cursor-pointer text-primary hover:underline font-semibold"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-16 text-center">
            <Icon name="search_off" size={40} className="text-outline" />
            <p className="text-title-md font-bold text-on-surface">ไม่พบโรคที่ตรงกับคำค้นหา</p>
            <p className="max-w-md text-body-md text-on-surface-variant">
              ลองค้นด้วยอาการที่เห็น เช่น "ใบเหลือง" หรือ "ยางไหล" หรือถาม AI โดยตรงพร้อมแนบภาพใบ
            </p>
            <Button className="mt-2" onClick={() => setQuery('')}>
              ล้างคำค้นหา
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {filtered.map((disease) => (
              <DiseaseCard
                key={disease.id}
                disease={disease}
                model={activeModel}
                expanded={openId === disease.id}
                onToggle={() => setOpenId(openId === disease.id ? null : disease.id)}
              />
            ))}
          </div>
        )}

        <Card className="mt-8 flex flex-wrap items-center justify-between gap-5 bg-primary text-on-primary">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-on-primary/15">
              <Icon name="photo_camera" size={26} />
            </span>
            <div>
              <p className="text-headline-sm font-bold">ไม่แน่ใจว่าเป็นโรคไหน?</p>
              <p className="mt-0.5 text-body-md text-primary-fixed">
                {activeModel.id === 'claude'
                  ? 'Claude Vision ใช้ได้เมื่อผู้ดูแลเปิดบริการ และผลจะแสดงเป็นข้อสังเกตเพิ่มเติมเท่านั้น'
                  : `ถ่ายรูปใบหรือลำต้น แล้วเลือก ${activeModel.name} ตามขอบเขตและข้อจำกัดที่แสดงด้านบน`}
              </p>
            </div>
          </div>
          <Link
            to="/disease-scan"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-on-primary px-5 text-label-lg font-semibold text-primary transition-transform duration-150 ease-tactile active:scale-[0.96]"
          >
            <Icon name="document_scanner" size={18} />
            สแกนวิเคราะห์ใบแตงโม
          </Link>
        </Card>
      </section>
    </MarketingShell>
  );
}
