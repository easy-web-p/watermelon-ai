import { useState } from "react";
import {
  AlertTriangle,
  Award,
  Bot,
  CheckCircle2,
  Copy,
  Flag,
  Sparkles,
  User,
  Volume2,
  VolumeX,
  Waves,
} from "lucide-react";
import { ChatMessage as ChatMessageType } from "@/types/chat";
import { AcousticWaveformVisualizer } from "@/components/chat/AcousticWaveformVisualizer";
import { WatermelonCertificateModal } from "@/components/lab/WatermelonCertificateModal";

interface Props {
  message: ChatMessageType;
  onReport: (messageId: string) => void;
}

export function ChatMessage({ message, onReport }: Props) {
  const isUser = message.role === "user";
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleTts() {
    if (!("speechSynthesis" in window)) {
      alert("เบราว์เซอร์นี้ไม่รองรับการอ่านออกเสียง");
      return;
    }

    if (isPlayingTts) {
      window.speechSynthesis.cancel();
      setIsPlayingTts(false);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = message.content.replace(/[*#_`]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "th-TH";
    utterance.rate = 1.0;

    utterance.onend = () => setIsPlayingTts(false);
    utterance.onerror = () => setIsPlayingTts(false);

    setIsPlayingTts(true);
    window.speechSynthesis.speak(utterance);
  }

  function handleCopy() {
    void navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <article
      className={`flex gap-3 transition-opacity duration-200 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      <div
        className={[
          "grid h-9 w-9 shrink-0 place-items-center rounded-2xl shadow-xs",
          isUser
            ? "bg-green-700 text-white"
            : "bg-lime-200 text-green-900 border border-lime-300",
        ].join(" ")}
      >
        {isUser ? <User size={18} /> : <span className="text-base select-none">🍉</span>}
      </div>

      <div className={`max-w-[88%] sm:max-w-[80%] ${isUser ? "text-right" : ""}`}>
        <div
          className={[
            "rounded-3xl px-4 py-3 text-left shadow-xs transition-all",
            isUser
              ? "rounded-tr-md bg-green-700 text-white"
              : "rounded-tl-md border border-lime-100 bg-white text-gray-800",
          ].join(" ")}
        >
          {message.content && (
            <p className="whitespace-pre-wrap leading-7 text-sm sm:text-base">
              {message.content}
            </p>
          )}

          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.attachments.map((attachment) => (
                <div key={attachment.id} className="overflow-hidden rounded-2xl">
                  {attachment.type === "image" && (
                    <div className="overflow-hidden rounded-2xl border border-black/10 bg-black/5">
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        referrerPolicy="no-referrer"
                        className="max-h-72 w-auto max-w-full rounded-2xl object-cover hover:scale-[1.01] transition-transform"
                      />
                    </div>
                  )}

                  {attachment.type === "audio" && (
                    <div className="rounded-2xl border border-lime-200 bg-lime-50/70 p-3">
                      <div className="flex items-center gap-2 mb-2 text-xs font-medium text-green-900">
                        <Waves size={15} className="text-green-700 animate-pulse" />
                        <span>ไฟล์เสียง: {attachment.name}</span>
                      </div>
                      <audio src={attachment.url} controls className="w-full h-10" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {message.knockAnalysis && (
            <KnockAnalysisCard analysis={message.knockAnalysis} />
          )}

          {/* Model tag and timestamp metadata */}
          <div
            className={`mt-2 flex items-center gap-2 text-[11px] ${
              isUser ? "text-green-100/80 justify-end" : "text-gray-400"
            }`}
          >
            {message.modelVersion && (
              <span>{message.modelVersion}</span>
            )}
            {message.responseTimeMs && (
              <>
                <span>·</span>
                <span className="tabular-nums font-mono">{message.responseTimeMs}ms</span>
              </>
            )}
            <span>·</span>
            <span className="tabular-nums">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {!isUser && (
          <div className="mt-1 flex items-center gap-1 text-gray-500">
            <button
              onClick={handleTts}
              className={`rounded-lg p-1.5 transition-colors ${
                isPlayingTts
                  ? "bg-green-100 text-green-800"
                  : "hover:bg-gray-100 text-gray-500"
              }`}
              title={isPlayingTts ? "หยุดอ่าน" : "อ่านออกเสียง"}
              aria-label="อ่านข้อความ"
            >
              {isPlayingTts ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <button
              onClick={handleCopy}
              className="rounded-lg p-1.5 hover:bg-gray-100 text-gray-500 transition-colors"
              title="คัดลอกข้อความ"
              aria-label="คัดลอก"
            >
              {copied ? (
                <CheckCircle2 size={16} className="text-emerald-600" />
              ) : (
                <Copy size={16} />
              )}
            </button>

            <button
              onClick={() => onReport(message.id)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="รายงานคำตอบไม่ถูกต้อง"
            >
              <Flag size={14} />
              <span>รายงาน</span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function KnockAnalysisCard({
  analysis,
}: {
  analysis: NonNullable<ChatMessageType["knockAnalysis"]>;
}) {
  const isRipe = analysis.maturityClass.includes("สุกพอดี");
  const isUnripe = analysis.maturityClass.includes("อ่อน");

  return (
    <section className="mt-4 rounded-2xl border border-amber-200/80 bg-linear-to-b from-[#FFFDF0] to-[#FFF8DB] p-4 text-gray-800 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-lg">🍉</span>
          <span className="font-bold text-green-950 text-sm">
            ผลวิเคราะห์คลื่นเสียงเคาะ
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
              analysis.qualityStatus === "passed"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            ความมั่นใจ {Math.round(analysis.confidence * 100)}%
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div>
          <p
            className={`text-xl font-extrabold ${
              isRipe
                ? "text-emerald-800"
                : isUnripe
                ? "text-blue-800"
                : "text-amber-800"
            }`}
          >
            {analysis.maturityClass}
          </p>
          <p className="mt-0.5 text-xs text-gray-600">
            ระดับความสุก {analysis.maturityGrade}/5 · ตรวจพบเสียงเคาะ{" "}
            {analysis.detectedImpacts} ครั้ง
          </p>
        </div>

        {analysis.sweetnessEstimateBrix && (
          <div className="text-right">
            <span className="text-xs text-gray-500 block">ประมาณความหวาน</span>
            <span className="text-lg font-extrabold text-amber-900 font-mono tabular-nums">
              {analysis.sweetnessEstimateBrix} °Bx
            </span>
          </div>
        )}
      </div>

      {/* Acoustic breakdown metrics */}
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-white/70 p-2 text-center text-xs">
        <div>
          <span className="text-gray-400 block text-[10px]">ความถี่เด่น</span>
          <span className="font-bold font-mono text-gray-800 tabular-nums">
            {analysis.dominantFrequencyHz || 135} Hz
          </span>
        </div>
        <div>
          <span className="text-gray-400 block text-[10px]">Signal/Noise</span>
          <span className="font-bold font-mono text-gray-800 tabular-nums">
            {analysis.snrDb || 24} dB
          </span>
        </div>
        <div>
          <span className="text-gray-400 block text-[10px]">การสั่นสะท้อน</span>
          <span className="font-bold font-mono text-gray-800 tabular-nums">
            {analysis.resonanceDecayRate || 56} ms
          </span>
        </div>
      </div>

      {/* Interactive Acoustic Waveform / Spectrum Visualizer */}
      <AcousticWaveformVisualizer
        dominantFrequencyHz={analysis.dominantFrequencyHz || 134}
        detectedImpacts={analysis.detectedImpacts || 4}
        snrDb={analysis.snrDb || 26}
        resonanceDecayRate={analysis.resonanceDecayRate || 54}
        qualityStatus={analysis.qualityStatus}
      />

      {analysis.qualityStatus !== "passed" && (
        <div className="mt-3 flex gap-2 rounded-xl bg-orange-100 p-2.5 text-xs text-orange-900">
          <AlertTriangle size={16} className="shrink-0 text-orange-600 mt-0.5" />
          <span>ผลนี้มีความไม่แน่นอนจากเสียงรบกวน แนะนำเคาะ 3–5 ครั้งในที่เงียบ</span>
        </div>
      )}

      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="mt-3 border-t border-amber-200/60 pt-2.5">
          <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
            <Sparkles size={13} className="text-amber-600" />
            <span>คำแนะนำจากน้องแตงโม AI:</span>
          </p>
          <ul className="list-disc space-y-1 pl-4 text-xs text-gray-700 leading-5">
            {analysis.recommendations.map((text, idx) => (
              <li key={idx}>{text}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Button to generate Official Certificate */}
      <div className="mt-3 pt-2.5 border-t border-amber-200/50 flex justify-end">
        <CertificateTrigger analysis={analysis} />
      </div>
    </section>
  );
}

function CertificateTrigger({
  analysis,
}: {
  analysis: NonNullable<ChatMessageType["knockAnalysis"]>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white/90 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-50 transition-colors shadow-2xs cursor-pointer"
      >
        <Award size={14} className="text-amber-600" />
        <span>ออกใบรับรองคุณภาพแตงโม (Certificate)</span>
      </button>

      {open && (
        <WatermelonCertificateModal
          analysis={analysis}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
