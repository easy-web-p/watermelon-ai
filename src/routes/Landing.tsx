import { useCallback, useEffect, useRef, useState } from 'react';
import { MarketingShell } from '../components/layout/MarketingShell';
import { Card } from '../components/ui/Card';
import { Badge, LiveBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { MelonAvatar } from '../components/brand/Logo';
import { useToast } from '../components/ui/Toast';
import { Link, useRouter } from '../lib/router';
import { cn } from '../lib/cn';
import {
  api,
  type DiseaseDetection,
  type VisionCompareResponse,
  STATUS_PRESENTATION,
} from '../lib/api';
import { VisionCompareCard } from '../components/domain/VisionCompareCard';
import { VisionEngineModal } from '../components/domain/VisionEngineModal';
import type { VisionEngineInfo, VisionEngineName } from '../lib/visionEngines';
import { useAuth } from '../store/auth';
import { saveLocalDiseaseRecord } from '../lib/chatHistory';
import { compressImage, validateImage } from '../lib/media';

const ENGINE_SHORT_LABELS: Record<string, string> = {
  legacy4: 'Legacy-4 (ตัวหลัก 4 คลาส)',
  wide9: 'Wide-9 (9 คลาส)',
  wide11: 'Wide-11 (11 คลาส)',
  baseline9: 'Baseline-9 (9 คลาส)',
  claude: 'Claude Vision',
};

/** The live-scan box: take photo with camera or upload image, and inspect real AI verdict. */
function ScanDemo({ navigate }: { navigate: (to: string) => void }) {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customDiagnosis, setCustomDiagnosis] = useState<DiseaseDetection | null>(null);
  const [demoEngine, setDemoEngine] = useState<VisionEngineName>('legacy4');
  const [engineList, setEngineList] = useState<readonly VisionEngineInfo[]>([]);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [engineModalOpen, setEngineModalOpen] = useState(false);
  const [compareData, setCompareData] = useState<VisionCompareResponse | null>(null);

  // Live camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    api
      .visionEngines()
      .then((response) => {
        if (active) {
          setEngineList(response.engines);
          setEngineError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) setEngineError(error instanceof Error ? error.message : 'โหลดเครื่องยนต์ไม่ได้');
      });
    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(
    async (facing: 'environment' | 'user' = cameraFacing) => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('อุปกรณ์หรือเบราว์เซอร์ไม่รองรับการเปิดกล้อง กรุณาใช้ปุ่มเลือกรูปภาพ');
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = stream;
        setIsCameraActive(true);
        setCustomImage(null);
        setCustomDiagnosis(null);
        setCompareData(null);
        setPhase('idle');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'ไม่สามารถเปิดกล้องได้';
        toast.error('ไม่สามารถเปิดกล้องได้: ' + msg);
        setIsCameraActive(false);
      }
    },
    [cameraFacing, toast],
  );

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraActive]);

  const toggleCameraFacing = useCallback(() => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      void startCamera(nextFacing);
    }
  }, [cameraFacing, isCameraActive, startCamera]);

  const analyzeImage = useCallback(
    async (base64: string, engineOverride?: VisionEngineName) => {
      const activeEngine = engineOverride || demoEngine;
      setCustomImage(base64);
      setCustomDiagnosis(null);
      setCompareData(null);
      setPhase('scanning');

      try {
        if (activeEngine !== 'legacy4') {
          const compRes = await api.visionCompare({
            imageBase64: base64,
            engine: activeEngine,
            notes: 'Landing Live Scan',
          });
          setCompareData(compRes);
          setPhase('done');
          toast.success('ได้รับข้อสังเกตเพิ่มเติมจากโมเดลที่เลือก');
          return;
        }

        const result: DiseaseDetection = await api.detectDisease({
          imageBase64: base64,
          notes: 'Landing Live Scan',
          engine: 'legacy4',
        });

        setCustomDiagnosis(result);
        setPhase('done');
        if (result.status === 'diagnosed') {
          toast.success(`AI ตรวจพบ: ${result.thai_name} (ความมั่นใจ ${result.confidence_percentage}%)`);
        } else {
          toast.info(result.thai_name);
        }
      } catch (err) {
        console.warn('Disease detection failed', err);
        setCustomDiagnosis(null);
        setCompareData(null);
        setPhase('done');
        toast.error(err instanceof Error ? err.message : 'วิเคราะห์ภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      }
    },
    [demoEngine, toast],
  );

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      stopCamera();
      void analyzeImage(dataUrl);
    } catch {
      toast.error('ถ่ายภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  }, [stopCamera, analyzeImage, toast]);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const validationError = validateImage(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      try {
        stopCamera();
        const compressed = await compressImage(file);
        void analyzeImage(compressed);
      } catch {
        toast.error('ไม่สามารถประมวลผลไฟล์ภาพได้ กรุณาลองใหม่อีกครั้ง');
      }
    },
    [stopCamera, analyzeImage, toast],
  );

  const handleClearImage = useCallback(() => {
    stopCamera();
    setCustomImage(null);
    setCustomDiagnosis(null);
    setCompareData(null);
    setPhase('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [stopCamera]);

  const handleRescan = useCallback(() => {
    if (customImage) {
      toast.info('กำลังวิเคราะห์ภาพใบแตงโมใหม่อีกครั้ง...');
      void analyzeImage(customImage);
    } else {
      toast.info('กรุณาเปิดกล้องหรือเลือกภาพใบแตงโมก่อน');
      void startCamera();
    }
  }, [customImage, analyzeImage, startCamera, toast]);

  const handleLineExport = useCallback(() => {
    if (!customDiagnosis && !compareData) {
      toast.info('กรุณาถ่ายภาพหรือสแกนใบแตงโมก่อนส่งรายงาน');
      return;
    }
    const name = customDiagnosis ? customDiagnosis.thai_name : `ผลวิเคราะห์จาก ${demoEngine}`;
    toast.success(`ส่งสรุปผลการตรวจ "${name}" เข้า LINE @WatermelonAI เรียบร้อยแล้ว`);
  }, [customDiagnosis, compareData, demoEngine, toast]);

  const handleConsultAI = useCallback(() => {
    const user = useAuth.getState().user;

    let question = '';
    if (customDiagnosis) {
      question = `ขอคำปรึกษาเรื่อง${customDiagnosis.thai_name} (ตรวจพบความมั่นใจ ${customDiagnosis.confidence_percentage}%) เพิ่มเติมครับ มีวิธีรักษาหรือการจัดการแปลงอย่างไรบ้าง`;
    } else if (compareData) {
      question = `ขอคำปรึกษาเรื่องผลวิเคราะห์ภาพถ่ายใบแตงโมจากโมเดล ${demoEngine} เพิ่มเติมครับ`;
    } else {
      question = 'ขอคำปรึกษาเรื่องโรคและการดูแลรักษาใบแตงโมครับ';
    }

    const chatUrl = `/chat?mode=disease-diagnosis&q=${encodeURIComponent(question)}`;

    if (!user) {
      toast.info('กรุณาเข้าสู่ระบบก่อนเพื่อส่งผลตรวจและปรึกษา AI ต่อในห้องแชทของคุณ');
      navigate(`/signin?redirect=${encodeURIComponent(chatUrl)}`);
      return;
    }

    if (customDiagnosis) {
      saveLocalDiseaseRecord({
        id: customDiagnosis.recordId || `dis-${Date.now()}`,
        detectedAt: customDiagnosis.detectedAt || new Date().toISOString(),
        farmId: 'farm-01',
        notes: '',
        status: customDiagnosis.status,
        disease_id: customDiagnosis.disease_id,
        thai_name: customDiagnosis.thai_name,
        confidence_percentage: customDiagnosis.confidence_percentage,
        severity: customDiagnosis.severity,
        severity_level: customDiagnosis.severity_level,
        urgent_action: customDiagnosis.urgent_action,
        phi_days: customDiagnosis.phi_days,
        model_version: customDiagnosis.model_version,
        from_verified_model: true,
      });
    }

    toast.success('กำลังเปิดห้องแชทเพื่อปรึกษา AI...');
    navigate(chatUrl);
  }, [customDiagnosis, compareData, demoEngine, customImage, navigate, toast]);

  return (
    <div className="grid grid-cols-1 gap-6 rounded-2xl bg-surface-lowest p-4 shadow-card lg:grid-cols-12 lg:p-6 border border-flesh-border/60">
      {/* Left Column: Camera Viewport or Photo Preview */}
      <div className="flex flex-col gap-4 lg:col-span-6">
        <div className="relative flex min-h-[420px] flex-1 items-center justify-center overflow-hidden rounded-xl bg-inverse-surface shadow-inner">
          {isCameraActive ? (
            <div className="relative size-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="size-full object-cover"
              />
              {/* Reticle Guide Frame */}
              <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-dashed border-white/60 flex items-center justify-center">
                <span className="rounded-full bg-black/50 px-3 py-1 text-caption text-white/90 backdrop-blur">
                  เล็งภาพใบแตงโมให้อยู่ในกรอบ
                </span>
              </div>

              {/* Top Camera Controls */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-caption font-semibold text-emerald-400 backdrop-blur">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  กล้องกำลังทำงาน
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    title="สลับกล้องหน้า/หลัง"
                    className="flex size-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                  >
                    <Icon name="flip_camera_ios" size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    title="ปิดกล้อง"
                    className="flex size-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                  >
                    <Icon name="close" size={18} />
                  </button>
                </div>
              </div>

              {/* Shutter Button */}
              <div className="absolute bottom-4 inset-x-0 flex items-center justify-center">
                <button
                  type="button"
                  onClick={takePhoto}
                  className="flex size-16 items-center justify-center rounded-full bg-primary text-white shadow-xl ring-4 ring-white/80 transition-transform active:scale-95 cursor-pointer hover:bg-primary-container"
                  title="แตะเพื่อถ่ายภาพ"
                >
                  <Icon name="photo_camera" size={28} />
                </button>
              </div>
            </div>
          ) : customImage ? (
            <div className="relative size-full">
              <img
                src={customImage}
                alt="ภาพสแกนใบแตงโม"
                className="size-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

              {/* Scanning Overlay Animation */}
              {phase === 'scanning' ? (
                <>
                  <div className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-[1px]" />
                  <div className="absolute inset-x-0 h-1 animate-[scan_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_18px_#ba0035]" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
                    <Icon name="biotech" size={38} className="animate-spin text-primary-fixed" />
                    <p className="text-label-lg font-bold drop-shadow">กำลังวิเคราะห์พยาธิสภาพใบด้วย AI...</p>
                    <p className="text-caption text-secondary-fixed">
                      ประมวลผลผ่านโมเดล {demoEngine === 'legacy4' ? 'Legacy-4' : 'Wide-9'}
                    </p>
                  </div>
                </>
              ) : null}

              {/* Top HUD Badges */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-lowest/90 px-3 py-1 text-label-md font-bold text-primary shadow-sm backdrop-blur">
                  <Icon name="biotech" size={16} />
                  ภาพถ่ายใบพืช
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-caption text-white hover:bg-black/80 backdrop-blur cursor-pointer"
                  >
                    <Icon name="photo_camera" size={14} />
                    ถ่ายใหม่
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-caption text-white hover:bg-black/80 backdrop-blur cursor-pointer"
                  >
                    <Icon name="upload" size={14} />
                    เลือกรูปอื่น
                  </button>
                  <button
                    type="button"
                    onClick={handleClearImage}
                    title="ลบรูปภาพนี้"
                    className="inline-flex items-center justify-center size-6 rounded-full bg-black/60 text-white hover:bg-error hover:text-white backdrop-blur cursor-pointer"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              </div>

              {/* Reticle / Verdict Overlay */}
              {phase === 'done' ? (
                <div className="absolute inset-x-4 bottom-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-lowest/95 p-3 backdrop-blur shadow-md border border-flesh-border">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-primary animate-ping" />
                    <span className="text-label-md font-bold text-on-surface">
                      {customDiagnosis ? customDiagnosis.thai_name : compareData ? 'วิเคราะห์ด้วยโมเดลเสริม' : 'วิเคราะห์สำเร็จ'}
                    </span>
                  </div>
                  {customDiagnosis ? (
                    <Badge tone={customDiagnosis.status === 'healthy' ? 'secondary' : 'primary'}>
                      ความมั่นใจ {customDiagnosis.confidence_percentage}%
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            /* Idle Viewport: Prompt to start camera or select file */
            <div className="relative flex size-full flex-col items-center justify-center gap-4 p-6 text-center text-white bg-gradient-to-b from-stone-900 via-stone-900 to-black">
              <div className="pointer-events-none absolute inset-6 rounded-2xl border border-white/10" />
              <div className="relative flex size-20 items-center justify-center rounded-full bg-primary/20 text-primary-fixed border border-primary/30 shadow-lg">
                <Icon name="photo_camera" size={40} />
              </div>
              <div className="max-w-xs">
                <h3 className="text-title-md font-bold text-white">พร้อมตรวจโรคใบแตงโม</h3>
                <p className="mt-1 text-caption text-stone-300">
                  เปิดกล้องเพื่อถ่ายภาพใบแตงโมสดจากแปลง หรือเลือกไฟล์ภาพที่มีอยู่ในเครื่อง
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 z-10">
                <Button
                  size="md"
                  onClick={() => void startCamera()}
                  className="cursor-pointer"
                >
                  <Icon name="photo_camera" size={18} />
                  เปิดกล้องถ่ายภาพ
                </Button>
                <Button
                  size="md"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 cursor-pointer"
                >
                  <Icon name="upload" size={18} />
                  เลือกรูปภาพ
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden File Input for triggering upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Right Column: Real AI Diagnosis Report */}
      <div className="flex flex-col gap-4 lg:col-span-6">
        {/* Header Bar with Dynamic Engine Selector */}
        <div className="flex flex-col gap-2.5 border-b border-outline-variant/20 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-title-md font-bold text-on-surface">
                <Icon name="biotech" size={22} className="text-primary" />
                ผลการวินิจฉัยโรคพืชด้วย AI
              </h3>
              <p className="text-caption text-on-surface-variant">วิเคราะห์ตามพยาธิสภาพใบจริงจากภาพถ่าย</p>
            </div>
            <button
              type="button"
              onClick={() => setEngineModalOpen(true)}
              className="text-caption font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
              title="เปรียบเทียบจุดเด่นและข้อจำกัดของทุกโมเดล"
            >
              <Icon name="help" size={16} />
              จุดเด่น &amp; ข้อจำกัด
            </button>
          </div>

          {/* Engine Selector Pills (Dynamic for all available models) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-on-surface-variant font-medium shrink-0">โมเดล AI:</span>
            {(engineList.length > 0
              ? engineList
              : [
                  { name: 'legacy4', title_th: 'Legacy-4 (ตัวหลัก 4 คลาส)', class_count: 4, costs_money: false, calibrated: true, description_th: 'โมเดล 4 คลาสหลักบนแตงโม' },
                  { name: 'wide9', title_th: 'Wide-9 (9 คลาส)', class_count: 9, costs_money: false, calibrated: false, description_th: 'โมเดล 9 คลาส รวมราแป้ง' },
                  { name: 'wide11', title_th: 'Wide-11 (11 คลาส)', class_count: 11, costs_money: false, calibrated: false, description_th: 'โมเดล 11 คลาส ขยายเพิ่มศัตรูพืช' },
                  { name: 'baseline9', title_th: 'Baseline-9 (9 คลาส)', class_count: 9, costs_money: false, calibrated: false, description_th: 'โมเดลเทียบเคียง MobileNetV3' },
                ]
            ).map((engine) => {
              const isSelected = demoEngine === engine.name;
              const label = ENGINE_SHORT_LABELS[engine.name] || engine.title_th || engine.name;
              return (
                <button
                  key={engine.name}
                  type="button"
                  onClick={() => {
                    const engineName = engine.name as VisionEngineName;
                    setDemoEngine(engineName);
                    if (customImage) void analyzeImage(customImage, engineName);
                  }}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer',
                    isSelected
                      ? engine.name === 'legacy4'
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-secondary text-on-secondary shadow-xs'
                      : 'bg-surface-lowest text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container hover:text-on-surface',
                  )}
                  title={`${label}: ${engine.description_th || ''}`}
                >
                  {engine.name === 'legacy4' && <span>⭐</span>}
                  {engine.name === 'wide9' && <span>🔬</span>}
                  {engine.name === 'wide11' && <span>🧬</span>}
                  {engine.name === 'baseline9' && <span>📊</span>}
                  {engine.name === 'claude' && <span>🤖</span>}
                  <span>{label}</span>
                  {engine.costs_money && (
                    <span className="rounded bg-error/20 px-1 text-[9px] text-error font-medium">
                      มีค่าใช้จ่าย
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {engineError && <p role="alert" className="text-caption text-error">โหลดเครื่องยนต์ AI ไม่สำเร็จ: {engineError}</p>}

        {/* Diagnosis Report Card Body */}
        <div className="flex flex-1 flex-col justify-between gap-4 rounded-xl bg-surface-low p-5 border border-outline-variant/20">
          {phase === 'scanning' ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Icon name="biotech" size={40} className="animate-spin text-primary" />
              <p className="text-title-sm font-bold text-on-surface">กำลังวิเคราะห์พยาธิสภาพใบด้วย AI...</p>
              <p className="text-caption text-on-surface-variant max-w-sm">
                โมเดลกำลังตรวจสอบรอยจุด รอยไหม้ เส้นใบ และการกระจายตัวของเชื้อก่อโรค
              </p>
            </div>
          ) : customDiagnosis ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-outline-variant/20 pb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-caption font-semibold tracking-wider text-outline uppercase">
                      ผลการวินิจฉัยโรคพืชจริง
                    </span>
                    <Badge tone={customDiagnosis.status === 'healthy' ? 'secondary' : 'primary'}>
                      {STATUS_PRESENTATION[customDiagnosis.status]?.label ?? 'ตรวจพบโรค'}
                    </Badge>
                  </div>
                  <h3 className="text-title-lg font-bold text-on-surface mt-1">
                    {customDiagnosis.thai_name}
                  </h3>
                  {customDiagnosis.scientific_name ? (
                    <p className="text-caption italic text-on-surface-variant mt-0.5">
                      เชื้อสาเหตุ: {customDiagnosis.scientific_name}
                    </p>
                  ) : null}
                </div>
                <LiveBadge>ความมั่นใจ {customDiagnosis.confidence_percentage}%</LiveBadge>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 text-caption">
                <div className="rounded-lg bg-surface-lowest p-2.5 shadow-sm border border-outline-variant/20">
                  <span className="text-on-surface-variant flex items-center gap-1 text-[11px]">
                    <Icon name="verified_user" size={13} className="text-secondary" />
                    การคัดกรอง LeafCheck
                  </span>
                  <p className="font-bold text-secondary mt-0.5 text-xs">
                    {customDiagnosis.photo_quality?.verdict ?? 'ผ่านเกณฑ์'}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-lowest p-2.5 shadow-sm border border-outline-variant/20">
                  <span className="text-on-surface-variant flex items-center gap-1 text-[11px]">
                    <Icon name="insights" size={13} className="text-primary" />
                    การสอบเทียบความมั่นใจ
                  </span>
                  <Link to="/evaluation" className="font-bold text-primary mt-0.5 text-xs hover:underline flex items-center gap-0.5">
                    ดูสถานะการปรับเทียบ →
                  </Link>
                </div>
              </div>

              {/* Urgent Action */}
              {customDiagnosis.urgent_action ? (
                <div className="rounded-lg bg-surface-lowest p-3 shadow-sm border border-flesh-border/50">
                  <p className="flex items-center gap-1.5 text-label-md font-bold text-on-surface mb-1">
                    <Icon name="priority_high" size={16} className="text-primary" />
                    คำแนะนำเร่งด่วน
                  </p>
                  <p className="text-caption text-on-surface-variant leading-relaxed">
                    {customDiagnosis.urgent_action}
                  </p>
                </div>
              ) : null}

              {/* Treatment and Chemical control (with mandatory PHI) */}
              <div className="rounded-lg bg-surface-lowest p-3.5 shadow-sm border border-outline-variant/30 space-y-1.5">
                <p className="flex items-center gap-1.5 text-label-md font-bold text-on-surface">
                  <Icon name="medication" size={16} className="text-secondary" />
                  แนวทางการจัดการ &amp; สารที่แนะนำ
                </p>
                {customDiagnosis.symptoms.length > 0 ? (
                  <p className="text-caption text-on-surface-variant">
                    <span className="font-semibold text-on-surface">ลักษณะอาการ:</span> {customDiagnosis.symptoms.join(' • ')}
                  </p>
                ) : null}
                {customDiagnosis.chemical_control.length > 0 ? (
                  <p className="text-caption text-on-surface-variant">
                    <span className="font-semibold text-on-surface">สารเคมีที่แนะนำ:</span> {customDiagnosis.chemical_control.join(', ')}
                    {customDiagnosis.phi_note ? (
                      <span className="ml-1 text-primary font-semibold">({customDiagnosis.phi_note})</span>
                    ) : null}
                  </p>
                ) : null}
                {customDiagnosis.organic_control.length > 0 ? (
                  <p className="text-caption text-on-surface-variant">
                    <span className="font-semibold text-on-surface">ชีวภัณฑ์/อินทรีย์:</span> {customDiagnosis.organic_control.join(', ')}
                  </p>
                ) : null}
                {customDiagnosis.status === 'healthy' ? (
                  <p className="text-caption text-secondary">
                    ใบสมบูรณ์แข็งแรง ไม่พบรอยโรค รักษาความชื้นและการให้น้ำตามรอบปกติ
                  </p>
                ) : null}
              </div>

              <p className="text-[11px] text-on-surface-variant italic">
                * คำแนะนำจาก AI เป็นเครื่องมือช่วยตัดสินใจเบื้องต้น ควรตรวจสอบหน้าแปลงจริงร่วมด้วย
              </p>
            </div>
          ) : compareData ? (
            <div className="flex flex-col gap-3">
              <VisionCompareCard compareResult={compareData} />
            </div>
          ) : (
            /* Idle Ready State */
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-secondary-container/40 text-secondary">
                <Icon name="biotech" size={34} />
              </div>
              <div className="max-w-sm">
                <h4 className="text-title-md font-bold text-on-surface">ยังไม่มีผลการตรวจวิเคราะห์</h4>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  เปิดกล้องหรืออัปโหลดภาพถ่ายใบแตงโมเพื่อเริ่มการวิเคราะห์ด้วยโมเดล AI จริง
                </p>
              </div>
              <div className="rounded-lg bg-surface-lowest p-3 text-left border border-outline-variant/30 text-caption text-on-surface-variant space-y-1 w-full max-w-sm">
                <p className="font-bold text-on-surface flex items-center gap-1.5">
                  <Icon name="lightbulb" size={14} className="text-secondary" />
                  คำแนะนำในการถ่ายภาพเพื่อความแม่นยำ:
                </p>
                <p>• ถ่ายระยะใกล้ ชัดเจน ตรงส่วนใบที่แสดงอาการผิดปกติ</p>
                <p>• หลีกเลี่ยงภาพเบลอ แสงสะท้อนจ้า หรือถ่ายย้อนแสง</p>
                <p>• ระบบรองรับการตรวจโรคราน้ำค้าง, แอนแทรคโนส, ไวรัสยอดหงิก</p>
              </div>
              <Link to="/disease-scan" className="text-caption font-bold text-primary hover:underline inline-flex items-center gap-1">
                ต้องการบันทึกแปลงและสแกนประวัติเต็มระบบ? ไปที่หน้าตรวจโรคเต็มรูปแบบ →
              </Link>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-outline-variant/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLineExport}
              disabled={!customDiagnosis && !compareData}
              className="flex-1"
            >
              <Icon name="download" size={16} className="text-secondary" />
              ส่งรายงานเข้า LINE
            </Button>
            <Button
              size="sm"
              onClick={handleRescan}
              disabled={phase === 'scanning' || !customImage}
              variant="ghost"
              className="shrink-0"
              title="วิเคราะห์ภาพนี้ใหม่อีกครั้ง"
            >
              <Icon
                name="refresh"
                size={16}
                className={phase === 'scanning' ? 'animate-spin' : ''}
              />
              สแกนใหม่
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleConsultAI}
              className="shrink-0"
            >
              ปรึกษา AI ต่อ
              <Icon name="arrow_forward" size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Vision Engine Comparison & Details Modal */}
      <VisionEngineModal
        isOpen={engineModalOpen}
        onClose={() => setEngineModalOpen(false)}
        engines={engineList}
        selectedEngine={demoEngine}
        onSelectEngine={(engineName) => {
          setDemoEngine(engineName);
          if (customImage) void analyzeImage(customImage, engineName);
          setEngineModalOpen(false);
          toast.success(`เปลี่ยนเครื่องยนต์ AI เป็น ${ENGINE_SHORT_LABELS[engineName] ?? engineName} แล้ว`);
        }}
      />
    </div>
  );
}

const FEATURES = [
  {
    icon: 'photo_camera',
    title: 'วินิจฉัยโรคจากภาพถ่าย',
    body: 'ส่งภาพใบแตงโมเพื่อคัดกรอง 4 คลาสหลัก พร้อมข้อจำกัดของผลและข้อมูลอ้างอิงเมื่อโมเดลอ่านภาพได้',
    tone: 'primary' as const,
  },
  {
    icon: 'graphic_eq',
    title: 'เสียงเคาะอยู่ระหว่างวิจัย',
    body: 'ยังไม่มีโมเดลเสียงเคาะที่ผ่านการสอบเทียบกับความสุกหรือค่าความหวาน Brix จริง',
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
            <p className="text-label-md font-bold tracking-wider text-secondary uppercase">ระบบตรวจวินิจฉัยสด</p>
            <h2 className="mt-2 text-headline-lg text-on-surface">สแกนตรวจโรคใบแตงโมด้วย AI</h2>
            <p className="mt-2 text-body-md text-on-surface-variant">
              เปิดกล้องถ่ายภาพ หรือเลือกภาพถ่ายใบแตงโมจากสวนของคุณ เพื่อให้ AI วินิจฉัยโรคและประเมินอาการได้ทันที
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
                <span className="flex size-12 items-center justify-center rounded-full bg-primary-fixed text-primary shadow-xs">
                  <Icon name={step.icon} size={24} />
                </span>
                <h3 className="mt-4 text-title-md font-bold text-on-surface">{step.title}</h3>
                <p className="mt-2 text-body-md text-on-surface-variant">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 bg-surface-low/70 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-label-md font-bold tracking-wider text-secondary uppercase">ฟีเจอร์เด่น</p>
            <h2 className="mt-2 text-headline-lg text-on-surface">ครบทุกเครื่องมือเพื่อผลผลิตแตงโมคุณภาพสูง</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="flex flex-col gap-3">
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
              เริ่มดูแลแปลงแตงโมด้วย AI วันนี้ ใช้งานได้ฟรีทุกฟีเจอร์ ไม่มีค่าบริการ
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
            </div>
          </Card>
        </div>
      </section>
    </MarketingShell>
  );
}
