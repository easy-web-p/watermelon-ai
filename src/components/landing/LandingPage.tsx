import { useState, useRef } from "react";
import {
  AudioWaveform,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Flame,
  FlaskConical,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Layers,
  Lock,
  MessageCircle,
  Play,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Volume2,
  Waves,
  Zap,
} from "lucide-react";
import { useChatStore } from "@/stores/chat-store";
import { useAuthStore } from "@/stores/auth-store";

interface LandingPageProps {
  onNavigate: (route: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  const { currentUser } = useAuthStore();
  const isAdminOrSuper = currentUser.role === "admin" || currentUser.role === "super_admin";

  const iosUrl =
    (typeof window !== "undefined" &&
      (window as unknown as { ENV?: { NEXT_PUBLIC_IOS_APP_URL?: string } }).ENV
        ?.NEXT_PUBLIC_IOS_APP_URL) ||
    "https://apps.apple.com/";

  const androidUrl =
    (typeof window !== "undefined" &&
      (window as unknown as { ENV?: { NEXT_PUBLIC_ANDROID_APP_URL?: string } }).ENV
        ?.NEXT_PUBLIC_ANDROID_APP_URL) ||
    "https://play.google.com/store/";

  // In-page Interactive Acoustic Knock Simulator state
  const [activeMelonState, setActiveMelonState] = useState<"ripe" | "unripe" | "overripe">("ripe");
  const [isKnocking, setIsKnocking] = useState(false);
  const [knockCount, setKnockCount] = useState(0);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);

  function getAudioContext(): AudioContext {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }

  // Synthesize realistic acoustic watermelon knock
  function playMelonKnock(type: "ripe" | "unripe" | "overripe") {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const baseFreq = type === "ripe" ? 134 : type === "unripe" ? 178 : 96;
      const decay = type === "ripe" ? 0.18 : type === "unripe" ? 0.09 : 0.28;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.7, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + decay + 0.08);
      masterGain.connect(ctx.destination);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(type === "unripe" ? 1200 : 850, now);
      filter.connect(masterGain);

      // Main resonant impact
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(baseFreq * 1.25, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.04);
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.85, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + decay);
      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start(now);
      osc.stop(now + decay + 0.05);

      // Noise click
      const bufferSize = ctx.sampleRate * 0.015;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.003));
      }
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.2, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      noiseNode.connect(noiseGain);
      noiseGain.connect(filter);
      noiseNode.start(now);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  function handleTapWatermelon() {
    setIsKnocking(true);
    setKnockCount((c) => c + 1);
    playMelonKnock(activeMelonState);
    setTimeout(() => setIsKnocking(false), 200);
  }

  // Smooth scroll helper
  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  // Quick use prompt helper
  function handleUsePromptOnPage(promptText: string, id: string) {
    useChatStore.getState().setDraftText(promptText);
    useChatStore.getState().setMode("general");
    setCopiedPromptId(id);
    setTimeout(() => {
      onNavigate("/chat");
    }, 400);
  }

  return (
    <div className="min-h-screen bg-[#FFFBEF] text-gray-900 selection:bg-lime-200">
      {/* Top Header - Streamlined Navbar with only requested buttons */}
      <header className="sticky top-0 z-40 border-b border-lime-200/80 bg-[#FFFBEF]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
          {/* Brand Logo */}
          <button
            onClick={() => onNavigate("/")}
            className="flex items-center gap-2.5 text-left text-lg sm:text-xl font-bold text-green-950 cursor-pointer"
          >
            <span className="grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-2xl bg-lime-300 text-2xl shadow-xs">
              🍉
            </span>
            <div>
              <span className="block leading-tight font-extrabold">แตงโม AI</span>
              <span className="block text-[10px] sm:text-[11px] font-normal text-green-700">
                Acoustic Ripeness Intelligence
              </span>
            </div>
          </button>

          {/* Core Navigation - Clean 4 Items Requested by User */}
          <nav className="flex items-center gap-4 sm:gap-7 text-sm font-semibold text-green-950/80">
            <button
              onClick={() => onNavigate("/chat")}
              className="hover:text-green-800 transition-colors cursor-pointer py-1"
            >
              ระบบแชท
            </button>
            <button
              onClick={() => scrollToSection("knowledge-center")}
              className="hover:text-green-800 transition-colors cursor-pointer py-1"
            >
              ศูนย์ความรู้
            </button>
            <button
              onClick={() => scrollToSection("prompts-catalog")}
              className="hover:text-green-800 transition-colors cursor-pointer py-1"
            >
              ชุดคำสั่ง
            </button>
            <button
              onClick={() => scrollToSection("privacy-pdpa")}
              className="hover:text-green-800 transition-colors cursor-pointer py-1"
            >
              ความเป็นส่วนตัว
            </button>

            {isAdminOrSuper && (
              <button
                onClick={() => onNavigate("/admin")}
                className="hidden lg:inline-flex text-xs bg-lime-100 text-green-900 px-3 py-1 rounded-full font-semibold border border-lime-200 hover:bg-lime-200 transition-colors cursor-pointer"
              >
                Admin
              </button>
            )}
          </nav>

          {/* Primary CTA */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate("/chat")}
              className="rounded-2xl bg-green-700 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-green-800 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>เริ่มแชท</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* 1. Hero Section */}
      <section className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 pt-10 pb-16 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-7">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 border border-pink-200 px-4 py-1.5 text-xs sm:text-sm font-semibold text-pink-800 shadow-2xs">
            <span>🍉</span>
            <span>AI ที่ตั้งใจฟังแตงโม วิเคราะห์ความสุกด้วยเสียงเคาะ</span>
          </span>

          <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight text-green-950 leading-[1.15]">
            เคาะ ส่งเสียง
            <br />
            <span className="text-green-700">แล้วคุยกับ AI ได้เลย</span>
          </h1>

          <p className="mt-5 max-w-xl text-base sm:text-lg leading-8 text-gray-700">
            ระบบแชท AI อัจฉริยะสำหรับตรวจจับคลื่นเสียงเคาะแตงโม
            รับรูปภาพตรวจรอยแต้มดิน แปลงเสียงพูดเป็นข้อความ
            และปกป้องข้อมูลของคุณตามมาตรฐาน PDPA แบบ Opt-in 100%
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap gap-3 items-center">
            <button
              onClick={() => onNavigate("/chat")}
              className="rounded-2xl bg-green-700 px-6 py-3.5 text-base font-bold text-white shadow-md hover:bg-green-800 transition-all flex items-center gap-2 cursor-pointer"
            >
              <MessageCircle size={19} />
              <span>เข้าสู่ห้องแชท AI</span>
            </button>

            <button
              onClick={() => onNavigate("/disease")}
              className="rounded-2xl border border-rose-300 bg-rose-50 px-5 py-3.5 text-sm font-bold text-rose-950 shadow-2xs hover:bg-rose-100 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <ShieldAlert size={17} className="text-rose-700" />
              <span>AI ตรวจโรคพืชแตงโม 🌿</span>
            </button>

            <button
              onClick={() => scrollToSection("interactive-simulator")}
              className="rounded-2xl border border-cyan-800/30 bg-cyan-50 px-5 py-3.5 text-sm font-bold text-cyan-950 shadow-2xs hover:bg-cyan-100 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Waves size={17} className="text-cyan-700" />
              <span>ลองเคาะฟังเสียงในหน้านี้</span>
            </button>

            <a
              href={iosUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-green-800/20 bg-white px-4 py-3.5 text-sm font-semibold text-green-900 shadow-2xs hover:bg-lime-50 transition-colors flex items-center gap-2"
            >
              <Smartphone size={17} className="text-green-700" />
              <span>iOS</span>
            </a>

            <a
              href={androidUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-green-800/20 bg-white px-4 py-3.5 text-sm font-semibold text-green-900 shadow-2xs hover:bg-lime-50 transition-colors flex items-center gap-2"
            >
              <Download size={17} className="text-green-700" />
              <span>Android</span>
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-5 text-xs text-gray-500">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={16} className="text-emerald-600" />
              ความแม่นยำทางอะคูสติกส์ 94.6%
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck size={16} className="text-emerald-600" />
              ไม่นำข้อมูลไปเทรน AI โดยไม่ได้รับอนุญาต
            </span>
          </div>
        </div>

        {/* Hero Interactive Mockup Card */}
        <div className="lg:col-span-5">
          <div className="rounded-[36px] bg-linear-to-b from-green-800 to-green-950 p-6 text-white shadow-2xl border-4 border-lime-200/50">
            <div className="flex items-center justify-between pb-3 border-b border-green-700/60 text-xs text-green-200">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400 inline-block" />
                <span className="h-3 w-3 rounded-full bg-amber-400 inline-block" />
                <span className="h-3 w-3 rounded-full bg-green-400 inline-block" />
                <span className="font-semibold text-white ml-1">ตรวจจับเสียงเคาะสด</span>
              </div>
              <span className="font-mono tabular-nums bg-green-900/80 px-2 py-0.5 rounded-lg border border-green-700">
                134 Hz
              </span>
            </div>

            <div className="mt-4 rounded-3xl bg-white p-5 text-gray-800 shadow-inner">
              <div className="rounded-2xl bg-green-700 p-4 text-white text-sm shadow-xs flex items-center gap-2.5">
                <AudioWaveform size={20} className="shrink-0 animate-pulse text-lime-300" />
                <span>วิเคราะห์เสียงเคาะแตงโมลูกนี้ให้หน่อย (พันธุ์กินรี)</span>
              </div>

              <div className="mt-4 rounded-2xl bg-lime-50/90 border border-lime-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-green-950 text-sm flex items-center gap-1.5">
                    <Sparkles size={16} className="text-green-700" />
                    <span>น้องแตงโม AI: ผลการประเมิน</span>
                  </p>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-bold font-mono">
                    94.6%
                  </span>
                </div>

                {/* Animated Waveform Simulation */}
                <div className="mt-3 flex h-12 items-center justify-between gap-1 rounded-xl bg-lime-200/70 px-4 py-2">
                  {[24, 48, 85, 32, 95, 60, 40, 100, 75, 45, 90, 50, 30, 80, 55, 35].map(
                    (height, i) => (
                      <div
                        key={i}
                        className="w-1.5 rounded-full bg-green-700 transition-all duration-300"
                        style={{ height: `${height}%` }}
                      />
                    )
                  )}
                </div>

                <div className="mt-3 text-xs leading-5 text-gray-700">
                  <p className="font-bold text-emerald-800 text-sm">
                    🍉 สุกพอดี หวานฉ่ำ (Ripe & Crispy)
                  </p>
                  <p className="mt-0.5 text-gray-600">
                    คลื่นความถี่หลัก 134 Hz · ค่าความหวานคาดการณ์ 12.4 °Brix
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigate("/chat")}
                className="mt-4 w-full rounded-2xl bg-green-800 py-3 text-xs font-bold text-white hover:bg-green-900 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <MessageCircle size={15} />
                <span>ทดลองส่งเสียงเคาะของตัวเองในแชท →</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Embedded Interactive Acoustic Knock Simulator Section */}
      <section id="interactive-simulator" className="mx-auto max-w-7xl px-4 sm:px-6 py-12 scroll-mt-20">
        <div className="rounded-3xl border border-cyan-200 bg-linear-to-b from-cyan-50/70 via-white to-lime-50/40 p-6 sm:p-10 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-200/80 pb-6 mb-8">
            <div>
              <span className="rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300 px-3 py-0.5 text-xs font-bold uppercase tracking-wider">
                Interactive Simulator
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-green-950">
                เครื่องจำลองเคาะแตงโมเสมือนจริง (ลองแตะเคาะฟังเสียงได้ทันที)
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                ทดสอบฟังความแตกต่างของเสียงเคาะจริงด้วย Web Audio API สังเคราะห์คลื่นสะท้อนตามหลักการสั่นพ้อง
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("/simulator")}
              className="self-start md:self-auto flex items-center gap-1.5 rounded-2xl bg-cyan-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-cyan-800 transition-colors shadow-xs cursor-pointer"
            >
              <Waves size={15} />
              <span>เปิดโหมดห้องทดลองเต็มจอ (Full Simulator)</span>
            </button>
          </div>

          {/* Simulator Content Controls & Melon */}
          <div className="grid gap-8 lg:grid-cols-12 items-center">
            {/* Left Selector Tabs */}
            <div className="lg:col-span-4 space-y-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                เลือกระดับความสุกเพื่อทดสอบ:
              </span>

              {[
                {
                  state: "ripe" as const,
                  icon: "🍉",
                  title: "สุกพอดี หวานฉ่ำ (Ripe)",
                  freq: "134 Hz",
                  brix: "12.4 °Bx",
                  note: "เสียงกังวานแน่น คลื่นสะท้อนทุ้มปานกลาง ไม่กลวง",
                  tag: "bg-emerald-100 text-emerald-900 border-emerald-300",
                },
                {
                  state: "unripe" as const,
                  icon: "🌱",
                  title: "ยังดิบ / อ่อนเกินไป (Unripe)",
                  freq: "178 Hz",
                  brix: "8.8 °Bx",
                  note: "เสียงแหลมสูง ตึงแน่น ไร้การสั่นสะท้อนลึก",
                  tag: "bg-blue-100 text-blue-900 border-blue-300",
                },
                {
                  state: "overripe" as const,
                  icon: "⚠️",
                  title: "สุกเกิน / ไส้ล้มแตกร่วน (Overripe)",
                  freq: "96 Hz",
                  brix: "10.2 °Bx",
                  note: "เสียงทุ้มต่ำและก้องกลวงสะท้อนโพรงอากาศ (Helmholtz)",
                  tag: "bg-rose-100 text-rose-900 border-rose-300",
                },
              ].map((item) => {
                const isSelected = activeMelonState === item.state;
                return (
                  <button
                    key={item.state}
                    type="button"
                    onClick={() => {
                      setActiveMelonState(item.state);
                      playMelonKnock(item.state);
                    }}
                    className={`w-full rounded-2xl p-4 text-left transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-white border-green-600 shadow-md ring-2 ring-green-600/20"
                        : "bg-white/80 border-gray-200 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{item.icon}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${item.tag}`}
                      >
                        {item.freq}
                      </span>
                    </div>
                    <strong className="block text-sm font-bold text-gray-900 mt-1">
                      {item.title}
                    </strong>
                    <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>
                  </button>
                );
              })}
            </div>

            {/* Center Interactive Melon Tapper */}
            <div className="lg:col-span-8 flex flex-col items-center justify-center p-6 bg-linear-to-b from-emerald-950/5 to-cyan-50/50 rounded-3xl border border-lime-200 text-center">
              <span className="text-xs text-gray-500 font-semibold mb-2 flex items-center gap-1.5">
                <Volume2 size={16} className="text-green-700" />
                <span>คลิกหรือแตะที่แตงโมด้านล่างเพื่อเคาะฟังเสียง</span>
              </span>

              {/* Tappable SVG Melon */}
              <div
                onClick={handleTapWatermelon}
                className={`relative cursor-pointer transition-transform duration-100 my-4 select-none ${
                  isKnocking ? "scale-95" : "hover:scale-105"
                }`}
              >
                <svg width="280" height="200" viewBox="0 0 280 200" className="drop-shadow-lg">
                  <ellipse
                    cx="140"
                    cy="100"
                    rx="120"
                    ry="80"
                    fill={activeMelonState === "unripe" ? "#15803d" : "#166534"}
                    stroke="#0f3b1e"
                    strokeWidth="3"
                  />
                  <path
                    d="M 50 100 Q 140 70 230 100"
                    stroke="#14532d"
                    strokeWidth="12"
                    fill="none"
                    opacity="0.85"
                  />
                  <path
                    d="M 70 65 Q 140 40 210 65"
                    stroke="#14532d"
                    strokeWidth="10"
                    fill="none"
                    opacity="0.85"
                  />
                  <path
                    d="M 70 135 Q 140 160 210 135"
                    stroke="#14532d"
                    strokeWidth="10"
                    fill="none"
                    opacity="0.85"
                  />
                  {/* Stem */}
                  <path
                    d="M 255 100 Q 275 90 280 80"
                    stroke="#854d0e"
                    strokeWidth="5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Ping effect */}
                  {isKnocking && (
                    <ellipse
                      cx="140"
                      cy="100"
                      rx="115"
                      ry="75"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="3"
                      className="animate-ping"
                    />
                  )}
                </svg>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <span className="rounded-full bg-black/40 text-white px-3 py-1 text-xs font-semibold backdrop-blur-xs flex items-center gap-1 shadow-md">
                    <span>👋 แตะเคาะเลย</span>
                  </span>
                </div>
              </div>

              {/* Knock info bar */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-3 border-t border-gray-200/80 w-full">
                <span className="text-gray-500 font-mono">
                  เคาะไปแล้ว: <strong className="text-gray-900">{knockCount} ครั้ง</strong>
                </span>

                <button
                  type="button"
                  onClick={handleTapWatermelon}
                  className="flex items-center gap-1.5 rounded-xl bg-green-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-green-800 transition-colors shadow-2xs cursor-pointer"
                >
                  <Play size={13} fill="white" />
                  <span>จำลองเคาะ 1 ครั้ง</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    useChatStore.getState().setMode("knock-analysis");
                    useChatStore
                      .getState()
                      .setDraftText(
                        `ฉันทดสอบเสียงเคาะระดับ ${activeMelonState} ช่วยวิเคราะห์เชิงลึกว่าควรผ่ารับประทานหรือไม่`
                      );
                    onNavigate("/chat");
                  }}
                  className="flex items-center gap-1 text-green-800 font-bold hover:underline cursor-pointer ml-2"
                >
                  <span>ส่งเสียงนี้ไปถาม AI →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ศูนย์ความรู้ (Knowledge Center Section) */}
      <section id="knowledge-center" className="mx-auto max-w-7xl px-4 sm:px-6 py-12 scroll-mt-20">
        <div className="rounded-3xl border border-lime-200 bg-white p-6 sm:p-10 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <span className="rounded-full bg-lime-100 text-green-800 px-3 py-0.5 text-xs font-bold uppercase tracking-wider">
                ศูนย์ความรู้แตงโม (Knowledge Center)
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-green-950 mt-2">
                คลังความรู้ คลื่นเสียง และมาตรฐานการคัดเกรดผลผลิต
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                รวบรวมหลักการฟิสิกส์อะคูสติกส์ สรีรวิทยาของแตงโม และคู่มือการดูแลรักษาหลังเก็บเกี่ยว
              </p>
            </div>

            <button
              onClick={() => onNavigate("/knowledge")}
              className="flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-800 underline self-start sm:self-auto cursor-pointer"
            >
              <span>เปิดดูคลังความรู้ทั้งหมด</span>
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-lime-100 bg-[#FFFDF7] p-5 text-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
              <div>
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                  ฟิสิกส์อะคูสติกส์
                </span>
                <h3 className="font-bold text-sm text-green-950 mt-2">
                  ความถี่เรโซแนนซ์กับความสุก
                </h3>
                <p className="mt-2 text-gray-600 leading-relaxed">
                  คลื่นเสียงเคาะช่วง 120–145 Hz บ่งชี้ว่าเนื้อแตงโมสะสมน้ำตาลเต็มที่ โครงสร้างผนังเซลล์อมน้ำพอดี ไม่แตกร่วน
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("/knowledge")}
                className="mt-4 pt-3 border-t border-lime-100 text-green-800 font-semibold text-[11px] flex items-center justify-between cursor-pointer"
              >
                <span>อ่านงานวิจัยอ้างอิง</span>
                <ChevronRight size={13} />
              </button>
            </article>

            <article className="rounded-2xl border border-lime-100 bg-[#FFFDF7] p-5 text-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
              <div>
                <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                  ดูลักษณะภายนอก
                </span>
                <h3 className="font-bold text-sm text-green-950 mt-2">
                  รอยแต้มดิน (Ground Spot)
                </h3>
                <p className="mt-2 text-gray-600 leading-relaxed">
                  จุดนอนดินที่สัมผัสพื้นควรเปลี่ยนจากสีขาวซีดหรือเขียวอ่อนเป็นสีเหลืองนวลหรือสีครีม แสดงว่าได้รับแสงและสุกตามธรรมชาติ
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("/knowledge")}
                className="mt-4 pt-3 border-t border-lime-100 text-green-800 font-semibold text-[11px] flex items-center justify-between cursor-pointer"
              >
                <span>ดูภาพตัวอย่างรอยแต้ม</span>
                <ChevronRight size={13} />
              </button>
            </article>

            <article className="rounded-2xl border border-lime-100 bg-[#FFFDF7] p-5 text-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
              <div>
                <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold">
                  การเก็บรักษา
                </span>
                <h3 className="font-bold text-sm text-green-950 mt-2">
                  อุณหภูมิและความชื้นสัมพัทธ์
                </h3>
                <p className="mt-2 text-gray-600 leading-relaxed">
                  แตงโมทั้งผลควรเก็บที่อุณหภูมิ 10–15°C ความชื้น 85–90% RH หากแช่เย็นจัดเกินไปต่ำกว่า 7°C จะเกิดอาการ Chilling Injury
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("/knowledge")}
                className="mt-4 pt-3 border-t border-lime-100 text-green-800 font-semibold text-[11px] flex items-center justify-between cursor-pointer"
              >
                <span>คู่มือควบคุมความเย็น</span>
                <ChevronRight size={13} />
              </button>
            </article>

            <article className="rounded-2xl border border-lime-100 bg-[#FFFDF7] p-5 text-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
              <div>
                <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold">
                  อาการผิดปกติ
                </span>
                <h3 className="font-bold text-sm text-green-950 mt-2">
                  ไส้ล้มแตกร่วน (Hollow Heart)
                </h3>
                <p className="mt-2 text-gray-600 leading-relaxed">
                  เกิดจากสภาพอากาศแปรปรวนหรือให้ปุ๋ยไนโตรเจนมากเกินไป โพรงอากาศแกนกลางทำให้เสียงเคาะทุ้มต่ำผิดปกติ (&lt;100 Hz)
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("/knowledge")}
                className="mt-4 pt-3 border-t border-lime-100 text-green-800 font-semibold text-[11px] flex items-center justify-between cursor-pointer"
              >
                <span>วิธีหลีกเลี่ยงไส้ล้ม</span>
                <ChevronRight size={13} />
              </button>
            </article>
          </div>
        </div>
      </section>

      {/* 4. ชุดคำสั่งยอดนิยม (Prompts Catalog Section) */}
      <section id="prompts-catalog" className="mx-auto max-w-7xl px-4 sm:px-6 py-12 scroll-mt-20">
        <div className="rounded-3xl border border-lime-200 bg-white p-6 sm:p-10 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-0.5 text-xs font-bold uppercase tracking-wider">
                ชุดคำสั่งที่แนะนำ (Prompt Library)
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-green-950 mt-2">
                คำสั่งสำเร็จรูปสำหรับคุยกับน้องแตงโม AI
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                คลิกปุ่ม "ใช้คำสั่งนี้" เพื่อเปิดห้องแชทพร้อมข้อความสำเร็จรูปได้ทันที
              </p>
            </div>

            <button
              onClick={() => onNavigate("/prompts")}
              className="flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-800 underline self-start sm:self-auto cursor-pointer"
            >
              <span>จัดการชุดคำสั่งทั้งหมด</span>
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                id: "p1",
                title: "วิเคราะห์เสียงเคาะ 3–5 จังหวะ",
                category: "วิเคราะห์เสียง",
                prompt:
                  "ช่วยวิเคราะห์เสียงเคาะแตงโมลูกนี้ ตรวจดูระดับความถี่ และประเมินว่าเนื้อในยังแน่นหรือเริ่มกลวง",
                badge: "ยอดนิยม",
              },
              {
                id: "p2",
                title: "ตรวจความสุกจากภาพถ่ายรอยแต้มดิน",
                category: "ดูลักษณะภายนอก",
                prompt:
                  "ตรวจสอบภาพแตงโมลูกนี้ ดูสีของรอยแต้มดิน (Ground spot) และสภาพขั้วว่าพร้อมเก็บเกี่ยวหรือยัง",
                badge: "ใช้บ่อย",
              },
              {
                id: "p3",
                title: "เปรียบเทียบพันธุ์กินรี vs ตอร์ปิโด",
                category: "พันธุ์แตงโม",
                prompt:
                  "เปรียบเทียบลักษณะทางกายภาพ รสสัมผัส และค่าความหวาน Brix ของแตงโมกินรีกับตอร์ปิโด",
                badge: "สายพันธุ์",
              },
              {
                id: "p4",
                title: "เทคนิคการเก็บรักษาหลังผ่าตรวจ",
                category: "การรักษา",
                prompt:
                  "แตงโมที่ผ่าแล้วควรเก็บรักษาที่อุณหภูมิกี่องศาเซลเซียส และอยู่ได้นานกี่วันโดยไม่สูญเสียความกรอบ",
                badge: "การบริโภค",
              },
            ].map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-gray-200 bg-gray-50/50 p-5 text-xs flex flex-col justify-between hover:bg-white hover:border-lime-300 transition-all shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                      {p.category}
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      {p.badge}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 mb-2">{p.title}</h4>
                  <p className="text-gray-600 line-clamp-3 leading-5 italic bg-white p-2.5 rounded-xl border border-gray-100">
                    "{p.prompt}"
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleUsePromptOnPage(p.prompt, p.id)}
                    className="flex-1 rounded-xl bg-green-700 py-2 text-xs font-bold text-white hover:bg-green-800 transition-colors shadow-2xs text-center cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {copiedPromptId === p.id ? (
                      <>
                        <Check size={14} />
                        <span>กำลังเปิดแชท...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>ใช้คำสั่งนี้</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. สารานุกรมสายพันธุ์แตงโมยอดนิยม (Cultivar Showcase) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="rounded-3xl border border-lime-200 bg-white p-6 sm:p-10 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-green-700">
                พันธุ์แตงโมที่ระบบรองรับ
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-green-950 mt-1">
                สอบเทียบความถี่เรโซแนนซ์ตามสายพันธุ์จริงในไทย
              </h3>
            </div>
            <button
              onClick={() => onNavigate("/varieties")}
              className="text-xs font-semibold text-green-700 hover:text-green-800 underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>เปิดสารานุกรมสายพันธุ์ทั้งหมด</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <VarietyItem
              name="พันธุ์กินรี (Kinnaree)"
              badge="ยอดนิยมอันดับ 1"
              brix="11.5 - 13.0 °Bx"
              freq="125 - 140 Hz"
              desc="ทรงกลมรี ผิวเขียว ลายดำคมชัด เนื้อแดงสดกรอบละเอียด ไม่ล้มง่าย"
            />
            <VarietyItem
              name="พันธุ์ตอร์ปิโด (Torpedo)"
              badge="เปลือกเหนียวทนขนส่ง"
              brix="11.0 - 12.5 °Bx"
              freq="118 - 132 Hz"
              desc="ผลทรงยาวรี เปลือกหนาปานกลาง เนื้อแน่นกรอบจัด กักเก็บความหวานได้นาน"
            />
            <VarietyItem
              name="พันธุ์ซอนญ่า (Sonya)"
              badge="หวานจัดเนื้อทราย"
              brix="12.0 - 13.5 °Bx"
              freq="135 - 145 Hz"
              desc="ผลกลม ผิวเขียวเข้มเกือบดำ เนื้อสีแดงเข้ม หวานฉ่ำ กลิ่นหอมเฉพาะตัว"
            />
            <VarietyItem
              name="ไดอาน่า / ไร้เมล็ด"
              badge="เกรดพรีเมียม"
              brix="12.0 - 14.0 °Bx"
              freq="140 - 152 Hz"
              desc="เนื้อสีเหลืองทองและพันธุ์ไร้เมล็ด รสหวานละมุน นุ่มชุ่มฉ่ำ ทานง่าย"
            />
          </div>
        </div>
      </section>

      {/* 6. ความเป็นส่วนตัวและมาตรฐาน PDPA (Privacy & PDPA Assurance Section) */}
      <section id="privacy-pdpa" className="mx-auto max-w-7xl px-4 sm:px-6 py-12 scroll-mt-20">
        <div className="rounded-3xl border border-emerald-300 bg-linear-to-r from-emerald-900 to-green-950 p-6 sm:p-10 text-white shadow-lg">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <span className="rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider">
                นโยบายความเป็นส่วนตัวและสิทธิ PDPA
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-white">
                ข้อมูลของคุณเป็นของคุณ 100% ไม่นำไปเทรนโมเดลโดยอัตโนมัติ
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
                ระบบปฏิบัติตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) อย่างเคร่งครัด
                ข้อความ เสียงบันทึก และภาพถ่ายในห้องแชทจะถูกจัดเก็บเฉพาะในบัญชีของคุณ
                โดยไม่มีการนำไปใช้ฝึกฝนโมเดล AI ใดๆ เว้นแต่คุณจะให้ความยินยอมแบบชัดแจ้ง (Explicit Opt-in)
                และข้อมูลจะถูกลบข้อมูลระบุตัวตน (Anonymize) ก่อนเสมอ
              </p>

              <div className="mt-6 grid sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs border border-white/10">
                  <strong className="block font-bold text-white mb-1">✓ สิทธิขอสำเนาข้อมูล</strong>
                  <span className="text-emerald-200">ดาวน์โหลดประวัติแชทในรูปแบบ JSON ได้ตลอดเวลา</span>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs border border-white/10">
                  <strong className="block font-bold text-white mb-1">✓ สิทธิสั่งลบข้อมูลถาวร</strong>
                  <span className="text-emerald-200">ลบข้อความหรือบัญชีได้ทันที ไม่หลงเหลือในระบบ</span>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs border border-white/10">
                  <strong className="block font-bold text-white mb-1">✓ ความปลอดภัยระดับสูง</strong>
                  <span className="text-emerald-200">ระบบ RBAC + Ownership ป้องกันการเข้าถึงข้ามบัญชี</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => onNavigate("/settings")}
                className="w-full rounded-2xl bg-white px-5 py-3.5 text-xs sm:text-sm font-bold text-green-950 hover:bg-emerald-50 transition-colors shadow-md text-center cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock size={16} className="text-green-800" />
                <span>ตั้งค่าความเป็นส่วนตัว & PDPA</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate("/help")}
                className="w-full rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-xs font-semibold text-white hover:bg-white/20 transition-colors text-center cursor-pointer flex items-center justify-center gap-2"
              >
                <HelpCircle size={15} />
                <span>แจ้งปัญหาหรือขอใช้สิทธิข้อมูล</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-lime-200/80 bg-[#FFF8E7] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍉</span>
            <span className="font-bold text-green-950">น้องแตงโม AI</span>
            <span>· ระบบแชท AI วิเคราะห์แตงโมจากคลื่นเสียงเคาะ</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate("/chat")}
              className="hover:text-green-800 transition-colors cursor-pointer"
            >
              ระบบแชท
            </button>
            <span>·</span>
            <button
              onClick={() => scrollToSection("knowledge-center")}
              className="hover:text-green-800 transition-colors cursor-pointer"
            >
              ศูนย์ความรู้
            </button>
            <span>·</span>
            <button
              onClick={() => scrollToSection("prompts-catalog")}
              className="hover:text-green-800 transition-colors cursor-pointer"
            >
              ชุดคำสั่ง
            </button>
            <span>·</span>
            <button
              onClick={() => onNavigate("/settings")}
              className="hover:text-green-800 transition-colors cursor-pointer"
            >
              ความเป็นส่วนตัว PDPA
            </button>
            {isAdminOrSuper && (
              <>
                <span>·</span>
                <button
                  onClick={() => onNavigate("/admin")}
                  className="hover:text-green-800 transition-colors cursor-pointer"
                >
                  ผู้ดูแลระบบ
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

function VarietyItem({
  name,
  badge,
  brix,
  freq,
  desc,
}: {
  name: string;
  badge: string;
  brix: string;
  freq: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-lime-100 bg-[#FFFDF7] p-4 text-xs">
      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full inline-block mb-1.5">
        {badge}
      </span>
      <h4 className="font-bold text-sm text-green-950">{name}</h4>
      <div className="mt-2 space-y-1 text-gray-600">
        <p className="flex justify-between">
          <span>ความหวานเป้าหมาย:</span>
          <strong className="font-mono text-green-900">{brix}</strong>
        </p>
        <p className="flex justify-between">
          <span>ความถี่เสียงสุก:</span>
          <strong className="font-mono text-green-900">{freq}</strong>
        </p>
      </div>
      <p className="mt-2 text-gray-500 text-[11px] leading-4 border-t border-lime-100 pt-2">
        {desc}
      </p>
    </div>
  );
}
