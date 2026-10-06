import { useMemo, useState } from 'react';
import { MarketingShell } from '../components/layout/MarketingShell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Meter } from '../components/ui/Meter';
import { Link, useRouter } from '../lib/router';
import { cn } from '../lib/cn';
import { DISEASES, SEVERITY_LABEL, SEVERITY_TONE, type Disease } from '../data/diseases';
import { modelCoverage } from '../lib/diseaseModel';

const CATEGORIES = ['ทั้งหมด', 'เชื้อรา', 'ไวรัส', 'แบคทีเรีย', 'แมลงศัตรูพืช'] as const;
type Category = (typeof CATEGORIES)[number];

function DiseaseCard({ disease, expanded, onToggle }: { disease: Disease; expanded: boolean; onToggle: () => void }) {
  const panelId = `disease-panel-${disease.id}`;
  const coverage = modelCoverage(disease.id);

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
          {coverage ? (
            <>
              <p className="text-caption text-on-surface-variant">AI ตรวจพบจากภาพได้</p>
              <p className="mt-0.5 text-title-md font-bold text-secondary">{Math.round(coverage.recall * 1000) / 10}%</p>
              <Meter
                value={coverage.recall * 100}
                tone="secondary"
                className="mt-2 h-1.5"
                label={`สัดส่วนภาพที่ AI ตรวจพบโรค${disease.name}`}
              />
              <p className="mt-1.5 text-caption text-on-surface-variant">
                จากชุดทดสอบ {coverage.support} ภาพ
              </p>
            </>
          ) : (
            <>
              <p className="text-caption text-on-surface-variant">AI ตรวจจากภาพ</p>
              <p className="mt-0.5 text-title-md font-bold text-on-surface-variant">ยังไม่รองรับ</p>
              <p className="mt-1.5 text-caption text-on-surface-variant">
                เป็นข้อมูลอ้างอิงเท่านั้น ต้องให้เจ้าหน้าที่ตรวจแปลงจริง
              </p>
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
  const { navigate } = useRouter();
  const [category, setCategory] = useState<Category>('ทั้งหมด');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(DISEASES[0].id);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return DISEASES.filter((disease) => {
      const matchesCategory = category === 'ทั้งหมด' || disease.category === category;
      const matchesQuery =
        !needle ||
        disease.name.toLowerCase().includes(needle) ||
        disease.latin.toLowerCase().includes(needle) ||
        disease.pathogen.toLowerCase().includes(needle) ||
        disease.symptoms.some((symptom) => symptom.toLowerCase().includes(needle));
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <MarketingShell>
      <section className="relative overflow-hidden bg-gradient-to-b from-surface-lowest via-surface-low to-surface py-14">
        <div className="pointer-events-none absolute -top-24 -left-20 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    navigate('/');
                  }
                }}
                aria-label="ย้อนกลับ"
                className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-surface-lowest px-2.5 py-1 text-label-sm font-semibold text-on-surface-variant shadow-xs transition-colors hover:bg-surface-container"
              >
                <Icon name="arrow_back" size={16} />
                <span>ย้อนกลับ</span>
              </button>
              <Badge tone="secondary">
                <Icon name="coronavirus" size={14} />
                คลังความรู้โรคแตงโม
              </Badge>
            </div>
            <h1 className="mt-3 text-headline-lg text-on-surface lg:text-display-lg">
              คลังความรู้โรคแตงโมและขอบเขตการตรวจของ AI
            </h1>
            <p className="mt-3 max-w-2xl text-body-lg text-on-surface-variant">
              ฐานข้อมูลโรคพืชและศัตรูแตงโม {DISEASES.length} รายการ โดยโมเดล Vision AI ในปัจจุบัน (Legacy 4) รองรับการตรวจคัดกรองจากภาพ 4 คลาสหลัก (แอนแทรคโนส, ราน้ำค้าง, ไวรัสใบด่าง และใบปกติ) พร้อมตัวเลือกเสริมโมเดล Wide-9 และ Claude Vision สำหรับโรคอื่น ๆ ส่วนรายการที่เหลือในคลังความรู้เป็นข้อมูลอ้างอิงทางวิชาการและแนวทางจัดการแปลง
            </p>
          </div>

          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
            {[
              { value: '4 คลาสหลัก', label: 'โมเดลมาตรฐาน Legacy 4 (ปรับเทียบแล้ว)', tone: 'text-primary' },
              { value: `${DISEASES.length} โรค`, label: 'ข้อมูลในคลังความรู้อ้างอิง', tone: 'text-secondary' },
              { value: '3 Engine', label: 'รองรับ Legacy 4, Wide-9, Claude', tone: 'text-tertiary' },
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
        <div className="sticky top-20 z-30 -mx-4 mb-6 flex flex-wrap items-center gap-3 bg-surface/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-surface-lowest px-4 py-2.5 shadow-sm sm:max-w-sm">
            <Icon name="search" size={18} className="text-outline" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อโรค อาการ หรือชื่อเชื้อ..."
              className="w-full min-w-0 border-0 bg-transparent text-body-md text-on-surface outline-none placeholder:text-outline"
            />
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
                ถ่ายรูปใบหรือลำต้นแล้วให้ AI วิเคราะห์ให้ทันทีภายใน 3 วินาที
              </p>
            </div>
          </div>
          <Link
            to="/chat"
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
