import { useState, useEffect, useRef } from "react";
import {
  Sliders,
  Volume2,
  Mic,
  ShieldCheck,
  Check,
  X,
  Play,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import {
  getAcousticCalibration,
  saveAcousticCalibration,
  VARIETY_PROFILES,
  CalibrationSettings,
} from "@/lib/audio-analyzer";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AcousticCalibrationModal({ isOpen, onClose }: Props) {
  const [settings, setSettings] = useState<CalibrationSettings>(getAcousticCalibration());
  const [micActive, setMicActive] = useState(false);
  const [currentDb, setCurrentDb] = useState(0);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [playingSample, setPlayingSample] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(getAcousticCalibration());
    } else {
      stopMicTest();
    }
    return () => stopMicTest();
  }, [isOpen]);

  const startMicTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
        const avg = sum / buffer.length;
        const dbLevel = Math.round((avg / 255) * 80); // ~0 to 80 dB approx
        setCurrentDb(dbLevel);
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      animFrameRef.current = requestAnimationFrame(updateMeter);
      setMicActive(true);
    } catch {
      alert("ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาตรวจสอบสิทธิ์ของเบราว์เซอร์");
    }
  };

  const stopMicTest = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setMicActive(false);
    setCurrentDb(0);
  };

  const playSample = (url: string, name: string) => {
    const audio = new Audio(url);
    setPlayingSample(name);
    audio.play();
    audio.onended = () => setPlayingSample(null);
  };

  const handleSave = () => {
    saveAcousticCalibration(settings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  const currentProfile = VARIETY_PROFILES[settings.selectedVariety] || VARIETY_PROFILES["พันธุ์กินรี"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-lime-100 bg-gradient-to-r from-emerald-700 to-green-800 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold sm:text-lg">สอบเทียบโมเดล AI และปรับจูนไมโครโฟน</h2>
              <p className="text-xs text-emerald-100">Acoustic Calibration & Noise Reduction Tuning</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6 text-slate-800">
          {/* Section 1: Variety Selection */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <label className="mb-1 block text-sm font-bold text-emerald-950">
              1. เลือกสายพันธุ์แตงโมเป้าหมายสำหรับสอบเทียบ
            </label>
            <p className="mb-3 text-xs text-emerald-800">
              โมเดลจะปรับย่านความถี่เรโซแนนซ์และเกณฑ์ความหวานตามสรีรวิทยาของแต่ละสายพันธุ์
            </p>
            <select
              value={settings.selectedVariety}
              onChange={(e) => setSettings({ ...settings, selectedVariety: e.target.value })}
              className="w-full rounded-xl border border-emerald-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 shadow-2xs focus:border-emerald-600 focus:outline-hidden"
            >
              {Object.keys(VARIETY_PROFILES).map((v) => (
                <option key={v} value={v}>
                  {VARIETY_PROFILES[v].name} - ย่านสุก {VARIETY_PROFILES[v].minRipeHz}–{VARIETY_PROFILES[v].maxRipeHz} Hz (เป้าหมาย {VARIETY_PROFILES[v].targetBrix} °Bx)
                </option>
              ))}
            </select>

            <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-white/80 p-2.5 text-center text-xs">
              <div>
                <span className="text-slate-500">ย่านความถี่สุกพอดี</span>
                <p className="font-bold text-emerald-700">
                  {currentProfile.minRipeHz} – {currentProfile.maxRipeHz} Hz
                </p>
              </div>
              <div>
                <span className="text-slate-500">เกณฑ์แตงอ่อน/ดิบ</span>
                <p className="font-bold text-amber-600">&ge; {currentProfile.unripeThresholdHz} Hz</p>
              </div>
              <div>
                <span className="text-slate-500">เกณฑ์แตงสุกเกิน/ไส้ล้ม</span>
                <p className="font-bold text-rose-600">&le; {currentProfile.overripeThresholdHz} Hz</p>
              </div>
            </div>
          </div>

          {/* Section 2: Noise Reduction Filter */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  2. ตัวกรองตัดเสียงรบกวนรอบข้าง (Acoustic Bandpass 80–450 Hz)
                </p>
                <p className="text-xs text-slate-600">
                  ตัดเสียงลมพัดในแปลงปลูก (&lt;80 Hz) และเสียงผู้คนจอแจในตลาดสด (&gt;450 Hz) ก่อนประมวลผล FFT
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={settings.noiseReductionEnabled}
                  onChange={(e) => setSettings({ ...settings, noiseReductionEnabled: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-slate-300 peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-white after:bg-white after:transition-all"></div>
              </label>
            </div>
          </div>

          {/* Section 3: Live Microphone Tuning */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">3. ทดสอบระดับเสียงไมโครโฟนสด (Live Noise Floor)</p>
                <p className="text-xs text-slate-600">
                  ทดสอบเสียงเคาะแตงโมเพื่อดูความไวและการตอบสนองของไมโครโฟน
                </p>
              </div>
              <button
                type="button"
                onClick={micActive ? stopMicTest : startMicTest}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow-2xs ${
                  micActive
                    ? "bg-rose-600 text-white hover:bg-rose-700"
                    : "bg-emerald-700 text-white hover:bg-emerald-800"
                }`}
              >
                <Mic className="h-3.5 w-3.5" />
                {micActive ? "หยุดทดสอบไมค์" : "เริ่มทดสอบไมค์"}
              </button>
            </div>

            {micActive && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>ระดับเสียงปัจจุบัน: <strong>{currentDb} dB</strong></span>
                  <span className={currentDb > 55 ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"}>
                    {currentDb < 20 ? "เสียงเงียบดีมาก" : currentDb < 50 ? "ระดับปกติ เหมาะสำหรับเคาะ" : "มีเสียงรบกวนสูง"}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full transition-all duration-75 ${
                      currentDb > 55 ? "bg-rose-500" : currentDb > 35 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, (currentDb / 80) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Sensitivity Slider */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-700">
                <span>ความไวไมโครโฟน (Gain Sensitivity): <strong>{settings.microphoneSensitivity.toFixed(1)}x</strong></span>
                <span>{settings.microphoneSensitivity > 1.2 ? "ความไวสูง" : "ปกติ"}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={settings.microphoneSensitivity}
                onChange={(e) => setSettings({ ...settings, microphoneSensitivity: parseFloat(e.target.value) })}
                className="mt-1.5 w-full accent-emerald-600"
              />
            </div>
          </div>

          {/* Section 4: Real Sound Samples Verification */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-1 text-sm font-bold text-slate-900">4. ฟังตัวอย่างเสียงเคาะจริงจากห้องปฏิบัติการ</p>
            <p className="mb-3 text-xs text-slate-600">
              ทดลองฟังเสียงเคาะแตงโมจริง 3 ระดับความสุกเพื่อเทียบเคียงกับเสียงในแปลง
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => playSample("/audio/samples/ripe-sample.wav", "ripe")}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                <Play className={`h-3.5 w-3.5 ${playingSample === "ripe" ? "animate-spin text-emerald-600" : ""}`} />
                สุกพอดี (134 Hz)
              </button>
              <button
                type="button"
                onClick={() => playSample("/audio/samples/unripe-sample.wav", "unripe")}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              >
                <Play className={`h-3.5 w-3.5 ${playingSample === "unripe" ? "animate-spin text-amber-600" : ""}`} />
                ยังดิบ (178 Hz)
              </button>
              <button
                type="button"
                onClick={() => playSample("/audio/samples/overripe-sample.wav", "overripe")}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100"
              >
                <Play className={`h-3.5 w-3.5 ${playingSample === "overripe" ? "animate-spin text-rose-600" : ""}`} />
                สุกเกิน (96 Hz)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={() => {
              setSettings({
                noiseReductionEnabled: true,
                microphoneSensitivity: 1.0,
                selectedVariety: "พันธุ์กินรี",
                minSnrThresholdDb: 18,
              });
            }}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            คืนค่าเริ่มต้น
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95"
            >
              {savedSuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  บันทึกสำเร็จ!
                </>
              ) : (
                "บันทึกค่าสอบเทียบ"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
