import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Award,
  ChevronRight,
  Flame,
  HelpCircle,
  Info,
  Layers,
  MessageSquare,
  Play,
  RefreshCw,
  Sparkles,
  Trophy,
  Volume2,
  Waves,
  Zap,
} from "lucide-react";
import { useChatStore } from "@/stores/chat-store";

interface Props {
  onNavigate: (route: string) => void;
}

type WatermelonState = "ripe" | "unripe" | "overripe";

interface SimulationConfig {
  state: WatermelonState;
  title: string;
  subtitle: string;
  tag: string;
  baseFrequency: number;
  harmonics: number[];
  decayTimeSec: number;
  hollowEffect: boolean;
  sweetnessBrix: number;
  crispnessScore: number;
  hollowCorePercent: number;
  colorScheme: {
    rind: string;
    stripes: string;
    flesh: string;
    seeds: string;
    bgBadge: string;
    textBadge: string;
  };
  explanation: string;
  acousticPhysics: string;
}

const SIM_CONFIGS: Record<WatermelonState, SimulationConfig> = {
  ripe: {
    state: "ripe",
    title: "สุกพอดี หวานฉ่ำ (Ripe & Crispy)",
    subtitle: "เสียงกังวานแน่น คลื่นความถี่ทุ้มปานกลาง ไม่กลวง",
    tag: "แนะนำรับประทาน",
    baseFrequency: 134,
    harmonics: [134, 268, 402],
    decayTimeSec: 0.18,
    hollowEffect: false,
    sweetnessBrix: 12.4,
    crispnessScore: 9,
    hollowCorePercent: 2,
    colorScheme: {
      rind: "#166534",
      stripes: "#14532d",
      flesh: "#ef4444",
      seeds: "#1f2937",
      bgBadge: "bg-emerald-100 text-emerald-900 border-emerald-300",
      textBadge: "text-emerald-700",
    },
    explanation:
      "เนื้อแตงโมสะสมน้ำตาลเต็มที่ โครงสร้างผนังเซลล์อมน้ำพอดี เมื่อเคาะจะเกิดคลื่นสะท้อนความถี่ราว 125–145 Hz ที่มีความกังวานสม่ำเสมอ",
    acousticPhysics:
      "คลื่นเสียงเดินทางผ่านเนื้อทรายที่มีความหนาแน่นสม่ำเสมอ เกิดเรโซแนนซ์หลักที่ 134 Hz และฮาร์มอนิกที่สองที่ 268 Hz โดยสัญญาณลดทอนแบบ Exponential ในเวลา 180ms",
  },
  unripe: {
    state: "unripe",
    title: "ยังดิบ / อ่อนเกินไป (Unripe)",
    subtitle: "เสียงแหลมสูง ตึงแน่น ไร้การสั่นสะท้อนลึก",
    tag: "รอเก็บเกี่ยวอีก 5–7 วัน",
    baseFrequency: 178,
    harmonics: [178, 356, 534],
    decayTimeSec: 0.09,
    hollowEffect: false,
    sweetnessBrix: 8.8,
    crispnessScore: 6,
    hollowCorePercent: 0,
    colorScheme: {
      rind: "#15803d",
      stripes: "#166534",
      flesh: "#fca5a5",
      seeds: "#9ca3af",
      bgBadge: "bg-blue-100 text-blue-900 border-blue-300",
      textBadge: "text-blue-700",
    },
    explanation:
      "เซลล์เนื้อยังแน่นแข็ง เปลือกหนา น้ำตาลยังไม่ถูกสังเคราะห์เป็นโมเลกุลเดี่ยว เสียงเคาะจึงคล้ายเคาะไม้เนื้อแข็ง มีความถี่สูงกว่าปกติ",
    acousticPhysics:
      "แรงตึงผิวเปลือกสูงมาก ประกอบกับเนื้อแน่นแข็งต้านทานคลื่นความถี่ต่ำ ส่งผลให้ Resonance Shift ไปอยู่ที่ 175–190 Hz พร้อมการลดทอนเร็วมาก (Under 100ms)",
  },
  overripe: {
    state: "overripe",
    title: "สุกเกิน / ไส้ล้มแตกร่วน (Overripe & Hollow)",
    subtitle: "เสียงทุ้มต่ำและก้องกลวงสะท้อนโพรงอากาศ",
    tag: "เนื้อเริ่มร่วน / มีโพรง",
    baseFrequency: 96,
    harmonics: [96, 144, 210],
    decayTimeSec: 0.28,
    hollowEffect: true,
    sweetnessBrix: 10.2,
    crispnessScore: 3,
    hollowCorePercent: 88,
    colorScheme: {
      rind: "#14532d",
      stripes: "#052e16",
      flesh: "#991b1b",
      seeds: "#111827",
      bgBadge: "bg-rose-100 text-rose-900 border-rose-300",
      textBadge: "text-rose-700",
    },
    explanation:
      "เนื้อแตงโมเริ่มสูญเสียน้ำตาลและน้ำ เกิดโพรงอากาศแกนกลาง (Hollow Heart) เมื่อเคาะจะได้ยินเสียงทึบทุ้มต่ำพร้อมเสียงก้องโพรง",
    acousticPhysics:
      "โพรงอากาศทำหน้าที่เป็น Helmholtz Resonator ดูดซับความถี่สูงและสะท้อนความถี่ต่ำ 96 Hz ทำให้มี Reverberation ตกค้างยาวนานกว่า 280ms",
  },
};

export function WatermelonSimulatorView({ onNavigate }: Props) {
  const [selectedState, setSelectedState] = useState<WatermelonState>("ripe");
  const [tapZone, setTapZone] = useState<"equator" | "stem" | "ground">("equator");
  const [knockCount, setKnockCount] = useState(0);
  const [knockHistory, setKnockHistory] = useState<number[]>([]);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [showCrossSection, setShowCrossSection] = useState(false);

  // Blind test mini-game mode
  const [blindMode, setBlindMode] = useState(false);
  const [blindTarget, setBlindTarget] = useState<WatermelonState>("ripe");
  const [blindScore, setBlindScore] = useState(0);
  const [blindRounds, setBlindRounds] = useState(0);
  const [blindResult, setBlindResult] = useState<"correct" | "incorrect" | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const currentConfig = blindMode ? SIM_CONFIGS[blindTarget] : SIM_CONFIGS[selectedState];

  // Initialize or get AudioContext
  function getAudioContext(): AudioContext {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }

  // Synthesize watermelon acoustic knock sound
  function playWatermelonKnock(config: SimulationConfig, zone: "equator" | "stem" | "ground") {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Adjust frequency based on hit zone: stem is higher pitched, ground is softer
      let freqOffset = 0;
      if (zone === "stem") freqOffset = 18;
      if (zone === "ground") freqOffset = -8;

      const baseFreq = config.baseFrequency + freqOffset;

      // Master gain node
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.7, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + config.decayTimeSec + 0.1);
      masterGain.connect(ctx.destination);

      // Low pass filter to simulate acoustic melon rind damping
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(zone === "stem" ? 1400 : 900, now);
      filter.Q.setValueAtTime(config.hollowEffect ? 6.0 : 3.5, now);
      filter.connect(masterGain);

      // 1. Primary resonant oscillator (fundamental thud)
      const osc1 = ctx.createOscillator();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(baseFreq * 1.25, now);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.04);

      const oscGain1 = ctx.createGain();
      oscGain1.gain.setValueAtTime(0.9, now);
      oscGain1.gain.exponentialRampToValueAtTime(0.01, now + config.decayTimeSec);
      osc1.connect(oscGain1);
      oscGain1.connect(filter);

      osc1.start(now);
      osc1.stop(now + config.decayTimeSec + 0.05);

      // 2. Secondary Harmonic
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(baseFreq * 2.1, now);
      const oscGain2 = ctx.createGain();
      oscGain2.gain.setValueAtTime(0.35, now);
      oscGain2.gain.exponentialRampToValueAtTime(0.001, now + config.decayTimeSec * 0.7);
      osc2.connect(oscGain2);
      oscGain2.connect(filter);
      osc2.start(now);
      osc2.stop(now + config.decayTimeSec * 0.7);

      // 3. Noise impulse (the physical knuckle impact click)
      const bufferSize = ctx.sampleRate * 0.02; // 20ms
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.004));
      }
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      noiseNode.connect(noiseGain);
      noiseGain.connect(filter);
      noiseNode.start(now);

      // 4. If hollow effect (overripe), add secondary delayed resonance
      if (config.hollowEffect) {
        const oscHollow = ctx.createOscillator();
        oscHollow.type = "sine";
        oscHollow.frequency.setValueAtTime(74, now + 0.04);
        const hollowGain = ctx.createGain();
        hollowGain.gain.setValueAtTime(0.001, now);
        hollowGain.gain.setValueAtTime(0.4, now + 0.04);
        hollowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        oscHollow.connect(hollowGain);
        hollowGain.connect(masterGain);
        oscHollow.start(now + 0.04);
        oscHollow.stop(now + 0.32);
      }

      // Trigger visual wave animation on canvas
      drawImpulseWave(baseFreq, config.decayTimeSec);
    } catch {
      // Audio playback blocked or unavailable
    }
  }

  // Draw acoustic waveform trace on canvas
  function drawImpulseWave(freq: number, decay: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Background grid
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Waveform line
    ctx.beginPath();
    ctx.strokeStyle =
      currentConfig.state === "ripe"
        ? "#16a34a"
        : currentConfig.state === "unripe"
        ? "#2563eb"
        : "#e11d48";
    ctx.lineWidth = 2.5;

    const points = 160;
    for (let i = 0; i < points; i++) {
      const t = (i / points) * decay * 4;
      const decayEnvelope = Math.exp(-t / (decay * 1.5));
      const amplitude = Math.sin(t * freq * 0.05) * decayEnvelope * (height * 0.38);
      const x = (i / points) * width;
      const y = height / 2 - amplitude;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Frequency peak label
    ctx.fillStyle = "#475569";
    ctx.font = "bold 11px monospace";
    ctx.fillText(`Peak: ${freq} Hz | Decay: ${Math.round(decay * 1000)}ms`, 12, 18);
  }

  // Handle user tap on watermelon
  function handleWatermelonTap(zone: "equator" | "stem" | "ground") {
    setTapZone(zone);
    setIsSynthesizing(true);
    setTimeout(() => setIsSynthesizing(false), 250);

    playWatermelonKnock(currentConfig, zone);

    setKnockCount((prev) => prev + 1);
    setKnockHistory((prev) => [...prev.slice(-7), Date.now()]);
  }

  // Start blind test round
  function startBlindRound() {
    const states: WatermelonState[] = ["ripe", "unripe", "overripe"];
    const randomChoice = states[Math.floor(Math.random() * states.length)];
    setBlindTarget(randomChoice);
    setBlindResult(null);
  }

  function handleBlindAnswer(answer: WatermelonState) {
    const isCorrect = answer === blindTarget;
    setBlindRounds((r) => r + 1);
    if (isCorrect) setBlindScore((s) => s + 1);
    setBlindResult(isCorrect ? "correct" : "incorrect");
  }

  // Send current simulator scenario to AI Chat
  function handleSendToChat() {
    useChatStore.getState().setMode("knock-analysis");
    useChatStore
      .getState()
      .setDraftText(
        `ฉันได้ทดสอบเคาะแตงโมในเครื่องจำลอง: เสียงที่เคาะมีความถี่ ${currentConfig.baseFrequency} Hz (${currentConfig.title}) ช่วยวิเคราะห์เชิงลึกว่าควรผ่ารับประทานหรือไม่ พร้อมเทคนิคการเก็บรักษา`
      );
    onNavigate("/chat");
  }

  useEffect(() => {
    // Initial draw
    drawImpulseWave(currentConfig.baseFrequency, currentConfig.decayTimeSec);
  }, [selectedState, blindTarget, blindMode]);

  return (
    <div className="min-h-screen bg-[#FFFDF7] text-gray-900 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-lime-200/80 bg-white/90 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate("/chat")}
              className="flex items-center gap-1.5 rounded-xl border border-lime-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-lime-50 transition-colors cursor-pointer"
            >
              <ArrowLeft size={15} />
              <span>กลับสู่แชท</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">🍉</span>
              <h1 className="font-extrabold text-green-950 text-base sm:text-lg">
                เครื่องจำลองเคาะแตงโมเสมือนจริง (Acoustic Simulator)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!blindMode) {
                  setBlindMode(true);
                  startBlindRound();
                } else {
                  setBlindMode(false);
                }
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer shadow-2xs ${
                blindMode
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300"
              }`}
            >
              <Trophy size={14} />
              <span>{blindMode ? "ออกจากเกมทายเสียง" : "เกมทดสอบหู (Blind Test)"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 space-y-6">
        {/* Blind Test Banner if active */}
        {blindMode && (
          <div className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-900 uppercase">
                  Mini-Game
                </span>
                <h2 className="text-lg font-extrabold text-amber-950 mt-1">
                  ทายความสุกของแตงโมลูกนี้จากเสียงเคาะ!
                </h2>
                <p className="text-xs text-amber-800">
                  คลิกเคาะที่แตงโมด้านล่างเพื่อฟังเสียง จากนั้นเลือกทายว่าลูกนี้อยู่ในสภาพใด
                </p>
              </div>

              <div className="flex items-center gap-4 text-center">
                <div className="rounded-2xl bg-white px-4 py-2 border border-amber-200 shadow-2xs">
                  <span className="text-[10px] text-gray-500 block">คะแนนของคุณ</span>
                  <span className="text-xl font-black text-amber-900 tabular-nums">
                    {blindScore} / {blindRounds}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={startBlindRound}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 shadow-xs cursor-pointer"
                >
                  <RefreshCw size={14} />
                  <span>สุ่มแตงโมลูกถัดไป</span>
                </button>
              </div>
            </div>

            {/* Answer Options */}
            <div className="mt-4 pt-4 border-t border-amber-200/80">
              <span className="text-xs font-bold text-amber-900 block mb-2">
                เลือกคำตอบของคุณ:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleBlindAnswer("ripe")}
                  disabled={blindResult !== null}
                  className="rounded-2xl border border-emerald-300 bg-white p-3 text-left hover:bg-emerald-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <strong className="block text-sm text-emerald-950">🍉 สุกพอดี หวานฉ่ำ</strong>
                  <span className="text-[11px] text-gray-500">เสียงกังวานแน่น (~134 Hz)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBlindAnswer("unripe")}
                  disabled={blindResult !== null}
                  className="rounded-2xl border border-blue-300 bg-white p-3 text-left hover:bg-blue-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <strong className="block text-sm text-blue-950">🌱 ยังดิบ / อ่อนเกิน</strong>
                  <span className="text-[11px] text-gray-500">เสียงแหลมสูง ตึงแน่น (~178 Hz)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBlindAnswer("overripe")}
                  disabled={blindResult !== null}
                  className="rounded-2xl border border-rose-300 bg-white p-3 text-left hover:bg-rose-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <strong className="block text-sm text-rose-950">⚠️ สุกเกิน / ไส้กลวง</strong>
                  <span className="text-[11px] text-gray-500">เสียงทุ้มก้องโพรงอากาศ (~96 Hz)</span>
                </button>
              </div>

              {blindResult && (
                <div
                  className={`mt-3 rounded-2xl p-3 text-xs flex items-center justify-between ${
                    blindResult === "correct"
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      : "bg-rose-100 text-rose-900 border border-rose-300"
                  }`}
                >
                  <span className="font-bold">
                    {blindResult === "correct"
                      ? "🎉 ยอดเยี่ยม! ทายถูกต้อง เสียงนี้คือ: " + currentConfig.title
                      : "❌ ยังไม่ถูกต้อง แตงโมลูกนี้คือ: " + currentConfig.title}
                  </span>
                  <button
                    type="button"
                    onClick={startBlindRound}
                    className="underline font-bold ml-2 cursor-pointer"
                  >
                    เล่นข้อต่อไป →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Condition Selector Tabs (if not in blind mode) */}
        {!blindMode && (
          <section className="rounded-3xl border border-lime-200 bg-white p-2 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(["ripe", "unripe", "overripe"] as WatermelonState[]).map((st) => {
                const conf = SIM_CONFIGS[st];
                const active = selectedState === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedState(st)}
                    className={`rounded-2xl p-3 text-left transition-all cursor-pointer ${
                      active
                        ? "bg-linear-to-b from-green-50 to-lime-50 border-2 border-green-600 shadow-xs"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">
                        {st === "ripe" ? "🍉" : st === "unripe" ? "🌱" : "⚠️"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${conf.colorScheme.bgBadge}`}
                      >
                        {conf.tag}
                      </span>
                    </div>
                    <strong className="mt-1 block text-sm font-bold text-gray-900">
                      {conf.title}
                    </strong>
                    <span className="text-[11px] text-gray-500 font-mono block">
                      ความถี่เด่น: ~{conf.baseFrequency} Hz
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Interactive Watermelon Visualizer & Tapping Stage */}
        <section className="grid gap-6 lg:grid-cols-12">
          {/* Left Canvas & SVG Tapper Stage */}
          <div className="lg:col-span-7 rounded-3xl border border-lime-200 bg-linear-to-b from-emerald-900/5 to-lime-100/30 p-6 flex flex-col items-center justify-between text-center relative overflow-hidden">
            {/* Tap instruction header */}
            <div className="w-full flex items-center justify-between text-xs text-gray-600 mb-2">
              <span className="font-semibold flex items-center gap-1.5">
                <Volume2 size={15} className="text-green-700" />
                <span>แตะ/คลิกบนตัวแตงโมเพื่อเคาะฟังเสียงจริง</span>
              </span>

              <button
                type="button"
                onClick={() => setShowCrossSection(!showCrossSection)}
                className="flex items-center gap-1 text-green-800 font-semibold hover:underline cursor-pointer"
              >
                <Layers size={14} />
                <span>{showCrossSection ? "ดูเปลือกนอก" : "ดูภาพตัดขวางเนื้อใน"}</span>
              </button>
            </div>

            {/* Interactive SVG Watermelon */}
            <div className="my-4 relative select-none cursor-pointer flex justify-center items-center w-full max-w-sm">
              <div
                className={`relative transition-transform duration-100 ${
                  isSynthesizing ? "scale-98" : "hover:scale-[1.01]"
                }`}
              >
                {/* SVG Watermelon */}
                <svg
                  width="320"
                  height="240"
                  viewBox="0 0 320 240"
                  className="drop-shadow-xl"
                  onClick={() => handleWatermelonTap("equator")}
                >
                  {!showCrossSection ? (
                    // External Rind View
                    <g>
                      {/* Base Melon Oval */}
                      <ellipse
                        cx="160"
                        cy="120"
                        rx="135"
                        ry="95"
                        fill={currentConfig.colorScheme.rind}
                        stroke="#0f3b1e"
                        strokeWidth="3"
                      />

                      {/* Dark Green Stripes */}
                      <path
                        d="M 60 120 Q 160 85 260 120"
                        stroke={currentConfig.colorScheme.stripes}
                        strokeWidth="14"
                        fill="none"
                        opacity="0.85"
                      />
                      <path
                        d="M 80 80 Q 160 50 240 80"
                        stroke={currentConfig.colorScheme.stripes}
                        strokeWidth="12"
                        fill="none"
                        opacity="0.85"
                      />
                      <path
                        d="M 80 160 Q 160 190 240 160"
                        stroke={currentConfig.colorScheme.stripes}
                        strokeWidth="12"
                        fill="none"
                        opacity="0.85"
                      />

                      {/* Ground Spot (Yellowish Belly) */}
                      <ellipse
                        cx="110"
                        cy="165"
                        rx="35"
                        ry="20"
                        fill="#fef08a"
                        opacity="0.65"
                        filter="blur(4px)"
                      />

                      {/* Melon Stem */}
                      <path
                        d="M 290 120 Q 315 110 320 95"
                        stroke="#854d0e"
                        strokeWidth="6"
                        fill="none"
                        strokeLinecap="round"
                      />

                      {/* Ripple visual wave when tapped */}
                      {isSynthesizing && (
                        <ellipse
                          cx="160"
                          cy="120"
                          rx="130"
                          ry="90"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="4"
                          opacity="0.8"
                          className="animate-ping"
                        />
                      )}
                    </g>
                  ) : (
                    // Cross-Section Internal Flesh View
                    <g>
                      {/* Rind Outer Ring */}
                      <ellipse
                        cx="160"
                        cy="120"
                        rx="135"
                        ry="95"
                        fill="#15803d"
                        stroke="#0f3b1e"
                        strokeWidth="2"
                      />
                      {/* White Albedo Layer */}
                      <ellipse
                        cx="160"
                        cy="120"
                        rx="126"
                        ry="88"
                        fill="#f0fdf4"
                      />
                      {/* Red Edible Flesh */}
                      <ellipse
                        cx="160"
                        cy="120"
                        rx="118"
                        ry="82"
                        fill={currentConfig.colorScheme.flesh}
                      />

                      {/* Seeds */}
                      {[
                        [120, 100],
                        [140, 80],
                        [180, 80],
                        [200, 100],
                        [120, 140],
                        [140, 160],
                        [180, 160],
                        [200, 140],
                      ].map(([sx, sy], idx) => (
                        <ellipse
                          key={idx}
                          cx={sx}
                          cy={sy}
                          rx="4"
                          ry="2.5"
                          fill={currentConfig.colorScheme.seeds}
                          transform={`rotate(${idx * 45} ${sx} ${sy})`}
                        />
                      ))}

                      {/* Hollow Core Cavity (if overripe) */}
                      {currentConfig.hollowEffect && (
                        <g>
                          <path
                            d="M 145 115 Q 160 100 175 115 Q 185 125 170 135 Q 155 130 145 115 Z"
                            fill="#450a0a"
                            stroke="#7f1d1d"
                            strokeWidth="2"
                          />
                          <text
                            x="160"
                            y="125"
                            fill="#fca5a5"
                            fontSize="8"
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            ไส้แตก/โพรงกลวง
                          </text>
                        </g>
                      )}
                    </g>
                  )}
                </svg>

                {/* Clickable Touch Target Badges */}
                <div className="absolute top-2 right-12">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWatermelonTap("stem");
                    }}
                    className="rounded-full bg-white/90 border border-green-700/40 px-2 py-0.5 text-[10px] font-bold text-green-900 shadow-2xs hover:bg-green-100 cursor-pointer"
                  >
                    เคาะขั้ว
                  </button>
                </div>

                <div className="absolute bottom-2 left-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWatermelonTap("ground");
                    }}
                    className="rounded-full bg-white/90 border border-amber-700/40 px-2 py-0.5 text-[10px] font-bold text-amber-900 shadow-2xs hover:bg-amber-100 cursor-pointer"
                  >
                    เคาะก้นนอนดิน
                  </button>
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <span className="rounded-full bg-black/40 text-white px-3 py-1 text-xs font-semibold backdrop-blur-xs flex items-center gap-1 shadow-md">
                    <span>👋 แตะเคาะกึ่งกลางผล</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Tap counter and quick replay */}
            <div className="w-full flex items-center justify-between text-xs pt-3 border-t border-lime-200/80">
              <span className="text-gray-500 font-mono">
                เคาะแล้วทั้งหมด: <strong className="text-gray-900">{knockCount} ครั้ง</strong>
              </span>

              <button
                type="button"
                onClick={() => handleWatermelonTap("equator")}
                className="flex items-center gap-1.5 rounded-xl bg-green-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-800 transition-colors shadow-2xs cursor-pointer"
              >
                <Play size={13} fill="white" />
                <span>จำลองเสียงเคาะ 1 ครั้ง</span>
              </button>
            </div>
          </div>

          {/* Right Live Acoustic Spectrum & Diagnostics */}
          <div className="lg:col-span-5 space-y-4">
            {/* Live Oscilloscope Canvas */}
            <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Waves size={15} className="text-blue-600" />
                  <span>คลื่นสัญญาณเสียงเคาะ (Oscilloscope)</span>
                </span>
                <span className="font-mono text-[11px] text-slate-400">Real-time WebAudio</span>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-900/5 p-2 flex justify-center">
                <canvas
                  ref={canvasRef}
                  width="360"
                  height="120"
                  className="w-full h-28 rounded-xl bg-white"
                />
              </div>
            </article>

            {/* AI Diagnosis Prediction Card */}
            <article className="rounded-3xl border border-lime-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  ผลการประเมินจากโมเดล AI
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${currentConfig.colorScheme.bgBadge}`}
                >
                  {currentConfig.tag}
                </span>
              </div>

              <h3 className="mt-1 text-xl font-extrabold text-gray-900">
                {currentConfig.title}
              </h3>
              <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                {currentConfig.explanation}
              </p>

              {/* Physical breakdown metrics */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-lime-50 p-2.5 border border-lime-100">
                  <span className="text-[10px] text-gray-500 block">ความหวานคาดการณ์</span>
                  <strong className="text-base font-extrabold text-green-950 font-mono">
                    {currentConfig.sweetnessBrix} °Bx
                  </strong>
                </div>

                <div className="rounded-xl bg-lime-50 p-2.5 border border-lime-100">
                  <span className="text-[10px] text-gray-500 block">ดัชนีความกรอบ</span>
                  <strong className="text-base font-extrabold text-green-950 font-mono">
                    {currentConfig.crispnessScore} / 10
                  </strong>
                </div>

                <div className="rounded-xl bg-lime-50 p-2.5 border border-lime-100">
                  <span className="text-[10px] text-gray-500 block">โอกาสไส้กลวง</span>
                  <strong
                    className={`text-base font-extrabold font-mono ${
                      currentConfig.hollowCorePercent > 50
                        ? "text-rose-700"
                        : "text-emerald-700"
                    }`}
                  >
                    {currentConfig.hollowCorePercent}%
                  </strong>
                </div>
              </div>

              {/* Acoustic physics note */}
              <div className="mt-3 rounded-2xl bg-amber-50/70 p-3 text-xs text-amber-950 border border-amber-200/60 leading-5">
                <span className="font-bold block mb-0.5 flex items-center gap-1">
                  <Info size={13} className="text-amber-700" />
                  <span>หลักการอะคูสติกส์:</span>
                </span>
                {currentConfig.acousticPhysics}
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={handleSendToChat}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-green-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-green-800 transition-colors shadow-xs cursor-pointer"
                >
                  <MessageSquare size={15} />
                  <span>คุยกับ AI เกี่ยวกับเสียงนี้</span>
                </button>
              </div>
            </article>
          </div>
        </section>

        {/* Educational Guide: How to tap watermelon properly */}
        <section className="rounded-3xl border border-lime-200 bg-white p-6 shadow-xs">
          <h3 className="font-extrabold text-green-950 text-base mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            <span>เทคนิคการเคาะแตงโมตามหลักการเกษตรแม่นยำ (Acoustic Knock Guide)</span>
          </h3>

          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <strong className="block text-sm text-slate-900 mb-1">
                1. ใช้นิ้วชี้หรือข้อนิ้วเคาะ 3–5 ครั้ง
              </strong>
              <p className="text-gray-600 leading-5">
                เคาะบริเวณแนวเส้นศูนย์สูตร (กึ่งกลางผล) ด้วยแรงสม่ำเสมอ ห่างกันประมาณ 0.5 วินาที
                เพื่อให้ AI สามารถตรวจจับจังหวะ Resonance Decay ได้แม่นยำ
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <strong className="block text-sm text-slate-900 mb-1">
                2. ถือไมโครโฟนห่าง 5–10 ซม.
              </strong>
              <p className="text-gray-600 leading-5">
                หลีกเลี่ยงการเคาะใกล้พัดลมหรือบริเวณที่มีเสียงจอแจในตลาดสด
                เพื่อให้ค่าอัตราส่วนสัญญาณต่อสัญญาณรบกวน (SNR) สูงกว่า 20 dB
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <strong className="block text-sm text-slate-900 mb-1">
                3. สังเกตจุดนอนดินร่วมด้วย
              </strong>
              <p className="text-gray-600 leading-5">
                แตงโมที่สุกจัด นอกจากเสียงเคาะความถี่ 120–145 Hz แล้ว จุดนอนดิน (Ground Spot)
                ควรเปลี่ยนเป็นสีเหลืองนวลหรือสีครีม ขั้วเหี่ยวแห้งเล็กน้อย
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
