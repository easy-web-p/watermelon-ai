import { useEffect, useRef, useState } from "react";
import { Activity, Play, Square, Waves } from "lucide-react";

interface AcousticWaveformVisualizerProps {
  dominantFrequencyHz: number;
  detectedImpacts: number;
  snrDb: number;
  resonanceDecayRate: number;
  qualityStatus: "passed" | "uncertain" | "rejected";
}

export function AcousticWaveformVisualizer({
  dominantFrequencyHz = 134,
  detectedImpacts = 4,
  snrDb = 26,
  resonanceDecayRate = 54,
  qualityStatus = "passed",
}: AcousticWaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<"time" | "frequency">("frequency");
  const [isPlayingSynth, setIsPlayingSynth] = useState(false);
  const animRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Synthesize simulated acoustic resonance knock sound via Web Audio API
  function playSynthesizedKnock() {
    if (isPlayingSynth) {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close();
      }
      setIsPlayingSynth(false);
      return;
    }

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      setIsPlayingSynth(true);

      const impactInterval = 0.35; // 350ms between knocks
      const now = ctx.currentTime + 0.05;

      for (let i = 0; i < detectedImpacts; i++) {
        const knockTime = now + i * impactInterval;

        // Fundamental resonance oscillator
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        // Frequency with slight physical variation
        osc.frequency.setValueAtTime(dominantFrequencyHz + (Math.random() * 4 - 2), knockTime);
        // Exponential pitch decay typical of impact damping
        osc.frequency.exponentialRampToValueAtTime(
          dominantFrequencyHz * 0.92,
          knockTime + 0.12
        );

        gain.gain.setValueAtTime(0.001, knockTime);
        gain.gain.linearRampToValueAtTime(0.7, knockTime + 0.008);
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          knockTime + Math.max(0.08, resonanceDecayRate / 500)
        );

        // Filter to simulate melon rind & flesh damping
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(dominantFrequencyHz, knockTime);
        filter.Q.setValueAtTime(4.0, knockTime);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(knockTime);
        osc.stop(knockTime + 0.25);
      }

      const totalDuration = (detectedImpacts * impactInterval + 0.3) * 1000;
      setTimeout(() => {
        setIsPlayingSynth(false);
        if (ctx.state !== "closed") void ctx.close();
      }, totalDuration);
    } catch {
      setIsPlayingSynth(false);
    }
  }

  // Draw canvas visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (viewMode === "frequency") {
        // Draw FFT Frequency Spectrum (peaks around dominant frequency)
        // Background grid lines
        ctx.strokeStyle = "rgba(22, 101, 52, 0.1)";
        ctx.lineWidth = 1;
        for (let x = 40; x < w; x += 50) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 20; y < h; y += 25) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Draw frequency response curve
        ctx.beginPath();
        const peakX = Math.min(w - 30, Math.max(30, ((dominantFrequencyHz - 60) / (240 - 60)) * w));
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, "rgba(22, 163, 74, 0.8)");
        gradient.addColorStop(0.7, "rgba(132, 204, 22, 0.3)");
        gradient.addColorStop(1, "rgba(234, 179, 8, 0.05)");

        ctx.moveTo(0, h - 5);
        for (let x = 0; x <= w; x += 2) {
          const dist = Math.abs(x - peakX);
          const sigma = 28;
          const peakHeight = (h - 25) * Math.exp(-(dist * dist) / (2 * sigma * sigma));
          // Ambient noise floor
          const noise = Math.sin(x * 0.15 + frame * 0.05) * 3 + Math.random() * 2;
          const y = h - 6 - peakHeight - Math.max(0, noise);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h - 5);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Stroke line
        ctx.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const dist = Math.abs(x - peakX);
          const sigma = 28;
          const peakHeight = (h - 25) * Math.exp(-(dist * dist) / (2 * sigma * sigma));
          const noise = Math.sin(x * 0.15 + frame * 0.05) * 3;
          const y = h - 6 - peakHeight - Math.max(0, noise);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "#15803d";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Peak Pin Indicator
        ctx.fillStyle = "#166534";
        ctx.beginPath();
        ctx.arc(peakX, 16, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "#14532d";
        ctx.textAlign = "center";
        ctx.fillText(`${dominantFrequencyHz} Hz (Peak Resonance)`, peakX, 11);
      } else {
        // Draw Time-Domain Waveform of the impacts
        const impactSpacing = w / (detectedImpacts + 1);
        ctx.strokeStyle = "rgba(0,0,0,0.06)";
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();

        for (let i = 1; i <= detectedImpacts; i++) {
          const centerX = i * impactSpacing;
          ctx.beginPath();
          ctx.strokeStyle = "#16a34a";
          ctx.lineWidth = 1.5;

          const points = 40;
          for (let p = -points; p <= points; p++) {
            const px = centerX + p * 1.2;
            const progress = Math.abs(p) / points;
            const decay = Math.exp(-progress * 3.5);
            const wave = Math.sin(p * 0.8 + frame * 0.08) * ((h / 2) - 8) * decay;
            const py = h / 2 + wave;
            if (p === -points) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();

          // Marker
          ctx.fillStyle = "#15803d";
          ctx.font = "9px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`เคาะ #${i}`, centerX, h - 3);
        }
      }

      frame++;
      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [dominantFrequencyHz, detectedImpacts, viewMode]);

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-lime-200 bg-white/90 shadow-2xs backdrop-blur-xs">
      <div className="flex items-center justify-between border-b border-lime-100 bg-lime-50/70 px-3 py-1.5 text-xs">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-green-700" />
          <span className="font-bold text-green-950 text-[11px]">
            {viewMode === "frequency" ? "สเปกตรัมคลื่นเสียง (FFT Resonance)" : "รูปคลื่นตามเวลา (Time-Domain Wave)"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex rounded-lg bg-white/80 p-0.5 border border-lime-200">
            <button
              type="button"
              onClick={() => setViewMode("frequency")}
              className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                viewMode === "frequency"
                  ? "bg-green-700 text-white"
                  : "text-gray-600 hover:text-green-800"
              }`}
            >
              FFT (Hz)
            </button>
            <button
              type="button"
              onClick={() => setViewMode("time")}
              className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                viewMode === "time"
                  ? "bg-green-700 text-white"
                  : "text-gray-600 hover:text-green-800"
              }`}
            >
              คลื่นเสียง (ms)
            </button>
          </div>

          <button
            type="button"
            onClick={playSynthesizedKnock}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-all shadow-2xs ${
              isPlayingSynth
                ? "bg-red-500 text-white animate-pulse"
                : "bg-green-700 text-white hover:bg-green-800"
            }`}
            title="จำลองเสียงเคาะตามค่าความถี่ที่ตรวจพบ"
          >
            {isPlayingSynth ? <Square size={10} /> : <Play size={10} />}
            <span>{isPlayingSynth ? "หยุด" : "จำลองเสียงเคาะ"}</span>
          </button>
        </div>
      </div>

      <div className="p-2">
        <canvas
          ref={canvasRef}
          width={440}
          height={90}
          className="w-full h-[85px] rounded-xl bg-[#FBFDF8] border border-lime-100/80 block"
        />
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-500 px-1 font-mono">
          <span>ย่านความถี่ 60 Hz – 240 Hz</span>
          <span>SNR: {snrDb} dB · Decay: {resonanceDecayRate} ms</span>
          <span className="text-emerald-700 font-semibold font-sans">
            {qualityStatus === "passed" ? "✓ สัญญาณชัดเจน" : "⚠️ มีเสียงรบกวน"}
          </span>
        </div>
      </div>
    </div>
  );
}
