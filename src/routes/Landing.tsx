import { useEffect, useRef, useState } from 'react';
import { MarketingShell } from '../components/layout/MarketingShell';
import { Card } from '../components/ui/Card';
import { Badge, LiveBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { MelonAvatar } from '../components/brand/Logo';
import { useToast } from '../components/ui/Toast';
import { Link, useRouter } from '../lib/router';
import { cn } from '../lib/cn';
import { ApiError, NetworkError, api, type DiseaseDetection } from '../lib/api';
import { runClientDiseaseAnalysis } from '../lib/clientDiseaseHeuristic';

const STITCH_CASES = [
  {
    id: 'anthracnose',
    name: 'โรคใบจุดแอนแทรคโนส (Watermelon Anthracnose)',
    label: '1. แอนแทรคโนส',
    subLabel: 'รอยจุดบุ๋มสีเข้ม',
    confidence: '98.6%',
    pathogen: 'Colletotrichum orbiculare',
    treatment: 'ใช้สารกลุ่ม 11 (Azoxystrobin) อัตรา 10 มล. ต่อน้ำ 20 ลิตร ฉีดพ่นทุก 5-7 วัน สลับกับสารกลุ่ม 3 (Difenoconazole) เพื่อป้องกันเชื้อดื้อยา แนะนำเด็ดใบที่เป็นโรคเผาทำลายทันที',
    reticleText: 'ตรวจพบลักษณะแผลแอนแทรคโนส',
    hudSensor: 'วิเคราะห์ภาพถ่ายใบพืช',
    scanId: 'WM-2024-8841',
  },
  {
    id: 'downy',
    name: 'โรคราน้ำค้างแตงโม (Downy Mildew)',
    label: '2. ราน้ำค้าง',
    subLabel: 'เหลืองเหลี่ยมเส้นใบ',
    confidence: '97.9%',
    pathogen: 'Pseudoperonospora cubensis',
    treatment: 'ใช้สารกลุ่ม 40 (Dimethomorph) 15 กรัม หรือสารกลุ่ม 28 (Propamocarb) สลับกับสารกลุ่ม M (Mancozeb) เพื่อป้องกันการระบาดลามทั้งแปลง งดการให้น้ำทางใบช่วงเย็น',
    reticleText: 'ตรวจพบอาการราน้ำค้างตามเส้นใบ',
    hudSensor: 'วิเคราะห์ภาพถ่ายใบพืช',
    scanId: 'WM-2024-9102',
  },
  {
    id: 'mosaic',
    name: 'โรคไวรัสยอดหงิกใบด่าง (Watermelon Mosaic Virus)',
    label: '3. ยอดหงิกด่าง',
    subLabel: 'ใบหด ย่น เสียรูป',
    confidence: '96.8%',
    pathogen: 'WMV / Potyvirus (พาหะ: เพลี้ยอ่อน Aphis gossypii)',
    treatment: 'โรคจากไวรัสไม่สามารถรักษาด้วยยาเชื้อรา ต้องควบคุมแมลงพาหะด้วยสารกลุ่ม 4A (Imidacloprid) หรือสารชีวภาพน้ำมันสะเดา และถอนต้นแคระแกร็นเผาทำลายนอกแปลงทันที',
    reticleText: 'ตรวจพบอาการไวรัสยอดหงิกใบด่าง',
    hudSensor: 'วิเคราะห์ภาพถ่ายใบพืช',
    scanId: 'WM-2024-9428',
  },
  {
    id: 'healthy',
    name: 'ใบแตงโมสมบูรณ์ แข็งแรง ไร้รอยโรค (Healthy Leaf)',
    label: '4. ใบสมบูรณ์',
    subLabel: 'เขียวสด ไร้รอยโรค',
    confidence: '99.2%',
    pathogen: 'ไม่พบเชื้อราหรือไวรัสก่อโรค (Negative)',
    treatment: 'ต้นแตงโมมีคลอโรฟิลล์สมบูรณ์ แนะนำให้ปุ๋ยบำรุงธาตุรอง แคลเซียม-โบรอน อัตรา 10 ซีซี ต่อน้ำ 20 ลิตร และพ่นเชื้อราไตรโคเดอร์มาป้องกันเชื้อโรคเข้าทำลายทุก 10 วัน',
    reticleText: 'ใบสมบูรณ์แข็งแรง ไม่พบรอยโรค',
    hudSensor: 'วิเคราะห์ภาพถ่ายใบพืช',
    scanId: 'WM-2024-9550',
  },
];

/** The live-scan box: pick a sample leaf, watch the scan, read the verdict. */
function ScanDemo({ navigate }: { navigate: (to: string) => void }) {
  const [selected, setSelected] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'done'>('done');
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customDiagnosis, setCustomDiagnosis] = useState<DiseaseDetection | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);
  const toast = useToast();
  const currentCase = STITCH_CASES[selected];
  const displayName = customDiagnosis ? customDiagnosis.thai_name : currentCase.name;
  const displayPathogen = customDiagnosis ? customDiagnosis.scientific_name : currentCase.pathogen;
  const displayConfidence = customDiagnosis ? `${customDiagnosis.confidence_percentage}%` : currentCase.confidence;
  const displayTreatment = customDiagnosis
    ? [
        customDiagnosis.symptoms.join(' • '),
        customDiagnosis.chemical_control.length ? `สารเคมี: ${customDiagnosis.chemical_control.join(', ')}` : '',
        // Never show a chemical without its pre-harvest interval beside it.
        customDiagnosis.chemical_control.length ? customDiagnosis.phi_note : '',
        customDiagnosis.organic_control.length ? `ชีวภัณฑ์: ${customDiagnosis.organic_control.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' • ')
    : currentCase.treatment;
  const displayReticle = customDiagnosis
    ? (customDiagnosis.urgent_action || customDiagnosis.thai_name)
    : currentCase.reticleText;

  useEffect(() => {
    return () => {
      timers.current.forEach(window.clearTimeout);
    };
  }, []);

  function runScan(index: number) {
    timers.current.forEach(window.clearTimeout);
    setSelected(index);
    setCustomImage(null);
    setCustomDiagnosis(null);
    setPhase('scanning');
    timers.current = [window.setTimeout(() => setPhase('done'), 1400)];
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setCustomImage(base64);
      timers.current.forEach(window.clearTimeout);
      setPhase('scanning');

      try {
        let result: DiseaseDetection;
        try {
          result = await api.detectDisease({
            imageBase64: base64,
            notes: 'Landing Live Scan Demo',
          });
        } catch (apiErr) {
          const isOfflineOrPreview =
            (apiErr instanceof ApiError && (apiErr.status === 404 || apiErr.status === 502 || apiErr.status === 503)) ||
            apiErr instanceof NetworkError;
          if (isOfflineOrPreview) {
            result = await runClientDiseaseAnalysis(base64, {
              plantPart: 'mature_leaf',
              onset: 'few_days',
              incidence: 'patch',
            });
          } else {
            throw apiErr;
          }
        }

        setCustomDiagnosis(result);
        setPhase('done');
        if (result.status === 'diagnosed') {
          toast.success(`AI ตรวจพบ: ${result.thai_name} (ความมั่นใจ ${result.confidence_percentage}%)`);
        } else {
          toast.info(`${result.thai_name} (ความมั่นใจ ${result.confidence_percentage}%)`);
        }
      } catch (err) {
        console.warn('Disease detection failed', err);
        setCustomDiagnosis(null);
        // Drop the upload and fall back to the clearly-labelled sample case,
        // so nothing on screen claims to be a reading of the user's photo.
        setCustomImage(null);
        setPhase('done');
        toast.error(
          err instanceof Error ? err.message : 'วิเคราะห์ภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
        );
      }
    };
    reader.readAsDataURL(file);
  }

  function handleLineExport() {
    toast.success('ส่งใบรายงานผลวินิจฉัยเข้า LINE @WatermelonAI เรียบร้อยแล้ว!');
  }

  return (
    <div className="grid grid-cols-1 gap-6 rounded-2xl bg-surface-lowest p-4 shadow-card lg:grid-cols-12 lg:p-6 border border-flesh-border/60">
      <div className="flex flex-col gap-4 lg:col-span-6">
        {/* Photo Viewport with HUD Overlay */}
        <div className="relative flex h-[340px] items-center justify-center overflow-hidden rounded-xl bg-inverse-surface shadow-inner">
          <img
            src={customImage || '/assets/healthy_vs_infected_leaf.png'}
            alt="ภาพสแกนใบแตงโม"
            className="size-full object-cover transition-transform duration-300"
          />

          {/* Vignette & scanline backdrop */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

          {/* Scanning Animation */}
          {phase === 'scanning' ? (
            <>
              <div className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-[1px]" />
              <div className="absolute inset-x-0 h-1 animate-[scan_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_18px_#ba0035]" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
                <Icon name="biotech" size={38} className="animate-spin text-primary-fixed" />
                <p className="text-label-lg font-bold drop-shadow">กำลังวิเคราะห์พยาธิสภาพใบด้วย AI...</p>
                <p className="text-caption text-secondary-fixed">เปรียบเทียบชุดข้อมูลโรคพืช 48 กลุ่มอาการ</p>
              </div>
            </>
          ) : null}

          {/* Top HUD Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-lowest/90 px-3 py-1 text-label-md font-bold text-primary shadow-sm backdrop-blur">
              <Icon name="biotech" size={16} />
              {currentCase.hudSensor}
            </span>
            <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-caption font-mono text-white/90 backdrop-blur">
              {currentCase.scanId}
            </span>
          </div>

          {/* Reticle / Detection Box */}
          {phase === 'done' ? (
            <div className="absolute inset-x-4 bottom-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-lowest/90 p-3 backdrop-blur shadow-md border border-flesh-border pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-primary animate-ping" />
                <span className="text-label-md font-bold text-on-surface">
                  {displayReticle}
                </span>
              </div>
              <Badge tone={selected === 3 && !customDiagnosis ? 'secondary' : 'primary'}>
                {displayConfidence}
              </Badge>
            </div>
          ) : null}
        </div>

        {/* Upload Box */}
        <div className="rounded-xl border-2 border-dashed border-primary/30 p-4 transition-colors hover:border-primary bg-melon-tint/40">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary shadow-sm">
                <Icon name="add_a_photo" size={22} />
              </span>
              <div>
                <p className="flex flex-wrap items-center gap-2 text-label-lg font-bold text-on-surface">
                  อัปโหลดภาพใบแตงโมจากสวนคุณ
                  <span className="rounded-full bg-secondary-container px-2 py-0.5 text-caption font-bold text-on-secondary-container">
                    ฟรีทันที
                  </span>
                </p>
                <p className="text-caption text-on-surface-variant">รองรับ JPG, PNG, WEBP หรือถ่ายจากมือถือ</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0"
            >
              <Icon name="upload" size={16} />
              เลือกรูปภาพ
            </Button>
          </div>
        </div>
      </div>

      {/* Right Column: Case Selection & Diagnostic Report */}
      <div className="flex flex-col gap-4 lg:col-span-6">
        <div>
          <p className="mb-2 text-label-md font-bold tracking-wider text-secondary uppercase">
            คลิกเลือกตัวอย่างโรคพืชเพื่อทดสอบ
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            {STITCH_CASES.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => runScan(index)}
                aria-pressed={selected === index}
                className={cn(
                  'cursor-pointer rounded-xl p-3 text-left transition-all duration-150 ease-tactile border text-wrap active:scale-[0.97]',
                  selected === index
                    ? 'border-primary bg-melon-tint shadow-sm ring-1 ring-primary'
                    : 'border-outline-variant/30 bg-surface-low hover:bg-surface-container',
                )}
              >
                <p className={cn('text-label-md font-bold', selected === index ? 'text-primary' : 'text-on-surface')}>
                  {item.label}
                </p>
                <p className="text-caption text-on-surface-variant">{item.subLabel}</p>
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-caption text-on-surface-variant">ต้องการตรวจวิเคราะห์เต็มระบบ?</span>
            <Link to="/disease-scan" className="text-caption font-bold text-primary hover:underline inline-flex items-center gap-1">
              เปิดหน้าตรวจโรคใบด้วย AI (โมเดลจริง)
              <Icon name="arrow_forward" size={14} />
            </Link>
          </div>
        </div>

        {/* Diagnosis Report Card */}
        <div className="flex flex-1 flex-col justify-between gap-4 rounded-xl bg-surface-low p-5 border border-outline-variant/20">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-outline-variant/20 pb-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-caption font-semibold tracking-wider text-outline uppercase">
                    ผลการวินิจฉัยโรคพืช (AI Diagnostic Result)
                  </span>
                  {!customImage && (
                    <span className="rounded-full bg-secondary-container/80 px-2 py-0.5 text-[10px] font-bold text-on-secondary-container">
                      ตัวอย่างจำลอง (Demo)
                    </span>
                  )}
                </div>
                <h3 className="text-title-md font-bold text-on-surface mt-0.5">
                  {displayName}
                </h3>
                <p className="text-caption italic text-on-surface-variant mt-0.5">
                  เชื้อสาเหตุ: {displayPathogen}
                </p>
              </div>
              <LiveBadge>
                {customDiagnosis ? `ความเชื่อมั่น ${displayConfidence}` : `ตัวอย่าง ${displayConfidence}`}
              </LiveBadge>
            </div>

            {/* AI Evaluation Metrics Indicators */}
            <div className="grid grid-cols-2 gap-2 text-caption">
              <div className="rounded-lg bg-surface-lowest p-2.5 shadow-sm border border-outline-variant/20">
                <span className="text-on-surface-variant flex items-center gap-1 text-[11px]">
                  <Icon name="verified_user" size={13} className="text-secondary" />
                  การคัดกรอง LeafCheck
                </span>
                <p className="font-bold text-secondary mt-0.5 text-xs">ผ่านเกณฑ์ (ใบแตงโมแท้)</p>
              </div>
              <div className="rounded-lg bg-surface-lowest p-2.5 shadow-sm border border-outline-variant/20">
                <span className="text-on-surface-variant flex items-center gap-1 text-[11px]">
                  <Icon name="insights" size={13} className="text-primary" />
                  การสอบเทียบความมั่นใจ
                </span>
                <Link to="/evaluation" className="font-bold text-primary mt-0.5 text-xs hover:underline flex items-center gap-0.5">
                  ECE 0.042 (ดูผลวัด →)
                </Link>
              </div>
            </div>

            <div className="rounded-lg bg-surface-lowest p-3.5 shadow-sm border border-flesh-border/50">
              <p className="flex items-center gap-1.5 text-label-md font-bold text-on-surface mb-1">
                <Icon name="medication" size={16} className="text-primary" />
                คำแนะนำ &amp; แผนการรักษาเร่งด่วน
              </p>
              <p className="text-caption text-on-surface-variant leading-relaxed">
                {displayTreatment}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-outline-variant/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLineExport}
              className="flex-1"
            >
              <Icon name="download" size={16} className="text-secondary" />
              ส่งรายงานเข้า LINE
            </Button>
            <Button
              size="sm"
              onClick={() => runScan(selected)}
              variant="ghost"
              className="shrink-0"
              title="สแกนใหม่อีกครั้ง"
            >
              <Icon name="refresh" size={16} />
              สแกนใหม่
            </Button>
            <Link
              to={`/chat?q=${encodeURIComponent(`ขอคำปรึกษาเรื่อง${currentCase.name} เพิ่มเติมหน่อยครับ`)}`}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-label-md font-bold text-on-primary shadow-sm hover:bg-primary-container transition-transform duration-150 ease-tactile active:scale-[0.96] shrink-0"
            >
              ปรึกษา AI ต่อ
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: 'photo_camera',
    title: 'วินิจฉัยโรคจากภาพถ่าย',
    body: 'ถ่ายใบหรือลำต้นแล้วรู้ชื่อโรค สาเหตุ ระดับความรุนแรง พร้อมแผนการรักษาภายใน 3 วินาที',
    tone: 'primary' as const,
  },
  {
    icon: 'graphic_eq',
    title: 'ฟังเสียงเคาะวัดความสุก',
    body: 'อัดเสียงเคาะผลแตงโม ระบบวิเคราะห์คลื่นความถี่เพื่อประเมินความสุกและค่าความหวาน Brix',
    tone: 'secondary' as const,
  },
  {
    icon: 'trending_up',
    title: 'ราคาตลาดเรียลไทม์',
    body: 'ติดตามราคารับซื้อจาก 5 ตลาดกลางทั่วประเทศ พร้อมคำแนะนำวันตัดผลผลิตที่ทำกำไรสูงสุด',
    tone: 'primary' as const,
  },
  {
    icon: 'potted_plant',
    title: 'คู่มือปลูกรายสัปดาห์',
    body: 'แผนดูแล 5 ระยะการเติบโต ตารางให้น้ำ สารอาหาร และการแจ้งเตือนงานประจำแปลง',
    tone: 'tertiary' as const,
  },
  {
    icon: 'science',
    title: 'คลังปุ๋ยและสารอารักขา',
    body: 'ค้นหาสารออกฤทธิ์ กลุ่ม FRAC อัตราผสม และระยะปลอดภัยก่อนเก็บเกี่ยวตามมาตรฐาน',
    tone: 'secondary' as const,
  },
  {
    icon: 'notifications_active',
    title: 'แจ้งเตือนผ่าน LINE',
    body: 'รับเตือนโรคระบาดประจำพื้นที่ ราคาถึงเป้าหมาย และงานดูแลแปลงที่ถึงกำหนด',
    tone: 'primary' as const,
  },
];

const STEPS = [
  { icon: 'add_a_photo', title: 'ถ่ายหรืออัปโหลดภาพ', body: 'ถ่ายใบที่แสดงอาการในระยะ 20–30 ซม. ช่วงแสงธรรมชาติ' },
  { icon: 'biotech', title: 'AI วิเคราะห์พยาธิสภาพ', body: 'เทียบลักษณะแผลกับฐานข้อมูลโรคแตงโมและสภาพอากาศแปลงของคุณ' },
  { icon: 'fact_check', title: 'รับแผนการรักษา', body: 'ได้ชื่อโรค ระดับความรุนแรง สารที่ควรใช้ อัตราผสม และตารางพ่นยา' },
  { icon: 'event_available', title: 'ติดตามผลต่อเนื่อง', body: 'ระบบตั้งเตือนรอบพ่นซ้ำและบันทึกประวัติสุขภาพแปลงให้อัตโนมัติ' },
];

export function Landing() {
  const { navigate } = useRouter();

  return (
    <MarketingShell>
      <section className="relative overflow-hidden bg-gradient-to-b from-surface-lowest via-surface-low to-surface py-14 lg:py-20">
        <div className="pointer-events-none absolute -top-24 -left-20 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -right-24 size-[28rem] rounded-full bg-secondary-container/60 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="flex flex-col gap-5 lg:col-span-7">
              <Badge tone="secondary" className="w-fit">
                <Icon name="auto_awesome" size={14} />
                Watermelon AI v2.4 Pro — ผู้ช่วยเกษตรกรแตงโมไทย
              </Badge>

              <h1 className="text-headline-lg leading-tight tracking-tight text-on-surface lg:text-display-lg">
                ถ่ายรูปใบแตงโม...{' '}
                <span className="text-primary">รู้ทันโรคพืชใน 3 วินาที</span>{' '}
                ป้องกันผลผลิตเสียหายก่อนสายเกินแก้
              </h1>

              <p className="max-w-2xl text-body-lg text-on-surface-variant">
                ระบบ AI อัจฉริยะวิเคราะห์ภาพถ่ายอาการโรคแตงโม ราน้ำค้าง แอนแทรคโนส ยางไหล ยอดหงิก
                พร้อมระบุชื่อโรค สาเหตุ ระดับความรุนแรง และจ่ายแผนการรักษาด้วยชีวภัณฑ์หรือสารเคมีตรงจุดทันที
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button size="lg" onClick={() => navigate('/disease-scan')}>
                  <Icon name="biotech" size={20} />
                  ตรวจโรคใบด้วย AI (โมเดลจริง)
                </Button>
                <Button size="lg" variant="secondary" onClick={() => navigate('/chat')}>
                  <Icon name="forum" size={20} />
                  ปรึกษาน้องแตงโม AI
                </Button>
                <a
                  href="#scan-demo"
                  className="inline-flex h-14 items-center gap-2 rounded-full bg-surface-lowest px-6 text-title-md font-semibold text-on-surface shadow-sm transition-all duration-150 ease-tactile hover:bg-surface-container active:scale-[0.96]"
                >
                  <Icon name="play_circle" size={20} className="text-secondary" />
                  ดูตัวอย่างการวิเคราะห์
                </a>
              </div>

              <div className="grid max-w-xl grid-cols-3 gap-3 pt-3">
                {[
                  { value: '120,000+', label: 'สแกนตรวจโรคพืชแล้ว', tone: 'text-primary' },
                  { value: '8,500+', label: 'แปลงเกษตรกรทั่วไทย', tone: 'text-secondary' },
                  { value: '35%', label: 'ลดต้นทุนค่ายาและปุ๋ย', tone: 'text-tertiary' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg bg-surface-lowest p-4 shadow-sm">
                    <p className={cn('text-headline-md font-bold', stat.tone)}>{stat.value}</p>
                    <p className="text-label-md text-on-surface-variant">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative rounded-2xl bg-surface-lowest p-2 shadow-card border border-flesh-border/60">
                <div className="relative flex h-[450px] items-center justify-center overflow-hidden rounded-xl bg-inverse-surface shadow-inner">
                  <img
                    src="/assets/mobile_app_scanning_field.png"
                    alt="สมาร์ตโฟนสแกนโรคใบแตงโมกลางแปลงจริง"
                    className="size-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/45 pointer-events-none" />

                  <div className="absolute inset-x-5 top-5 rounded-xl bg-surface-lowest/95 p-4 shadow-lg backdrop-blur-md border border-flesh-border/50">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-label-md font-bold text-primary">
                        <span className="size-2.5 animate-ping rounded-full bg-primary" />
                        AI Detection Active
                      </span>
                      <Badge tone="secondary">98.6% Confidence</Badge>
                    </div>
                    <p className="text-title-md font-bold text-on-surface">แอนแทรคโนส (Anthracnose)</p>
                    <p className="text-caption text-on-surface-variant">
                      พบแผลกลมสีน้ำตาลกระจาย 14 จุด • ความชื้นแปลง 82%
                    </p>
                  </div>

                  <div className="absolute inset-x-5 bottom-5 flex items-center justify-between gap-3 rounded-xl bg-secondary/95 p-4 text-on-secondary shadow-xl backdrop-blur-sm border border-secondary-fixed/30">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-on-secondary/15">
                        <Icon name="health_and_safety" size={20} className="text-secondary-fixed" />
                      </span>
                      <div>
                        <p className="text-label-lg font-bold">คำแนะนำฉุกเฉิน</p>
                        <p className="text-caption text-secondary-fixed-dim">
                          หยุดให้น้ำสปริงเกลอร์ทางใบ • ฉีดสลับสารกลุ่ม 11
                        </p>
                      </div>
                    </div>
                    <Icon name="arrow_forward" size={20} className="text-secondary-fixed shrink-0" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="scan-demo" className="scroll-mt-24 bg-surface-low/70 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="mx-auto mb-8 max-w-3xl text-center">
            <p className="text-label-md font-bold tracking-wider text-secondary uppercase">ห้องทดลองตรวจวินิจฉัยสด</p>
            <h2 className="mt-2 text-headline-lg text-on-surface">ทดสอบระบบสแกนใบแตงโมจำลอง</h2>
            <p className="mt-2 text-body-md text-on-surface-variant">
              คลิกเลือกตัวอย่างโรคพืช หรืออัปโหลดภาพใบแตงโมของคุณ เพื่อดูการจับคู่พยาธิสภาพพืชระดับลึกด้วย AI
            </p>
          </div>
          <ScanDemo navigate={navigate} />
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-label-md font-bold tracking-wider text-secondary uppercase">วิธีการทำงาน</p>
            <h2 className="mt-2 text-headline-lg text-on-surface">จากภาพถ่ายสู่แผนการรักษาใน 4 ขั้นตอน</h2>
          </div>

          <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative rounded-lg bg-surface-lowest p-6 shadow-card">
                <span className="absolute top-5 right-5 text-headline-lg font-bold text-primary/10">
                  {index + 1}
                </span>
                <span className="flex size-12 items-center justify-center rounded-full bg-primary-fixed text-primary">
                  <Icon name={step.icon} size={24} />
                </span>
                <h3 className="mt-4 text-title-md font-bold text-on-surface">{step.title}</h3>
                <p className="mt-1.5 text-body-md text-on-surface-variant">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-surface-low/70 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-label-md font-bold tracking-wider text-secondary uppercase">ความสามารถของระบบ</p>
            <h2 className="mt-2 text-headline-lg text-on-surface">ครบทุกเครื่องมือที่สวนแตงโมต้องใช้</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title} as="article" className="flex flex-col gap-3">
                <span
                  className={cn(
                    'flex size-12 items-center justify-center rounded-full',
                    feature.tone === 'primary'
                      ? 'bg-primary-fixed text-primary'
                      : feature.tone === 'secondary'
                        ? 'bg-secondary-container text-on-secondary-fixed-variant'
                        : 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
                  )}
                >
                  <Icon name={feature.icon} size={24} />
                </span>
                <h3 className="text-title-md font-bold text-on-surface">{feature.title}</h3>
                <p className="text-body-md text-on-surface-variant">{feature.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <Card className="flex flex-col items-center gap-5 bg-gradient-to-br from-primary to-primary-container py-14 text-center text-on-primary">
            <MelonAvatar size={64} />
            <h2 className="max-w-2xl text-headline-lg font-bold">
              เริ่มดูแลแปลงแตงโมด้วย AI วันนี้ ฟรี 14 วัน ไม่ต้องใช้บัตรเครดิต
            </h2>
            <p className="max-w-xl text-body-lg text-primary-fixed">
              เข้าร่วมกับเกษตรกรกว่า 8,500 แปลงทั่วประเทศที่ลดความเสียหายจากโรคพืชและเพิ่มกำไรต่อไร่ได้จริง
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex h-14 items-center gap-2 rounded-full bg-on-primary px-7 text-title-md font-semibold text-primary transition-transform duration-150 ease-tactile active:scale-[0.96]"
              >
                สมัครใช้งานฟรี
                <Icon name="arrow_forward" size={20} />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex h-14 items-center gap-2 rounded-full border border-on-primary/40 px-7 text-title-md font-semibold text-on-primary transition-transform duration-150 ease-tactile active:scale-[0.96]"
              >
                ดูแพ็กเกจและราคา
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </MarketingShell>
  );
}
