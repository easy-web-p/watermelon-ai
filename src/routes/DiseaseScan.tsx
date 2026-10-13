import { useState, useRef, useEffect } from 'react';
import { AppShell, PageContainer, PageHeading } from '../components/layout/AppShell';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge, LiveBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { useToast } from '../components/ui/Toast';
import { useRouter } from '../lib/router';
import { DiseaseResultCard } from '../components/domain/DiseaseResultCard';
import { VisionEngineModal } from '../components/domain/VisionEngineModal';
import { VisionCompareCard } from '../components/domain/VisionCompareCard';
import {
  api,
  type DiseaseDetection,
  type DiseaseModelStatus,
  type VisionCompareResponse,
} from '../lib/api';
import { saveLocalDiseaseRecord } from '../lib/chatHistory';
import { compressImage, validateImage } from '../lib/media';
import { cn } from '../lib/cn';
import type { ResourceState } from '../types/resource';
import { FALLBACK_ENGINES, type VisionEngineInfo, type VisionEngineName } from '../lib/visionEngines';

const PLANT_PARTS = [
  { id: 'mature_leaf', label: 'ใบแก่ช่วงโคน/กลางเถา' },
  { id: 'young_leaf', label: 'ใบยอดอ่อน' },
  { id: 'whole_plant', label: 'ภาพรวมทั้งต้น' },
] as const;

const ONSET_PERIODS = [
  { id: 'today', label: 'เพิ่งพบวันนี้' },
  { id: 'few_days', label: '1–3 วันที่แล้ว' },
  { id: 'week_ago', label: 'มากกว่า 1 สัปดาห์' },
] as const;

const INCIDENCE_RATES = [
  { id: 'isolated', label: 'พบเฉพาะจุด (1–2 ต้น)' },
  { id: 'patch', label: 'เป็นหย่อม (5–20% ของแปลง)' },
  { id: 'widespread', label: 'ระบาดกว้าง (> 20% ของแปลง)' },
] as const;

export function DiseaseScan() {
  const [plotId, setPlotId] = useState<string>('standalone');
  const [plantPart, setPlantPart] = useState<string>('mature_leaf');
  const [onset, setOnset] = useState<string>('today');
  const [incidence, setIncidence] = useState<string>('isolated');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanState, setScanState] = useState<ResourceState<DiseaseDetection>>({ status: 'idle' });
  const [modelStatus, setModelStatus] = useState<DiseaseModelStatus | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<VisionEngineName>('legacy4');
  const [engineModalOpen, setEngineModalOpen] = useState(false);
  const [enginesList, setEnginesList] = useState<readonly VisionEngineInfo[]>(FALLBACK_ENGINES);
  const [enginesError, setEnginesError] = useState<string | null>(null);
  const [compareState, setCompareState] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    data?: VisionCompareResponse;
    engine?: VisionEngineName;
    message?: string;
  }>({ status: 'idle' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { navigate } = useRouter();

  useEffect(() => {
    let active = true;
    api
      .diseaseModelStatus()
      .then((res) => {
        if (active) {
          setModelStatus(res);
          setModelError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) setModelError(error instanceof Error ? error.message : 'เชื่อมต่อบริการวิเคราะห์ภาพไม่ได้');
      });

    api
      .visionEngines()
      .then((res) => {
        if (active) {
          setEnginesList([...res.engines]);
          setEnginesError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) setEnginesError(error instanceof Error ? error.message : 'โหลดรายการเครื่องยนต์ไม่ได้');
      });

    return () => {
      active = false;
    };
  }, []);

  async function loadSampleImage() {
    try {
      const response = await fetch('/assets/healthy_vs_infected_leaf.png');
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setScanState({ status: 'idle' });
        toast.info('โหลดภาพตัวอย่างเรียบร้อย กดปุ่ม "ส่งตรวจโรคด้วย Vision Engine" เพื่อเริ่มการวิเคราะห์ได้เลยครับ');
      };
      reader.readAsDataURL(blob);
    } catch {
      toast.error('ไม่สามารถโหลดภาพตัวอย่างได้');
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateImage(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      const compressedDataUrl = await compressImage(file);
      setImagePreview(compressedDataUrl);
      setScanState({ status: 'idle' });
    } catch {
      toast.error('ไม่สามารถประมวลผลไฟล์ภาพได้ กรุณาลองใหม่อีกครั้ง');
    }
  }

  async function runCompare(engine: VisionEngineName) {
    if (!enginesList.some((item) => item.name === engine)) {
      toast.error(enginesError ?? 'เครื่องยนต์นี้ยังไม่พร้อมใช้งาน');
      return;
    }
    if (!imagePreview) {
      toast.error('กรุณาถ่ายภาพหรือเลือกรูปใบแตงโมก่อน');
      return;
    }

    setCompareState({ status: 'loading', engine });
    const notes = JSON.stringify({
      plotId: plotId === 'standalone' ? null : plotId,
      plantPart,
      onset,
      incidence,
    });

    try {
      const res = await api.visionCompare({
        imageBase64: imagePreview,
        engine,
        mode: 'balanced',
        notes,
      });
      setCompareState({ status: 'success', data: res, engine });
      const engineTitle = enginesList.find((item) => item.name === engine)?.title_th ?? engine;
      toast.success(
        `วิเคราะห์เปรียบเทียบด้วย ${engineTitle} สำเร็จ`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เปรียบเทียบไม่สำเร็จ';
      setCompareState({ status: 'error', engine, message: msg });
      toast.error(msg);
    }
  }

  async function startAnalysis() {
    if (!imagePreview) {
      toast.error('กรุณาถ่ายภาพหรือเลือกรูปใบแตงโมก่อน');
      return;
    }

    if (selectedEngine !== 'legacy4') {
      void runCompare(selectedEngine);
      return;
    }

    await runPrimaryAnalysis();
  }

  async function runPrimaryAnalysis() {
    if (!imagePreview) {
      toast.error('กรุณาถ่ายภาพหรือเลือกรูปใบแตงโมก่อน');
      return;
    }

    setScanState({ status: 'loading' });

    try {
      const notes = JSON.stringify({
        plotId: plotId === 'standalone' ? null : plotId,
        plantPart,
        onset,
        incidence,
      });

      const result = await api.detectDisease({
        imageBase64: imagePreview,
        notes,
        mode: 'balanced',
        engine: 'legacy4',
      });
      toast.success('วิเคราะห์ภาพด้วย Vision Engine สำเร็จ');

      // Persist to local disease history so records survive page reload
      saveLocalDiseaseRecord({
        id: result.recordId || `dis-${Date.now()}`,
        detectedAt: result.detectedAt || new Date().toISOString(),
        farmId: plotId === 'standalone' ? 'farm-01' : plotId,
        notes,
        status: result.status,
        disease_id: result.disease_id,
        thai_name: result.thai_name,
        confidence_percentage: result.confidence_percentage,
        severity: result.severity,
        severity_level: result.severity_level,
        urgent_action: result.urgent_action,
        phi_days: result.phi_days,
        model_version: result.model_version,
        from_verified_model: true,
      });

      setScanState({ status: 'success', data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการวิเคราะห์ภาพ';
      setScanState({
        status: 'error',
        code: 'SCAN_FAILED',
        message,
        retryable: true,
      });
      toast.error(message);
    }
  }

  function resetForm() {
    setImagePreview(null);
    setScanState({ status: 'idle' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <AppShell>
      <PageContainer>
        <PageHeading
          eyebrow={
            <>
              <Badge tone="primary">DIAGNOSTIC WORKFLOW</Badge>
              {modelStatus?.online ? (
                <LiveBadge>Vision Engine v3 ({modelStatus.vision?.architecture || 'EfficientNet-B0'}) ออนไลน์</LiveBadge>
              ) : (
                <Badge tone="neutral">Vision Engine ยังไม่พร้อม</Badge>
              )}
            </>
          }
          title="ตรวจโรคใบแตงโมโดยตรง"
          description="บันทึกภาพถ่ายและบริบทภาคสนามเพื่อประเมินความเสี่ยงโรคอย่างเป็นระบบ แยกประวัติรายแปลงชัดเจน"
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate('/diseases')}>
              <Icon name="menu_book" size={18} />
              ดูคลังความรู้โรค
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Input Form & Upload */}
          <div className="flex flex-col gap-5 lg:col-span-6">
            <Card className="flex flex-col gap-4">
              <CardHeader
                icon="photo_camera"
                title="1. ภาพถ่ายใบแตงโม"
                subtitle="ถ่ายใบที่มีอาการชัดเจน แสงสว่างพอดี ให้เห็นเนื้อใบเต็มกรอบ"
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />

              {imagePreview ? (
                <div className="relative overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-low">
                  <img
                    src={imagePreview}
                    alt="ภาพใบแตงโมสำหรับตรวจ"
                    className="max-h-80 w-full object-contain"
                  />
                  <div className="absolute right-3 top-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Icon name="refresh" size={16} />
                      ถ่ายใหม่
                    </Button>
                    <Button size="sm" variant="ghost" onClick={resetForm}>
                      <Icon name="delete" size={16} />
                      ลบภาพ
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-melon-tint/40 p-8 text-center transition-all hover:border-primary active:scale-[0.99] cursor-pointer"
                  >
                    <span className="flex size-14 items-center justify-center rounded-full bg-primary-fixed text-primary shadow-sm">
                      <Icon name="add_a_photo" size={28} />
                    </span>
                    <div>
                      <p className="text-label-lg font-bold text-on-surface">
                        แตะเพื่อถ่ายภาพหรือเลือกไฟล์
                      </p>
                      <p className="text-caption text-on-surface-variant">
                        รองรับ JPG, PNG, WEBP (บีบอัดอัตโนมัติก่อนส่ง)
                      </p>
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-low p-2.5 border border-outline-variant/30">
                    <span className="text-caption text-on-surface-variant">ไม่มีภาพใบแตงโมอยู่ในเครื่อง?</span>
                    <button
                      type="button"
                      onClick={loadSampleImage}
                      className="inline-flex cursor-pointer items-center gap-1.5 text-label-md font-semibold text-primary hover:underline"
                    >
                      <Icon name="visibility" size={16} />
                      ใช้ภาพตัวอย่างทดสอบโมเดล AI
                    </button>
                  </div>
                </div>
              )}
            </Card>

            {/* Vision Engine Selector Card */}
            <Card className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon name="biotech" size={20} className="text-primary" />
                  <div>
                    <h3 className="text-label-lg font-bold text-on-surface">เครื่องยนต์วิเคราะห์ภาพ AI</h3>
                    <p className="text-caption text-on-surface-variant">เลือกโมเดลที่ต้องการใช้วิเคราะห์</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEngineModalOpen(true)}
                  className="text-caption font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Icon name="help" size={16} />
                  จุดเด่น & ข้อจำกัด
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEngine('legacy4')}
                  disabled={!enginesList.some((engine) => engine.name === 'legacy4')}
                  className={cn(
                    'flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer',
                    selectedEngine === 'legacy4'
                      ? 'border-primary bg-melon-tint text-primary shadow-xs ring-1 ring-primary'
                      : 'border-outline-variant/30 bg-surface-low text-on-surface-variant hover:bg-surface-container',
                  )}
                >
                  <span className="text-label-md font-bold">Legacy 4</span>
                  <span className="text-[11px] leading-tight">โมเดลมาตรฐาน (4 คลาส)</span>
                  <span className="mt-1 text-[10px] text-secondary font-semibold">
                    {enginesList.find((engine) => engine.name === 'legacy4')?.calibrated ? '✓ ปรับเทียบแล้ว' : 'ยังไม่ปรับเทียบ'} (ฟรี)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedEngine('wide9')}
                  disabled={!enginesList.some((engine) => engine.name === 'wide9')}
                  className={cn(
                    'flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer',
                    selectedEngine === 'wide9'
                      ? 'border-primary bg-melon-tint text-primary shadow-xs ring-1 ring-primary'
                      : 'border-outline-variant/30 bg-surface-low text-on-surface-variant hover:bg-surface-container',
                  )}
                >
                  <span className="text-label-md font-bold">Wide-9</span>
                  <span className="text-[11px] leading-tight">9 คลาส (ตรวจราแป้ง)</span>
                  <span className="mt-1 text-[10px] text-outline font-semibold">⚡ กว้างขวาง (ฟรี)</span>
                </button>
              </div>

              {(enginesError || modelError) && <p role="alert" className="text-caption text-error">บริการ AI ยังไม่พร้อม: {enginesError ?? modelError}</p>}

              <div className="rounded-lg bg-surface-container-low px-3 py-2 text-caption text-on-surface-variant flex items-center justify-between">
                <span>
                  {selectedEngine === 'legacy4' && '• แนะนำสำหรับการวินิจฉัยหลัก ออกใบสั่งยา และคำนวณระยะปลอดภัย PHI'}
                  {selectedEngine === 'wide9' && '• เหมาะสำหรับตรวจราแป้ง (Powdery Mildew) และโรคใบจุดเพิ่มเติม'}
                  {selectedEngine !== 'legacy4' && selectedEngine !== 'wide9' &&
                    `• ${enginesList.find((engine) => engine.name === selectedEngine)?.description_th ?? 'ใช้เพื่อเปรียบเทียบข้อสังเกตจากภาพเดียวกัน'}`}
                </span>
                {selectedEngine !== 'legacy4' && (
                  <Badge tone="neutral" className="text-[10px] py-0 shrink-0 ml-2">คะแนนดิบ</Badge>
                )}
              </div>
            </Card>

            <Card className="flex flex-col gap-4">
              <CardHeader
                icon="yard"
                title="2. บริบทแปลงและอาการในพื้นที่"
                subtitle="ข้อมูลนี้ช่วยให้การวินิจฉัยและการติดตามอาการแม่นยำยิ่งขึ้น"
              />

              <div>
                <label className="text-label-md font-semibold text-on-surface">
                  แปลงปลูกที่พบอาการ
                </label>
                <select
                  value={plotId}
                  onChange={(e) => setPlotId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-outline-variant/30 bg-surface-lowest p-2.5 text-body-md text-on-surface outline-none focus:border-primary"
                >
                  <option value="standalone">ตรวจทั่วไป (ไม่ได้ผูกกับแปลง)</option>
                  <option value="plot-1">แปลงที่ 1: ตอร์ปิโด (ทุ่งโพธิ์ 5 ไร่)</option>
                  <option value="plot-2">แปลงที่ 2: ซอนญ่า (ดอนเจดีย์ 3 ไร่)</option>
                </select>
              </div>

              <div>
                <label className="text-label-md font-semibold text-on-surface">ส่วนพืชที่ถ่าย</label>
                <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {PLANT_PARTS.map((part) => (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => setPlantPart(part.id)}
                      className={cn(
                        'rounded-lg border p-2.5 text-left text-caption font-semibold transition-all',
                        plantPart === part.id
                          ? 'border-primary bg-melon-tint text-primary'
                          : 'border-outline-variant/30 bg-surface-low text-on-surface-variant hover:bg-surface-container',
                      )}
                    >
                      {part.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-label-md font-semibold text-on-surface">
                    เริ่มพบอาการเมื่อ
                  </label>
                  <div className="mt-1.5 flex flex-col gap-1.5">
                    {ONSET_PERIODS.map((period) => (
                      <button
                        key={period.id}
                        type="button"
                        onClick={() => setOnset(period.id)}
                        className={cn(
                          'rounded-lg border p-2 text-left text-caption font-semibold transition-all',
                          onset === period.id
                            ? 'border-primary bg-melon-tint text-primary'
                            : 'border-outline-variant/30 bg-surface-low text-on-surface-variant hover:bg-surface-container',
                        )}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-label-md font-semibold text-on-surface">
                    สัดส่วนอาการในแปลง
                  </label>
                  <div className="mt-1.5 flex flex-col gap-1.5">
                    {INCIDENCE_RATES.map((rate) => (
                      <button
                        key={rate.id}
                        type="button"
                        onClick={() => setIncidence(rate.id)}
                        className={cn(
                          'rounded-lg border p-2 text-left text-caption font-semibold transition-all',
                          incidence === rate.id
                            ? 'border-primary bg-melon-tint text-primary'
                            : 'border-outline-variant/30 bg-surface-low text-on-surface-variant hover:bg-surface-container',
                        )}
                      >
                        {rate.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                onClick={startAnalysis}
                disabled={!imagePreview || scanState.status === 'loading'}
                className="mt-2 w-full justify-center"
              >
                {scanState.status === 'loading' ? (
                  <>
                    <Icon name="progress_activity" size={20} className="animate-spin" />
                    กำลังประมวลผล 24 มุมมอง...
                  </>
                ) : (
                  <>
                    <Icon name="biotech" size={20} />
                    ส่งตรวจโรคด้วย Vision Engine
                  </>
                )}
              </Button>
            </Card>
          </div>

          {/* Right Column: Diagnostic Result Output */}
          <div className="flex flex-col gap-5 lg:col-span-6">
            <Card className="flex flex-col gap-4">
              <CardHeader
                icon="clinical_notes"
                title="ผลการตรวจวิเคราะห์"
                subtitle="ประเมินโดย Vision Engine v3 พร้อมข้อจำกัดและคำแนะนำปฏิบัติ"
              />

              {scanState.status === 'loading' && (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <span className="flex size-14 items-center justify-center rounded-full bg-primary-fixed text-primary animate-pulse">
                    <Icon name="biotech" size={32} />
                  </span>
                  <div>
                    <p className="text-title-md font-bold text-on-surface">
                      กำลังตรวจความคมชัด แสง และวิเคราะห์เนื้อใบ
                    </p>
                    <p className="text-body-md text-on-surface-variant">
                      ระบบกำลังสแกนแบบ Multi-Region (6 มุมมอง × 4 TTA) เพื่อจับรอยโรคขนาดเล็ก
                    </p>
                  </div>
                </div>
              )}

              {scanState.status === 'idle' && compareState.status === 'idle' && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-on-surface-variant">
                  <Icon name="document_scanner" size={44} className="text-outline/60" />
                  <p className="text-title-sm font-semibold">ยังไม่มีผลตรวจ</p>
                  <p className="max-w-sm text-caption">
                    กรุณาถ่ายภาพหรืออัปโหลดรูปใบแตงโมด้านซ้าย แล้วกดปุ่ม &quot;ส่งตรวจโรคด้วย Vision Engine&quot;
                  </p>
                </div>
              )}

              {scanState.status === 'idle' && compareState.status === 'loading' && (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <span className="flex size-14 items-center justify-center rounded-full bg-secondary-fixed text-secondary animate-pulse">
                    <Icon name="search" size={32} />
                  </span>
                  <div>
                    <p className="text-title-md font-bold text-on-surface">
                      กำลังอ่านภาพด้วยโมเดลทางเลือก ({enginesList.find((engine) => engine.name === compareState.engine)?.title_th ?? compareState.engine})
                    </p>
                    <p className="text-body-md text-on-surface-variant">
                      ระบบกำลังประมวลผลข้อสังเกตเพิ่มเติม...
                    </p>
                  </div>
                </div>
              )}

              {scanState.status === 'idle' && compareState.status === 'success' && compareState.data && (
                <div className="flex flex-col gap-4">
                  <VisionCompareCard
                    compareResult={compareState.data}
                    onClose={() => setCompareState({ status: 'idle' })}
                  />

                  <div className="rounded-xl border border-primary/20 bg-melon-tint/30 p-4 text-center">
                    <p className="text-body-sm text-on-surface font-semibold mb-2">
                      ต้องการผลประเมินจากโมเดลหลักพร้อมแนวทางจัดการและระยะปลอดภัยก่อนเก็บเกี่ยว (PHI)?
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedEngine('legacy4');
                        void runPrimaryAnalysis();
                      }}
                    >
                      <Icon name="biotech" size={16} />
                      วิเคราะห์ด้วย Legacy 4 (โมเดลมาตรฐานแตงโม)
                    </Button>
                  </div>
                </div>
              )}

              {scanState.status === 'error' && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-error-container/20 p-8 text-center text-error">
                  <Icon name="error" size={40} />
                  <p className="text-title-md font-bold">{scanState.message}</p>
                  <Button size="sm" variant="secondary" onClick={startAnalysis}>
                    <Icon name="refresh" size={16} />
                    ลองส่งตรวจใหม่อีกครั้ง
                  </Button>
                </div>
              )}

              {scanState.status === 'success' && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-lg bg-surface-container-low p-3 text-caption text-on-surface-variant">
                    <p className="font-semibold text-primary">
                      ℹ️ หมายเหตุข้อเท็จจริงทางเกษตร:
                    </p>
                    <p>
                      ผลตรวจนี้เป็นเฉพาะจุดของภาพใบที่ถ่าย ไม่ถือว่าเป็นการติดโรคทั้งแปลง ควรเดินสำรวจแปลงรอบบริเวณเพิ่มเติมก่อนตัดสินใจพ่นสาร
                    </p>
                  </div>

                  <DiseaseResultCard
                    result={scanState.data}
                    imageUrl={imagePreview ?? undefined}
                  />

                  {/* Multi-Model Comparison Panel */}
                  <div className="flex flex-col gap-3 rounded-xl border border-secondary/30 bg-surface-low p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-label-md font-bold text-on-surface flex items-center gap-1.5">
                        <Icon name="compare" size={18} className="text-secondary" />
                        เปรียบเทียบข้อสังเกตจากโมเดลอื่น:
                      </p>
                      <Badge tone="neutral" className="text-[10px]">ข้อสังเกตเสริม</Badge>
                    </div>
                    <p className="text-caption text-on-surface-variant">
                      เลือกเครื่องยนต์ที่เซอร์วิสเปิดใช้อยู่เพื่อดูข้อสังเกตเพิ่มเติมจากภาพเดียวกัน
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {enginesList.filter((engine) => engine.name !== 'legacy4').map((engine) => (
                        <Button
                          key={engine.name}
                          size="sm"
                          variant={compareState.engine === engine.name && compareState.status === 'success' ? 'secondary' : 'ghost'}
                          disabled={compareState.status === 'loading'}
                          onClick={() => void runCompare(engine.name as VisionEngineName)}
                        >
                          <Icon name="search" size={16} />
                          {compareState.status === 'loading' && compareState.engine === engine.name
                            ? `กำลังประมวลผล ${engine.title_th}...`
                            : `สแกนเทียบด้วย ${engine.title_th}${engine.costs_money ? ' (มีค่าใช้จ่าย)' : ''}`}
                        </Button>
                      ))}
                    </div>

                    {compareState.status === 'loading' && (
                      <div className="flex items-center gap-2 rounded-lg bg-surface-lowest p-3 text-caption text-on-surface-variant">
                        <Icon name="progress_activity" size={16} className="animate-spin text-secondary" />
                        <span>กำลังประมวลผลภาพด้วยโมเดลทางเลือก...</span>
                      </div>
                    )}

                    {compareState.status === 'success' && compareState.data ? (
                      <VisionCompareCard
                        compareResult={compareState.data}
                        onClose={() => setCompareState({ status: 'idle' })}
                      />
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-outline-variant/20 pt-4">
                    <Button
                      variant="tonal"
                      size="sm"
                      className="flex-1 justify-center"
                      onClick={() =>
                        navigate(
                          `/chat?q=${encodeURIComponent(
                            `ผลตรวจโรคใบแตงโม: ${scanState.data.thai_name} (${scanState.data.status}) ช่วยแนะนำแนวทางรักษาเพิ่มเติมหน่อยครับ`,
                          )}`,
                        )
                      }
                    >
                      <Icon name="chat" size={16} />
                      ส่งเข้าแชทถามผู้เชี่ยวชาญ AI
                    </Button>
                    <Button variant="ghost" size="sm" onClick={resetForm}>
                      <Icon name="add" size={16} />
                      ตรวจใบอื่นเพิ่ม
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </PageContainer>

      <VisionEngineModal
        isOpen={engineModalOpen}
        onClose={() => setEngineModalOpen(false)}
        engines={enginesList}
        selectedEngine={selectedEngine}
        onSelectEngine={(eng) => {
          setSelectedEngine(eng);
          setEngineModalOpen(false);
        }}
      />
    </AppShell>
  );
}
