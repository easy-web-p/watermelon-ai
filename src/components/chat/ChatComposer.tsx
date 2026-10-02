import {
  ChangeEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FileAudio,
  ImagePlus,
  Mic,
  Send,
  Square,
  Waves,
  X,
} from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useChatStore } from "@/stores/chat-store";
import { LocalAttachment, AudioSamplePreset } from "@/types/chat";
import { AUDIO_SAMPLE_PRESETS } from "@/lib/api";

interface Props {
  onSubmit: (content: string, rawFiles?: File[]) => Promise<void>;
  onTranscribe: (file: File) => Promise<string>;
}

export function ChatComposer({ onSubmit, onTranscribe }: Props) {
  const [content, setContent] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const {
    mode,
    setMode,
    attachments,
    addAttachment,
    removeAttachment,
    isSending,
    draftText,
    setDraftText,
  } = useChatStore();

  useEffect(() => {
    if (draftText) {
      setContent(draftText);
      setDraftText("");
    }
  }, [draftText, setDraftText]);

  const {
    isRecording,
    recordingSeconds,
    audioLevel,
    startRecording,
    stopRecording,
  } = useAudioRecorder();

  function createAttachment(file: File): LocalAttachment {
    return {
      id: "loc-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      file,
      type: file.type.startsWith("image/") ? "image" : "audio",
      previewUrl: URL.createObjectURL(file),
    };
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    files.forEach((file) => {
      addAttachment(createAttachment(file));
    });
    event.target.value = "";
  }

  async function handleMicrophone() {
    try {
      if (!isRecording) {
        await startRecording();
        return;
      }

      const file = await stopRecording();

      if (mode === "transcription") {
        setIsTranscribing(true);
        try {
          const text = await onTranscribe(file);
          setContent((current) => (current ? `${current} ${text}` : text));
        } finally {
          setIsTranscribing(false);
        }
        return;
      }

      addAttachment(createAttachment(file));
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "ไม่สามารถเข้าถึงไมโครโฟนได้",
      );
    }
  }

  async function handleSubmit() {
    if ((!content.trim() && attachments.length === 0) || isSending) {
      return;
    }

    const currentText = content.trim();
    const rawFiles = attachments.map((a) => a.file);
    setContent("");
    await onSubmit(currentText, rawFiles);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <div className="border-t border-lime-100 bg-[#FFFEF8] p-3 sm:p-4">
      <div className="mx-auto max-w-4xl">
        {/* Mode Selector Tabs */}
        <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <ModeButton
            active={mode === "general"}
            onClick={() => setMode("general")}
          >
            คุยทั่วไป
          </ModeButton>

          <ModeButton
            active={mode === "knock-analysis"}
            onClick={() => setMode("knock-analysis")}
          >
            🍉 วิเคราะห์เสียงเคาะ
          </ModeButton>

          <ModeButton
            active={mode === "transcription"}
            onClick={() => setMode("transcription")}
          >
            เสียงเป็นข้อความ
          </ModeButton>
        </div>

        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto py-1">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative shrink-0 rounded-2xl border border-lime-200 bg-white p-2 shadow-xs group"
              >
                {attachment.type === "image" ? (
                  <img
                    src={attachment.previewUrl}
                    alt={attachment.file.name}
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-32 flex-col items-center justify-center gap-1 rounded-xl bg-lime-50 px-2 text-xs text-green-900">
                    <FileAudio size={22} className="text-green-700" />
                    <span className="truncate w-full text-center">
                      {attachment.file.name}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {(attachment.file.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-1 text-white shadow-xs hover:bg-red-600 transition-colors"
                  aria-label="ลบไฟล์"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Mode Specific Guidance Notice */}
        {mode === "knock-analysis" && (
          <div className="mb-2 space-y-1.5">
            <div className="rounded-2xl bg-amber-50/80 border border-amber-200/70 px-3.5 py-2 text-xs sm:text-sm text-amber-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-base">🍉</span>
                <span>
                  <strong>วิธีทดสอบ:</strong> จ่อไมโครโฟนห่าง 5–10 ซม. แล้วเคาะแตงโม 3–5 ครั้งในที่เงียบ
                </span>
              </span>
              <span className="text-xs text-amber-800 hidden sm:inline">
                ย่านเสียงที่สมบูรณ์ ~115–155 Hz
              </span>
            </div>

            {/* Quick Preset Samples */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-gray-400 text-[11px] shrink-0 font-medium">ไม่มีแตงโมข้างตัว? ทดลองเสียงจำลอง:</span>
              {AUDIO_SAMPLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setContent(`ทดลองวิเคราะห์เสียงเคาะตัวอย่าง: ${preset.title} (${preset.variety})`);
                  }}
                  className="shrink-0 rounded-xl border border-lime-200 bg-white px-2.5 py-1 text-[11px] font-medium text-green-900 hover:bg-lime-50 hover:border-green-600 transition-colors shadow-2xs"
                >
                  {preset.expectedClass === "สุกพอดี (หวานฉ่ำ)" ? "🔊 สุกพอดี ~134Hz" : preset.expectedClass === "อ่อนเกินไป" ? "🌱 ยังอ่อน ~178Hz" : "⚠️ ไส้ล้ม ~98Hz"}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === "transcription" && (
          <div className="mb-2 rounded-2xl bg-blue-50/80 border border-blue-200/70 px-3.5 py-2 text-xs sm:text-sm text-blue-900 flex items-center gap-2">
            <Waves size={16} className="text-blue-600 animate-pulse" />
            <span>
              กดปุ่มไมโครโฟนเพื่อพูดภาษาไทย ระบบจะแปลงเสียงพูดเป็นข้อความอัตโนมัติ
            </span>
          </div>
        )}

        {/* Input Bar */}
        <div
          className={`flex items-end gap-2 rounded-3xl border bg-white p-2 shadow-sm transition-all ${
            isRecording
              ? "border-red-400 ring-2 ring-red-100"
              : "border-lime-200 focus-within:border-green-600 focus-within:ring-2 focus-within:ring-lime-100"
          }`}
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={handleFiles}
          />

          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            multiple
            hidden
            onChange={handleFiles}
          />

          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="rounded-full p-2.5 text-gray-500 hover:bg-lime-50 hover:text-green-800 transition-colors"
            title="แนบรูปภาพแตงโม"
            aria-label="ส่งรูปภาพ"
          >
            <ImagePlus size={20} />
          </button>

          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className="rounded-full p-2.5 text-gray-500 hover:bg-lime-50 hover:text-green-800 transition-colors"
            title="แนบไฟล์เสียงเคาะหรือเสียงพูด"
            aria-label="ส่งไฟล์เสียง"
          >
            <FileAudio size={20} />
          </button>

          <div className="relative flex-1">
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={
                mode === "knock-analysis"
                  ? "กดไมค์เพื่อเคาะ หรือพิมพ์บอกพันธุ์และน้ำหนักแตงโม..."
                  : mode === "transcription"
                  ? "กดปุ่มไมโครโฟนเพื่อเริ่มพูดภาษาไทย..."
                  : "ถามน้องแตงโมได้เลย เช่น ดูรอยแต้มดิน หรือค่าความหวาน Brix..."
              }
              className="max-h-32 min-h-10 w-full resize-none bg-transparent px-2 py-2 text-sm sm:text-base outline-none text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Microphone Recording Button */}
          <button
            type="button"
            onClick={handleMicrophone}
            className={[
              "relative rounded-full p-2.5 transition-all",
              isRecording
                ? "bg-red-500 text-white animate-pulse shadow-md"
                : "text-gray-600 hover:bg-lime-50 hover:text-green-800",
            ].join(" ")}
            title={isRecording ? "กดเพื่อหยุดบันทึก" : "กดเพื่ออัดเสียงเคาะหรือเสียงพูด"}
            aria-label={isRecording ? "หยุดบันทึกเสียง" : "เริ่มบันทึกเสียง"}
          >
            {isRecording ? <Square size={18} /> : <Mic size={20} />}

            {isRecording && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-red-600 px-2 py-0.5 text-[11px] font-mono font-bold text-white shadow-sm tabular-nums">
                REC {recordingSeconds}s
              </span>
            )}
          </button>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              isSending ||
              isTranscribing ||
              (!content.trim() && attachments.length === 0)
            }
            className="rounded-full bg-green-700 p-2.5 sm:p-3 text-white shadow-xs hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
            aria-label="ส่งข้อความ"
          >
            <Send size={18} />
          </button>
        </div>

        {/* Audio Level Meter when recording */}
        {isRecording && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-1.5 text-xs text-red-700">
            <span className="font-semibold shrink-0">กำลังรับเสียง:</span>
            <div className="h-2 flex-1 rounded-full bg-red-200 overflow-hidden">
              <div
                className="h-full bg-red-600 transition-all duration-75"
                style={{ width: `${Math.max(5, audioLevel)}%` }}
              />
            </div>
            <span className="font-mono tabular-nums text-[11px]">{audioLevel}%</span>
          </div>
        )}

        {isTranscribing && (
          <div className="mt-2 text-center text-xs text-blue-700 animate-pulse">
            กำลังแปลงเสียงพูดเป็นข้อความภาษาไทย...
          </div>
        )}

        <p className="mt-2 text-center text-[11px] text-gray-500">
          ผลวิเคราะห์เป็นค่าประเมินจากแบบจำลองคลื่นเสียง AI · ไม่นำข้อมูลไปฝึกโมเดลหากไม่ได้รับความยินยอมแบบ Opt-in
        </p>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "shrink-0 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer",
        active
          ? "bg-green-700 text-white shadow-xs"
          : "border border-lime-200 bg-white text-gray-700 hover:bg-lime-50 hover:border-lime-300",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
