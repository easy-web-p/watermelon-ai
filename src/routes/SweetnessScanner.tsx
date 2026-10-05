import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell, PageContainer, PageHeading } from '../components/layout/AppShell';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge, LiveBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Meter } from '../components/ui/Meter';
import { Segmented } from '../components/ui/Segmented';
import { useToast } from '../components/ui/Toast';
import { KnockResultCard } from '../components/domain/KnockResultCard';
import { DiseaseResultCard } from '../components/domain/DiseaseResultCard';
import { cn } from '../lib/cn';
import { Modal } from '../components/ui/Modal';
import {
  api,
  type AcousticModelStatus,
  type ApiVariety,
  type DiseaseDetection,
  type DiseaseModelStatus,
  type DiseaseRecord,
  type KnockAnalysis,
} from '../lib/api';
import { compressImage, useKnockRecorder, validateImage } from '../lib/media';
import { useAuth } from '../store/auth';
import { CULTIVARS, RIPENESS_BANDS } from '../data/cultivars';

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
  const [cultivarId, setCultivarId] = useState(CULTIVARS[0].id);
  const [knock, setKnock] = useState<KnockAnalysis | null>(null);
  const [disease, setDisease] = useState<DiseaseDetection | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [varieties, setVarieties] = useState<ApiVariety[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<DiseaseRecord[] | null>(null);
  const [acousticStatus, setAcousticStatus] = useState<AcousticModelStatus | null>(null);
  const [diseaseStatus, setDiseaseStatus] = useState<DiseaseModelStatus | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const recorder = useKnockRecorder();
  const allowTraining = useAuth((state) => state.consent.improveModel);

  const cultivar = CULTIVARS.find((item) => item.id === cultivarId) ?? CULTIVARS[0];
  // Match the local cultivar to the server's acoustic calibration table by name.
  const calibration = varieties.find((item) => item.name.includes(cultivar.name.split(' ')[0]));

  useEffect(() => {
    let cancelled = false;
    api
      .varieties()
      .then((list) => {
        if (!cancelled) setVarieties(Array.isArray(list) ? list : []);
      })
      .catch(() => undefined);

    api
      .acousticModelStatus()
      .then((st) => {
        if (!cancelled) setAcousticStatus(st);
      })
      .catch(() => undefined);

    api
      .diseaseModelStatus()
      .then((st) => {
        if (!cancelled) setDiseaseStatus(st);
      })
      .catch(() => undefined);

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
      toast.info('ระบบวิเคราะห์เสียงเคาะอยู่ระหว่างการวิจัยและพัฒนา เพื่อความแม่นยำและไม่สุ่มเดาผล กรุณาใช้วิธีวิเคราะห์จากภาพถ่ายแทนครับ');
      return;
    }

    const clip = recorder.recording;
    if (!clip) return;

    setBusy(true);
    setDisease(null);
    try {
      await api
        .uploadFile({ name: 'knock-recording.webm', mimeType: clip.mimeType, fileData: clip.dataUrl })
        .catch(() => undefined);

      const reply = await api.sendMessage(`scan-${Date.now()}`, {
        content: `วิเคราะห์เสียงเคาะสายพันธุ์${cultivar.name} ความยาว ${(clip.durationMs / 1000).toFixed(1)} วินาที`,
        mode: 'knock-analysis',
        allow_training: allowTraining,
      });

      if (reply.knockAnalysis) {
        setKnock(reply.knockAnalysis);
        toast.success('วิเคราะห์เสียงเคาะเรียบร้อย');
      } else {
        toast.error('ระบบไม่ได้ส่งผลวิเคราะห์กลับมา กรุณาลองใหม่');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'วิเคราะห์เสียงไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }, [isAcousticOnline, recorder.recording, cultivar.name, allowTraining, toast]);

  useEffect(() => {
    if (recorder.state === 'ready' && recorder.recording) void analyseKnock();
  }, [recorder.state, recorder.recording, analyseKnock]);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    const problem = validateImage(file);
    if (problem) {
      toast.error(problem);
      return;
    }

    setBusy(true);
    setKnock(null);
    try {
      const dataUrl = await compressImage(file);
      setPhoto(dataUrl);
      const result = await api.detectDisease({ imageBase64: dataUrl, notes: `สายพันธุ์${cultivar.name}` });
      setDisease(result);
      toast.success('วิเคราะห์ภาพเรียบร้อย');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'วิเคราะห์ภาพไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  const recording = recorder.state === 'recording';
  const hasResult = Boolean(knock || disease);

  const ripenessBand = knock
    ? knock.probabilities.ripe >= knock.probabilities.unripe && knock.probabilities.ripe >= knock.probabilities.overripe
      ? RIPENESS_BANDS[1]
      : knock.probabilities.unripe > knock.probabilities.overripe
        ? RIPENESS_BANDS[0]
        : RIPENESS_BANDS[2]
    : null;

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
                <LiveBadge>โมเดลพร้อมใช้งาน</LiveBadge>
              ) : (
                <Badge tone="outline">
                  <Icon name="construction" size={12} />
                  อยู่ระหว่างวิจัย (ไม่สุ่มเดาผล)
                </Badge>
              )}
            </>
          }
          title="ตรวจวัดความหวาน & วิเคราะห์สายพันธุ์"
          description="เคาะผลแตงโมแล้วให้ AI ฟังคลื่นเสียง หรืออัปโหลดภาพผลเพื่อประเมินค่าความหวาน Brix ระยะความสุก และตรวจโรคที่ผิวผล"
          actions={
            hasResult ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setKnock(null);
                  setDisease(null);
                  setPhoto(null);
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
                onClick={() => (window.location.hash = '#/disease-scan')}
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
              title={method === 'knock' ? 'บันทึกเสียงเคาะผลแตงโม' : 'อัปโหลดภาพผลแตงโม'}
              subtitle={
                method === 'knock'
                  ? 'เคาะกลางผล 3 ครั้งห่างกันประมาณ 1 วินาที ในที่เงียบ'
                  : 'ถ่ายผลเต็มใบในแสงธรรมชาติ ให้เห็นลายเปลือกและจุดสัมผัสพื้น'
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
                      <h3 className="mt-3 text-title-md font-bold text-on-surface">ระบบวิเคราะห์เสียงเคาะอยู่ระหว่างการวิจัย</h3>
                      <p className="mx-auto mt-2 max-w-md text-body-md text-on-surface-variant">
                        เพื่อความปลอดภัยของผลผลิตและเป็นไปตามหลักวิชาการ ระบบจะไม่สร้างตัวเลขความหวานหรือความถี่สมมติขึ้นมาเอง ชั่วคราวนี้แนะนำให้ใช้วิธี <strong>วิเคราะห์จากภาพ</strong> เพื่อความแม่นยำครับ
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
                          สลับไปตรวจจากภาพถ่าย
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
                        : knock
                          ? 'วิเคราะห์เสร็จสมบูรณ์ — ดูผลด้านขวา'
                          : !isAcousticOnline
                            ? 'ระบบเสียงเคาะยังไม่เปิดให้บริการ กรุณาใช้วิธีวิเคราะห์จากภาพด้านบน'
                            : recorder.state === 'denied'
                              ? 'ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน กรุณาอนุญาตแล้วลองใหม่'
                              : 'กดปุ่มด้านล่างแล้วเคาะผลแตงโมใกล้ไมโครโฟน'}
                  </p>

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
                        title={!isAcousticOnline ? 'ระบบเสียงเคาะอยู่ระหว่างการวิจัย' : undefined}
                      >
                        <Icon name={!isAcousticOnline ? 'mic_off' : 'mic'} size={20} />
                        {busy
                          ? 'กำลังวิเคราะห์...'
                          : !isAcousticOnline
                            ? 'ระบบเสียงอยู่ระหว่างวิจัย'
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

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {RIPENESS_BANDS.map((band) => (
                <div
                  key={band.id}
                  className={cn(
                    'rounded-md p-4 transition-all',
                    ripenessBand?.id === band.id ? 'bg-secondary-container ring-2 ring-secondary' : 'bg-surface-low',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-label-lg font-bold text-on-surface">{band.label}</p>
                    <Badge tone={band.tone === 'secondary' ? 'secondary' : band.tone === 'error' ? 'error' : 'neutral'}>
                      {band.brix} Brix
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-caption text-on-surface-variant">{band.note}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex flex-col gap-4 lg:col-span-5">
            <Card>
              {knock ? (
                <>
                  <KnockResultCard result={knock} />
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-surface-container-high/60 pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 justify-center text-xs"
                      onClick={() =>
                        (window.location.hash = `#/chat?q=${encodeURIComponent(
                          `ผลเคาะตรวจวัดความหวาน ${cultivar.name}: ได้ระดับ ${knock.maturityGrade} (${knock.sweetnessEstimateBrix} Brix) ควรจัดการอย่างไรต่อครับ`,
                        )}`)
                      }
                    >
                      <Icon name="chat" size={16} />
                      ปรึกษา AI ต่อ
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 justify-center text-xs"
                      onClick={() => (window.location.hash = '#/plots')}
                    >
                      <Icon name="map" size={16} />
                      ดูแปลงของฉัน
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
                        (window.location.hash = `#/chat?q=${encodeURIComponent(
                          disease.status === 'diagnosed'
                            ? `ผลสแกนใบ ${cultivar.name} พบ ${disease.thai_name} ขอคำแนะนำการใช้ยาเพิ่มเติมครับ`
                            : `สแกนใบ ${cultivar.name} แล้ว AI ${disease.thai_name} (ความมั่นใจ ${disease.confidence_percentage}%) ช่วยแนะนำวิธีตรวจอาการด้วยตาเปล่าครับ`,
                        )}`)
                      }
                    >
                      <Icon name="chat" size={16} />
                      ปรึกษา AI ในแชท
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 justify-center text-xs"
                      onClick={() => (window.location.hash = '#/fertilizer')}
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
                      เริ่มตรวจวัดเพื่อดูค่าความหวาน ระดับความสุก และคำแนะนำช่วงเวลาเก็บเกี่ยว
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
                subtitle="เลือกสายพันธุ์ที่ปลูกเพื่อเทียบเกณฑ์"
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
                  { label: 'ทรงผล', value: cultivar.shape },
                  { label: 'น้ำหนักเฉลี่ย', value: cultivar.weight },
                  { label: 'ความหวานมาตรฐาน', value: `${cultivar.brix[0]} – ${cultivar.brix[1]} °Brix` },
                  { label: 'อายุเก็บเกี่ยว', value: `${cultivar.days} วัน` },
                ].map((row) => (
                  <div key={row.label} className="rounded-md bg-surface-low p-3">
                    <dt className="text-caption text-on-surface-variant">{row.label}</dt>
                    <dd className="mt-0.5 text-label-lg font-bold text-on-surface">{row.value}</dd>
                  </div>
                ))}
              </dl>

              {calibration ? (
                <div className="mt-3 rounded-md bg-surface-container p-4">
                  <p className="flex items-center gap-1.5 text-caption font-semibold tracking-wider text-outline uppercase">
                    <Icon name="tune" size={13} />
                    เกณฑ์คลื่นเสียงจากฐานข้อมูลระบบ
                  </p>
                  <p className="mt-1.5 text-body-md text-on-surface">
                    ช่วงสุกพอดี{' '}
                    <span className="font-bold text-secondary">
                      {calibration.minRipeHz}–{calibration.maxRipeHz} Hz
                    </span>{' '}
                    • เป้าหมาย {calibration.targetBrix} °Brix
                  </p>
                  {knock ? (
                    <p
                      className={cn(
                        'mt-1.5 flex items-center gap-1.5 text-caption font-semibold',
                        knock.dominantFrequencyHz >= calibration.minRipeHz &&
                          knock.dominantFrequencyHz <= calibration.maxRipeHz
                          ? 'text-secondary'
                          : 'text-primary',
                      )}
                    >
                      <Icon
                        name={
                          knock.dominantFrequencyHz >= calibration.minRipeHz &&
                          knock.dominantFrequencyHz <= calibration.maxRipeHz
                            ? 'check_circle'
                            : 'warning'
                        }
                        size={13}
                      />
                      ผลที่วัดได้ {knock.dominantFrequencyHz} Hz —{' '}
                      {knock.dominantFrequencyHz >= calibration.minRipeHz &&
                      knock.dominantFrequencyHz <= calibration.maxRipeHz
                        ? 'อยู่ในเกณฑ์สุกพอดี'
                        : 'อยู่นอกเกณฑ์ของสายพันธุ์นี้'}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-3 rounded-md bg-mint-mist p-4">
                <p className="text-caption text-on-surface-variant">ราคาตลาดอ้างอิงวันนี้</p>
                <p className="mt-0.5 text-headline-sm font-bold text-secondary">{cultivar.market}</p>
                <ul className="mt-2 flex flex-col gap-1">
                  {cultivar.strengths.map((strength) => (
                    <li key={strength} className="flex items-start gap-1.5 text-body-md text-on-surface-variant">
                      <Icon name="check_circle" size={14} className="mt-1 text-secondary" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        </div>

        <Card className="mt-4">
          <CardHeader
            icon="table_chart"
            title="เปรียบเทียบสายพันธุ์แตงโมที่นิยมปลูกในไทย"
            subtitle="ข้อมูลอ้างอิงจากศูนย์วิจัยพืชสวนและฐานข้อมูลเกษตรกรในระบบ"
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="bg-surface-low text-label-md text-on-surface-variant">
                  <th scope="col" className="px-5 py-3 font-semibold">สายพันธุ์</th>
                  <th scope="col" className="px-4 py-3 font-semibold">ความหวาน (Brix)</th>
                  <th scope="col" className="px-4 py-3 font-semibold">น้ำหนัก</th>
                  <th scope="col" className="px-4 py-3 font-semibold">อายุเก็บเกี่ยว</th>
                  <th scope="col" className="px-4 py-3 font-semibold">ลักษณะเนื้อ</th>
                  <th scope="col" className="px-5 py-3 font-semibold">สัดส่วนพื้นที่ปลูก</th>
                </tr>
              </thead>
              <tbody>
                {CULTIVARS.map((item) => (
                  <tr key={item.id} className="border-t border-outline-variant/30">
                    <th scope="row" className="px-5 py-4 text-left font-normal">
                      <span className="block text-label-lg font-bold text-on-surface">{item.name}</span>
                      <span className="block text-caption text-on-surface-variant italic">{item.code}</span>
                    </th>
                    <td className="px-4 py-4 text-title-md font-bold text-primary">
                      {item.brix[0]} – {item.brix[1]}
                    </td>
                    <td className="px-4 py-4 text-body-md text-on-surface">{item.weight}</td>
                    <td className="px-4 py-4 text-body-md text-on-surface">{item.days} วัน</td>
                    <td className="px-4 py-4 text-body-md text-on-surface-variant">{item.flesh}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Meter value={item.share * 2.5} tone="secondary" className="h-1.5 w-20" label={item.name} />
                        <span className="text-label-md font-bold text-on-surface">{item.share}%</span>
                      </div>
                    </td>
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
      </PageContainer>
    </AppShell>
  );
}
