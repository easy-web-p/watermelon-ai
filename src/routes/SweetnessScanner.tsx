import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell, PageContainer, PageHeading } from '../components/layout/AppShell';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge, LiveBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Segmented } from '../components/ui/Segmented';
import { useToast } from '../components/ui/Toast';
import { DiseaseResultCard } from '../components/domain/DiseaseResultCard';
import { VisionCompareCard } from '../components/domain/VisionCompareCard';
import { VisionEngineModal } from '../components/domain/VisionEngineModal';
import { FALLBACK_ENGINES, type VisionEngineInfo, type VisionEngineName } from '../lib/visionEngines';
import { cn } from '../lib/cn';
import { useRouter } from '../lib/router';
import { Modal } from '../components/ui/Modal';
import {
  api,
  type AcousticModelStatus,
  type AcousticAnalysis,
  type DiseaseDetection,
  type DiseaseRecord,
  type VisionCompareResponse,
} from '../lib/api';
import { compressImage, recordingToPcm, useKnockRecorder, validateImage } from '../lib/media';
import { CULTIVARS } from '../data/cultivars';

type Method = 'knock' | 'photo';

const METHODS = [
  { value: 'knock', label: 'ฟังเสียงเคาะ' },
  { value: 'photo', label: 'วิเคราะห์จากภาพ' },
] as const;

/**
 * Live waveform. While recording it is driven by the microphone's real peak
 * level; once a clip exists it replays the captured envelope so the farmer can
 * see whether the taps actually registered.
 */
function Waveform({ level, levels, active }: { level: number; levels?: number[]; active: boolean }) {
  const BARS = 44;

  const heights = (() => {
    if (active) {
      // Newest sample on the right, decaying towards the left.
      return Array.from({ length: BARS }, (_, index) => {
        const decay = 1 - index / BARS;
        return Math.max(8, Math.min(100, level * 240 * decay + 8));
      }).reverse();
    }
    if (levels?.length) {
      const bucket = Math.max(1, Math.floor(levels.length / BARS));
      return Array.from({ length: BARS }, (_, index) => {
        const slice = levels.slice(index * bucket, (index + 1) * bucket);
        const peak = slice.length ? Math.max(...slice) : 0;
        return Math.max(8, Math.min(100, peak * 240));
      });
    }
    return Array.from({ length: BARS }, (_, index) => 10 + Math.abs(Math.sin((index / BARS) * Math.PI * 2)) * 22);
  })();

  return (
    <div className="flex h-24 items-center justify-center gap-1" aria-hidden="true">
      {heights.map((height, index) => (
        <span
          key={index}
          className={cn(
            'w-1.5 rounded-full transition-[height] duration-75',
            active ? 'bg-primary' : levels?.length ? 'bg-secondary' : 'bg-surface-highest',
          )}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

export function SweetnessScanner() {
  const [method, setMethod] = useState<Method>('photo');
  const [cultivarId, setCultivarId] = useState('');
  const [acoustic, setAcoustic] = useState<AcousticAnalysis | null>(null);
  const [massText, setMassText] = useState('');
  const [measuredBrixText, setMeasuredBrixText] = useState('');
  const [targetBrixText, setTargetBrixText] = useState('');
  const [disease, setDisease] = useState<DiseaseDetection | null>(null);
  const [compareData, setCompareData] = useState<VisionCompareResponse | null>(null);
  const [photoEngine, setPhotoEngine] = useState<VisionEngineName>('legacy4');
  const [engineList, setEngineList] = useState<readonly VisionEngineInfo[]>(FALLBACK_ENGINES);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [engineModalOpen, setEngineModalOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<DiseaseRecord[] | null>(null);
  const [acousticStatus, setAcousticStatus] = useState<AcousticModelStatus | null>(null);
  const [diseaseStatus, setDiseaseStatus] = useState<{ online: boolean; error?: string } | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const lastAnalysedClip = useRef<string | null>(null);
  const toast = useToast();
  const { navigate } = useRouter();
  const recorder = useKnockRecorder();

  const cultivar = CULTIVARS.find((item) => item.id === cultivarId);
  const cultivarName = cultivar?.name ?? 'สายพันธุ์ที่ยังไม่ระบุ';
  const measuredBrix = measuredBrixText.trim() && Number.isFinite(Number(measuredBrixText))
    ? Number(measuredBrixText) : null;
  const targetBrix = targetBrixText.trim() && Number.isFinite(Number(targetBrixText))
    ? Number(targetBrixText) : null;
  const validMeasuredBrix = measuredBrix !== null && measuredBrix >= 0 && measuredBrix <= 30;
  const validTargetBrix = targetBrix !== null && targetBrix >= 0 && targetBrix <= 30;

  useEffect(() => {
    let cancelled = false;
    api
      .acousticModelStatus()
      .then((st) => {
        if (!cancelled) setAcousticStatus(st);
      })
      .catch((error: unknown) => {
        if (!cancelled) setAcousticStatus({
          success: false,
          online: false,
          error: error instanceof Error ? error.message : 'ตรวจสถานะเสียงไม่ได้',
        });
      });

    api
      .diseaseModelStatus()
      .then((st) => {
        if (!cancelled) setDiseaseStatus(st);
      })
      .catch((error: unknown) => {
        if (!cancelled) setDiseaseStatus({
          online: false,
          error: error instanceof Error ? error.message : 'ตรวจสถานะโมเดลภาพไม่ได้',
        });
      });

    api
      .visionEngines()
      .then((res) => {
        if (!cancelled) {
          setEngineList(res.engines);
          setEngineError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setEngineError(error instanceof Error ? error.message : 'โหลดเครื่องยนต์ไม่ได้');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (recorder.error) toast.error(recorder.error);
  }, [recorder.error, toast]);

  const isAcousticOnline = Boolean(acousticStatus?.online);

  const analyseKnock = useCallback(async () => {
    if (!isAcousticOnline) {
      toast.error('ระบบวัดคลื่นเสียงยังไม่พร้อมใช้งาน');
      return;
    }

    const clip = recorder.recording;
    if (!clip) return;

    setBusy(true);
    setAcoustic(null);
    try {
      const pcm = await recordingToPcm(clip);
      const massKg = massText.trim() ? Number(massText) : undefined;
      if (massKg !== undefined && (!Number.isFinite(massKg) || massKg <= 0 || massKg > 30)) {
        throw new Error('น้ำหนักผลต้องอยู่ระหว่าง 0–30 กก.');
      }
      const result = await api.analyseKnock({
        ...pcm,
        ...(massKg === undefined ? {} : { massKg }),
      });
      setAcoustic(result);
      toast.success('วัดคลื่นเสียงจากไฟล์ที่อัดจริงแล้ว');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'วิเคราะห์เสียงไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }, [isAcousticOnline, recorder.recording, massText, toast]);

  useEffect(() => {
    if (recorder.state !== 'ready' || !recorder.recording) return;
    if (lastAnalysedClip.current === recorder.recording.dataUrl) return;
    lastAnalysedClip.current = recorder.recording.dataUrl;
    void analyseKnock();
  }, [recorder.state, recorder.recording, analyseKnock]);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    const problem = validateImage(file);
    if (problem) {
      toast.error(problem);
      return;
    }

    setBusy(true);
    setAcoustic(null);
    setDisease(null);
    setCompareData(null);
    try {
      const dataUrl = await compressImage(file);
      setPhoto(dataUrl);
      if (!engineList.some((engine) => engine.name === photoEngine)) {
        throw new Error(engineError ?? 'เครื่องยนต์ที่เลือกยังไม่พร้อมใช้งาน');
      }

      if (photoEngine !== 'legacy4') {
        const compRes = await api.visionCompare({
          imageBase64: dataUrl,
          engine: photoEngine,
          notes: cultivar ? `ผู้ใช้ระบุสายพันธุ์${cultivar.name}` : undefined,
        });
        setCompareData(compRes);
        toast.success(`ได้รับข้อสังเกตเพิ่มเติมจาก ${engineList.find((engine) => engine.name === photoEngine)?.title_th ?? photoEngine}`);
      } else {
        const result = await api.detectDisease({ imageBase64: dataUrl, notes: cultivar ? `ผู้ใช้ระบุสายพันธุ์${cultivar.name}` : undefined, engine: 'legacy4' });
        setDisease(result);
        toast.success('วิเคราะห์ภาพเรียบร้อย');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'วิเคราะห์ภาพไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  const recording = recorder.state === 'recording';
  const hasResult = Boolean(acoustic || disease || compareData || validMeasuredBrix);

  return (
    <AppShell>
      <PageContainer>
        <PageHeading
          eyebrow={
            <>
              <Badge tone={method === 'photo' ? 'secondary' : 'outline'}>
                <Icon name={method === 'photo' ? 'photo_camera' : 'graphic_eq'} size={14} />
                {method === 'photo' ? 'Watermelon Vision AI' : 'Melon Acoustic Engine v3.1'}
              </Badge>
              {method === 'photo' ? (
                diseaseStatus?.online !== false ? (
                  <LiveBadge>โมเดลพร้อมใช้งาน</LiveBadge>
                ) : (
                  <Badge tone="error">โมเดลภาพไม่ออนไลน์</Badge>
                )
              ) : isAcousticOnline ? (
                <LiveBadge>ระบบวัดคลื่นเสียงพร้อมใช้งาน</LiveBadge>
              ) : (
                <Badge tone="outline">
                  <Icon name="construction" size={12} />
                  ระบบวัดเสียงไม่ออนไลน์
                </Badge>
              )}
            </>
          }
          title="เทียบค่าความหวานและตรวจข้อมูลสายพันธุ์"
          description="กรอกค่า °Brix ที่วัดด้วยรีแฟรกโตมิเตอร์เพื่อเทียบเป้าหมายของคุณ วัดคลื่นเสียงเคาะได้จริง แต่เสียงและภาพใบยังไม่สามารถทำนายความหวานหรือยืนยันสายพันธุ์"
          actions={
            hasResult ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAcoustic(null);
                  setDisease(null);
                  setCompareData(null);
                  setPhoto(null);
                  setMeasuredBrixText('');
                  setTargetBrixText('');
                  setMassText('');
                  recorder.reset();
                }}
              >
                <Icon name="refresh" size={18} />
                ตรวจวัดใหม่
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/disease-scan')}
              >
                <Icon name="biotech" size={18} />
                ตรวจโรคใบด้วย AI เต็มระบบ
              </Button>
            )
          }
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <CardHeader
              icon={method === 'knock' ? 'mic' : 'photo_camera'}
              title={method === 'knock' ? 'บันทึกเสียงเคาะผลแตงโม' : 'อัปโหลดภาพใบแตงโมเพื่อตรวจโรค'}
              subtitle={
                method === 'knock'
                  ? 'เคาะกลางผล 3 ครั้งห่างกันประมาณ 1 วินาที ในที่เงียบ'
                  : 'ถ่ายใบแตงโมในแสงธรรมชาติให้เห็นอาการชัดเจน โมเดลนี้ไม่ได้ฝึกอ่านภาพผล'
              }
              action={
                <Segmented
                  options={METHODS}
                  value={method}
                  onChange={(next) => {
                    setMethod(next);
                    recorder.reset();
                  }}
                  size="sm"
                  label="วิธีตรวจวัด"
                />
              }
            />

            <div className="rounded-lg bg-surface-low p-6">
              {method === 'knock' ? (
                <>
                  {!isAcousticOnline ? (
                    <div className="mb-5 rounded-xl border border-outline-variant/60 bg-surface-container-low p-5 text-center">
                      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon name="construction" size={24} />
                      </div>
                      <h3 className="mt-3 text-title-md font-bold text-on-surface">ระบบวัดคลื่นเสียงไม่ออนไลน์</h3>
                      <p className="mx-auto mt-2 max-w-md text-body-md text-on-surface-variant">
                        {acousticStatus?.error ?? 'เมื่อบริการพร้อมจะวัดความถี่จากเสียงที่อัดจริง โดยไม่เดาค่า °Brix หรือระดับความสุกจากเสียง'}
                      </p>
                      <div className="mt-4 flex justify-center">
                        <Button
                          size="md"
                          variant="primary"
                          onClick={() => {
                            setMethod('photo');
                            recorder.reset();
                          }}
                        >
                          <Icon name="photo_camera" size={18} />
                          สลับไปตรวจโรคใบจากภาพ
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <Waveform level={recorder.level} levels={recorder.recording?.levels} active={recording} />
                  <p className="mt-2 text-center text-body-md text-on-surface-variant">
                    {recording
                      ? `กำลังรับฟัง ${(recorder.elapsedMs / 1000).toFixed(1)} วินาที — เคาะต่อไปจนครบ 3 ครั้ง`
                      : busy
                        ? 'กำลังประมวลผลคลื่นเสียง...'
                        : acoustic
                          ? 'วัดคลื่นเสียงเสร็จแล้ว — ดูผลด้านขวา'
                          : !isAcousticOnline
                            ? 'ระบบวัดคลื่นเสียงไม่ออนไลน์ กรุณาลองใหม่เมื่อบริการพร้อม'
                            : recorder.state === 'denied'
                              ? 'ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน กรุณาอนุญาตแล้วลองใหม่'
                              : 'กดปุ่มด้านล่างแล้วเคาะผลแตงโมใกล้ไมโครโฟน'}
                  </p>

                  <label className="mt-4 block text-center text-label-md font-semibold text-on-surface-variant">
                    น้ำหนักผลที่ชั่งจริง (กก., ไม่บังคับ)
                    <input
                      type="number"
                      min="0.01"
                      max="30"
                      step="0.01"
                      value={massText}
                      onChange={(event) => setMassText(event.target.value)}
                      className="mt-2 block w-full rounded-md border border-outline-variant bg-surface-lowest px-3 py-2 text-on-surface"
                      placeholder="เช่น 4.2"
                    />
                  </label>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    {recording ? (
                      <Button size="lg" variant="secondary" onClick={recorder.stop}>
                        <Icon name="stop" size={20} />
                        หยุดบันทึกและวิเคราะห์
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        onClick={() => void recorder.start()}
                        disabled={busy || !isAcousticOnline}
                        title={!isAcousticOnline ? 'ระบบวัดเสียงไม่ออนไลน์' : undefined}
                      >
                        <Icon name={!isAcousticOnline ? 'mic_off' : 'mic'} size={20} />
                        {busy
                          ? 'กำลังวิเคราะห์...'
                          : !isAcousticOnline
                            ? 'ระบบวัดเสียงไม่ออนไลน์'
                            : 'เริ่มบันทึกเสียงเคาะ'}
                      </Button>
                    )}
                  </div>

                  {recorder.state === 'unsupported' ? (
                    <p className="mt-4 flex items-center justify-center gap-1.5 text-caption text-error">
                      <Icon name="error" size={14} />
                      เบราว์เซอร์นี้ไม่รองรับการบันทึกเสียง ลองใช้โหมดวิเคราะห์จากภาพแทน
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-container/70 p-3 border border-outline-variant/30">
                    <div className="flex items-center gap-1.5 text-caption font-semibold text-on-surface-variant">
                      <Icon name="psychology" size={16} className="text-secondary" />
                      <span>เครื่องยนต์ AI วิเคราะห์โรค:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPhotoEngine('wide9')}
                        disabled={!engineList.some((engine) => engine.name === 'wide9')}
                        className={cn(
                          'cursor-pointer rounded-full px-3 py-1 text-label-xs font-semibold transition-all duration-150',
                          photoEngine === 'wide9'
                            ? 'bg-secondary text-on-secondary shadow-sm'
                            : 'bg-surface-low text-on-surface-variant hover:bg-surface-container',
                        )}
                      >
                        🔬 Wide-9 (9 คลาส)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoEngine('legacy4')}
                        disabled={!engineList.some((engine) => engine.name === 'legacy4')}
                        className={cn(
                          'cursor-pointer rounded-full px-3 py-1 text-label-xs font-semibold transition-all duration-150',
                          photoEngine === 'legacy4'
                            ? 'bg-primary text-on-primary shadow-sm'
                            : 'bg-surface-low text-on-surface-variant hover:bg-surface-container',
                        )}
                      >
                        ⚡ Legacy-4
                      </button>
                      <button
                        type="button"
                        onClick={() => setEngineModalOpen(true)}
                        title="ดูข้อดีและข้อจำกัดของแต่ละโมเดล"
                        className="inline-flex size-6 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container cursor-pointer"
                      >
                        <Icon name="info" size={14} />
                      </button>
                    </div>
                  </div>
                  {engineError && <p role="alert" className="mb-3 text-caption text-error">โหลดเครื่องยนต์ AI ไม่สำเร็จ: {engineError}</p>}

                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(event) => {
                      void handleFile(event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => fileInput.current?.click()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleFile(event.dataTransfer.files?.[0]);
                    }}
                    className="flex w-full cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-primary/30 py-12 text-center transition-colors hover:border-primary disabled:opacity-50"
                  >
                    {photo ? (
                      <img src={photo} alt="ภาพที่เลือก" className="max-h-48 rounded-md object-cover shadow-sm" />
                    ) : (
                      <span className="flex size-14 items-center justify-center rounded-full bg-primary-fixed text-primary">
                        <Icon name="add_a_photo" size={28} />
                      </span>
                    )}
                    <span className="text-title-md font-bold text-on-surface">
                      {busy ? 'กำลังวิเคราะห์ภาพ...' : photo ? 'เลือกภาพอื่น' : 'ถ่ายภาพ หรือลากไฟล์มาวางที่นี่'}
                    </span>
                    <span className="text-body-md text-on-surface-variant">
                      รองรับ JPG, PNG, WEBP ขนาดไม่เกิน 10 MB
                    </span>
                  </button>
                </>
              )}
            </div>

            <div className="mt-5 rounded-md bg-surface-low p-4">
              <p className="text-label-lg font-bold text-on-surface">ค่าความหวานที่วัดจริง</p>
              <p className="mt-1 text-caption text-on-surface-variant">
                ใช้รีแฟรกโตมิเตอร์วัดน้ำคั้นจากผล แล้วกรอกค่าเอง ภาพและเสียงเคาะไม่ให้ค่า °Brix
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-label-md font-semibold text-on-surface-variant">
                  ค่า °Brix ที่วัดได้
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.1"
                    value={measuredBrixText}
                    onChange={(event) => setMeasuredBrixText(event.target.value)}
                    className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-lowest px-3 py-2 text-on-surface"
                    placeholder="เช่น 11.8"
                  />
                </label>
                <label className="text-label-md font-semibold text-on-surface-variant">
                  เป้าหมาย °Brix จากเกณฑ์ของคุณ (ไม่บังคับ)
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.1"
                    value={targetBrixText}
                    onChange={(event) => setTargetBrixText(event.target.value)}
                    className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-lowest px-3 py-2 text-on-surface"
                    placeholder="เช่น 12.0"
                  />
                </label>
              </div>
              {measuredBrixText && !validMeasuredBrix ? <p role="alert" className="mt-2 text-caption text-error">ค่า °Brix ต้องอยู่ระหว่าง 0–30</p> : null}
              {targetBrixText && !validTargetBrix ? <p role="alert" className="mt-2 text-caption text-error">ค่าเป้าหมายต้องอยู่ระหว่าง 0–30 °Brix</p> : null}
              {validMeasuredBrix ? (
                <p className="mt-3 text-body-md text-on-surface">
                  ผลที่คุณวัดจาก {cultivarName}: <strong>{measuredBrix!.toFixed(1)} °Brix</strong>
                  {validTargetBrix ? ` • ${measuredBrix! >= targetBrix! ? 'สูงกว่า' : 'ต่ำกว่า'}เป้าหมายที่คุณกรอก ${Math.abs(measuredBrix! - targetBrix!).toFixed(1)} °Brix` : ''}
                </p>
              ) : null}
            </div>
          </Card>

          <div className="flex flex-col gap-4 lg:col-span-5">
            <Card>
              {acoustic ? (
                <>
                  <CardHeader icon="graphic_eq" iconTone="secondary" title="ผลวัดคลื่นเสียงจริง" subtitle="ประมวลผล FFT จากเสียงที่อัด ไม่ใช่โมเดลทำนายความหวาน" />
                  <dl className="grid grid-cols-2 gap-3">
                    <div><dt className="text-caption text-on-surface-variant">ความถี่เด่น</dt><dd className="text-headline-sm font-bold text-secondary">{acoustic.reading.dominant_frequency_hz} Hz</dd></div>
                    <div><dt className="text-caption text-on-surface-variant">จังหวะเคาะ</dt><dd className="text-headline-sm font-bold text-on-surface">{acoustic.reading.impulse_count} ครั้ง</dd></div>
                    <div><dt className="text-caption text-on-surface-variant">สัญญาณต่อเสียงรบกวน</dt><dd className="text-title-md font-bold text-on-surface">{acoustic.reading.snr_db} dB</dd></div>
                    <div><dt className="text-caption text-on-surface-variant">เวลาหน่วงเสียง</dt><dd className="text-title-md font-bold text-on-surface">{acoustic.reading.decay_time_ms} ms</dd></div>
                  </dl>
                  {acoustic.reading.stiffness_index !== null ? <p className="mt-3 text-body-md text-on-surface-variant">ดัชนีความแข็งจากน้ำหนักที่ชั่ง: {acoustic.reading.stiffness_index} (ใช้เทียบผลในล็อตเดียวกันเท่านั้น)</p> : null}
                  {acoustic.reading.notes_th.map((note) => <p key={note} className="mt-2 text-caption text-on-surface-variant">{note}</p>)}
                  <p className="mt-3 text-body-md text-on-surface-variant">{acoustic.reading.brix_unavailable_reason_th}</p>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-surface-container-high/60 pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 justify-center text-xs"
                      onClick={() => navigate(`/chat?q=${encodeURIComponent(`ผลวัดเสียงเคาะ ${cultivarName} ความถี่เด่น ${acoustic.reading.dominant_frequency_hz} Hz แต่ยังไม่มีค่า Brix จากเสียง ช่วยอธิบายผลวัดนี้อย่างระมัดระวังครับ`)}`)}
                    >
                      <Icon name="chat" size={16} />
                      ปรึกษา AI ต่อ
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 justify-center text-xs"
                      onClick={() => navigate('/plots')}
                    >
                      <Icon name="map" size={16} />
                      ดูแปลงของฉัน
                    </Button>
                  </div>
                </>
              ) : compareData ? (
                <>
                  <VisionCompareCard compareResult={compareData} />
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-surface-container-high/60 pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 justify-center text-xs"
                      onClick={() =>
                        navigate(
                          `/chat?q=${encodeURIComponent(
                            `มีข้อสังเกตเพิ่มเติมจาก ${engineList.find((engine) => engine.name === photoEngine)?.title_th ?? photoEngine} สำหรับภาพใบ ${cultivarName} แต่ยังไม่ใช่คำวินิจฉัย ช่วยแนะนำวิธีตรวจสอบอาการเพิ่มเติมครับ`,
                          )}`,
                        )
                      }
                    >
                      <Icon name="chat" size={16} />
                      ปรึกษา AI ในแชท
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 justify-center text-xs"
                      onClick={() => navigate('/disease-scan')}
                    >
                      <Icon name="center_focus_strong" size={16} />
                      สแกนโรคโหมดเต็ม
                    </Button>
                  </div>
                </>
              ) : disease ? (
                <>
                  <DiseaseResultCard result={disease} imageUrl={photo ?? undefined} />
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-surface-container-high/60 pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 justify-center text-xs"
                      onClick={() =>
                        navigate(
                          `/chat?q=${encodeURIComponent(
                            disease.status === 'diagnosed'
                              ? `ผลสแกนใบ ${cultivarName} พบ ${disease.thai_name} ช่วยแนะนำวิธีตรวจอาการและจัดการโดยไม่เดาค่า PHI ครับ`
                              : `สแกนใบ ${cultivarName} แล้ว AI ${disease.thai_name} ช่วยแนะนำวิธีตรวจอาการด้วยตาเปล่าครับ`,
                          )}`,
                        )
                      }
                    >
                      <Icon name="chat" size={16} />
                      ปรึกษา AI ในแชท
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 justify-center text-xs"
                      onClick={() => navigate('/fertilizer')}
                    >
                      <Icon name="medication" size={16} />
                      คลังปุ๋ยยา
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <CardHeader
                    icon="science"
                    iconTone="secondary"
                    title="ผลประเมิน"
                    subtitle="ยังไม่มีผลการตรวจวัด"
                  />
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <Icon name="monitoring" size={40} className="text-outline" />
                    <p className="max-w-xs text-body-md text-on-surface-variant">
                      อัดเสียงเพื่อวัดคุณสมบัติคลื่นเสียง หรือกรอกค่า °Brix ที่วัดจริงด้วยเครื่องมือ
                    </p>
                  </div>
                </>
              )}
            </Card>

            <Card>
              <CardHeader
                icon="eco"
                iconTone="tertiary"
                title="จับคู่สายพันธุ์"
                subtitle="เลือกจากชื่อบนซองเมล็ดหรือบันทึกแปลง ไม่ใช่ผลจำแนกจากภาพ"
              />
              <div className="flex flex-wrap gap-2">
                {CULTIVARS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCultivarId(item.id)}
                    aria-pressed={cultivarId === item.id}
                    className={cn(
                      'cursor-pointer rounded-full px-3 py-1.5 text-label-md font-semibold transition-all duration-150 ease-tactile active:scale-[0.96]',
                      cultivarId === item.id
                        ? 'bg-secondary text-on-secondary shadow-sm'
                        : 'bg-surface-low text-on-surface-variant hover:bg-surface-container',
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: 'ทรงผล', value: cultivar?.shape ?? 'เลือกสายพันธุ์ก่อน' },
                  { label: 'ลายเปลือกตามแคตตาล็อก', value: cultivar?.rind ?? '—' },
                  { label: 'ลักษณะเนื้อตามแคตตาล็อก', value: cultivar?.flesh ?? '—' },
                ].map((row) => (
                  <div key={row.label} className="rounded-md bg-surface-low p-3">
                    <dt className="text-caption text-on-surface-variant">{row.label}</dt>
                    <dd className="mt-0.5 text-label-lg font-bold text-on-surface">{row.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-3 rounded-md bg-mint-mist p-4">
                <p className="text-body-md text-on-surface-variant">ข้อมูลลักษณะเป็นเพียงแคตตาล็อกอ้างอิง ไม่สามารถยืนยันสายพันธุ์จากลักษณะภายนอกเพียงอย่างเดียว กรุณาตรวจชื่อบนซองเมล็ดหรือบันทึกแปลง</p>
              </div>
            </Card>
          </div>
        </div>

        <Card className="mt-4">
          <CardHeader
            icon="table_chart"
            title="เทียบลักษณะสายพันธุ์ในแคตตาล็อก"
            subtitle="ข้อมูลลักษณะเพื่อช่วยตรวจชื่อเท่านั้น ยังไม่มีโมเดลยืนยันสายพันธุ์หรือผลวัดความหวานรายพันธุ์"
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="bg-surface-low text-label-md text-on-surface-variant">
                  <th scope="col" className="px-5 py-3 font-semibold">สายพันธุ์</th>
                  <th scope="col" className="px-4 py-3 font-semibold">ทรงผล</th>
                  <th scope="col" className="px-4 py-3 font-semibold">ลายเปลือก</th>
                  <th scope="col" className="px-4 py-3 font-semibold">ลักษณะเนื้อ</th>
                </tr>
              </thead>
              <tbody>
                {CULTIVARS.map((item) => (
                  <tr key={item.id} className="border-t border-outline-variant/30">
                    <th scope="row" className="px-5 py-4 text-left font-normal">
                      <span className="block text-label-lg font-bold text-on-surface">{item.name}</span>
                      <span className="block text-caption text-on-surface-variant italic">{item.code}</span>
                    </th>
                    <td className="px-4 py-4 text-body-md text-on-surface">{item.shape}</td>
                    <td className="px-4 py-4 text-body-md text-on-surface">{item.rind}</td>
                    <td className="px-4 py-4 text-body-md text-on-surface-variant">{item.flesh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Modal
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          icon="history"
          title="ประวัติการตรวจวัดล่าสุด"
          subtitle="ผลการสแกนและวินิจฉัยทั้งหมดที่บันทึกไว้ในระบบ"
          size="lg"
        >
          {history === null ? (
            <div className="flex flex-col gap-3" aria-busy="true">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-16 animate-pulse rounded-md bg-surface-container" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Icon name="inbox" size={36} className="text-outline" />
              <p className="max-w-xs text-body-md text-on-surface-variant">
                ยังไม่มีประวัติ — เริ่มตรวจวัดครั้งแรกแล้วผลจะถูกบันทึกไว้ที่นี่อัตโนมัติ
              </p>
            </div>
          ) : (
            <ol className="flex flex-col gap-2">
              {history.map((record) => (
                <li key={record.id} className="flex items-start justify-between gap-3 rounded-md bg-surface-low p-4">
                  <div className="min-w-0">
                    <p className="text-label-lg font-bold text-on-surface">{record.thai_name}</p>
                    <p className="mt-0.5 text-caption text-on-surface-variant">
                      {new Date(record.detectedAt).toLocaleString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      • แปลง {record.farmId}
                    </p>
                    {record.from_verified_model ? null : (
                      <p className="mt-1 text-caption text-on-surface-variant">⚠️ {record.unverified_note}</p>
                    )}
                  </div>
                  <Badge tone={record.severity_level >= 4 ? 'error' : record.severity_level === 3 ? 'primary' : 'secondary'}>
                    {record.confidence_percentage}%
                  </Badge>
                </li>
              ))}
            </ol>
          )}
        </Modal>

        <VisionEngineModal
          isOpen={engineModalOpen}
          onClose={() => setEngineModalOpen(false)}
          engines={engineList}
          selectedEngine={photoEngine}
          onSelectEngine={(next) => setPhotoEngine(next)}
        />
      </PageContainer>
    </AppShell>
  );
}
