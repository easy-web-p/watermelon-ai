import { useEffect, useRef, useState } from "react";
import {
  Menu,
  RotateCcw,
  Sparkles,
  Volume2,
  Sliders,
} from "lucide-react";
import { ChatComposer } from "./ChatComposer";
import { ChatMessage } from "./ChatMessage";
import { ChatSidebar } from "./ChatSidebar";
import { AcousticCalibrationModal } from "@/components/lab/AcousticCalibrationModal";
import { ReportDialog } from "@/components/feedback/ReportDialog";
import { useChatStore } from "@/stores/chat-store";
import { useConsentStore } from "@/stores/consent-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  inspectSearchSafety,
  checkRateLimit,
  RATE_LIMIT_RULES,
} from "@/lib/security";
import {
  createConversation,
  getConversationMessages,
  getConversations,
  sendMessage,
  transcribeAudio,
  uploadFile,
} from "@/lib/api";
import { ChatMessage as ChatMessageType } from "@/types/chat";

interface ChatWorkspaceProps {
  initialConversationId?: string;
  onNavigate: (route: string) => void;
  currentRoute: string;
}

export function ChatWorkspace({
  initialConversationId,
  onNavigate,
  currentRoute,
}: ChatWorkspaceProps) {
  const [error, setError] = useState<string | null>(null);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    messages,
    currentConversationId,
    mode,
    attachments,
    isSending,
    setConversations,
    setMessages,
    setCurrentConversation,
    addMessage,
    clearAttachments,
    setSending,
    setSidebarOpen,
  } = useChatStore();

  const { allowTraining } = useConsentStore();

  // Load conversations on mount
  useEffect(() => {
    getConversations()
      .then((items) => {
        setConversations(items);
        if (initialConversationId) {
          setCurrentConversation(initialConversationId);
        } else if (!currentConversationId && items.length > 0) {
          setCurrentConversation(items[0].id);
        }
      })
      .catch(() => setError("โหลดรายการแชทไม่สำเร็จ"));
  }, [setConversations, setCurrentConversation, initialConversationId]);

  // Load messages when currentConversationId changes
  useEffect(() => {
    if (!currentConversationId) {
      setMessages([]);
      return;
    }
    getConversationMessages(currentConversationId)
      .then(setMessages)
      .catch(() => setError("โหลดข้อความไม่สำเร็จ"));
  }, [currentConversationId, setMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const { currentUser } = useAuthStore();

  async function handleNewChat() {
    try {
      const conv = await createConversation("แชทแตงโมใหม่ 🍉", mode);
      setConversations([conv, ...conversations]);
      setCurrentConversation(conv.id);
      setMessages([]);
      onNavigate(`/chat/${conv.id}`);
    } catch {
      setError("สร้างแชทใหม่ไม่สำเร็จ");
    }
  }

  async function handleSearch(value: string) {
    if (!value.trim()) {
      try {
        const result = await getConversations("");
        setConversations(result);
        setError(null);
      } catch {
        setError("โหลดรายการแชทไม่สำเร็จ");
      }
      return;
    }

    // 1. Rate Limiting Check (OWASP defense against brute force/scraping)
    const rateCheck = checkRateLimit(RATE_LIMIT_RULES.SEARCH_CHAT, currentUser.id);
    if (!rateCheck.allowed) {
      setError(
        `⚠️ คุณค้นหาถี่เกินไป (จำกัด 30 ครั้ง/นาที) กรุณารออีก ${rateCheck.retryAfterSec} วินาที (HTTP 429 Too Many Requests)`
      );
      return;
    }

    // 2. Security & Prompt Injection Inspection
    const safetyCheck = inspectSearchSafety(value);
    if (safetyCheck.status === "blocked") {
      setError(
        `⚠️ ไม่สามารถดำเนินการกับคำค้นหานี้ได้: ${safetyCheck.flaggedReasons.join(
          ", "
        )} (Request ID: ${safetyCheck.requestId})`
      );
      return;
    }

    try {
      const result = await getConversations(safetyCheck.sanitizedQuery);
      setConversations(result);
      setError(null);
    } catch {
      setError("ค้นหาแชทไม่สำเร็จ");
    }
  }

  async function ensureConversation(): Promise<string> {
    if (currentConversationId) {
      return currentConversationId;
    }
    const conv = await createConversation("แชทแตงโมใหม่ 🍉", mode);
    setConversations([conv, ...conversations]);
    setCurrentConversation(conv.id);
    return conv.id;
  }

  async function handleSubmit(content: string, rawFiles: File[] = []) {
    setError(null);

    // Rate limiting check
    const rateRule =
      mode === "knock-analysis"
        ? RATE_LIMIT_RULES.KNOCK_ANALYSIS
        : RATE_LIMIT_RULES.SEND_CHAT;
    const rateCheck = checkRateLimit(rateRule, currentUser.id);
    if (!rateCheck.allowed) {
      setError(
        `⚠️ คำขอส่งข้อความถี่เกินไป (${rateRule.description}) กรุณารออีก ${rateCheck.retryAfterSec} วินาที (HTTP 429)`
      );
      return;
    }

    // Prompt injection check
    const safetyCheck = inspectSearchSafety(content);
    if (safetyCheck.status === "blocked") {
      setError(`⚠️ ข้อความถูกระงับ: ${safetyCheck.flaggedReasons.join(", ")}`);
      return;
    }

    setSending(true);

    try {
      const conversationId = await ensureConversation();

      // Upload local attachments
      const uploadedAttachments = await Promise.all(
        attachments.map((attachment) => uploadFile(attachment.file, mode)),
      );

      const temporaryUserMessage: ChatMessageType = {
        id: "msg-" + Date.now() + "-user",
        conversationId,
        role: "user",
        content,
        attachments: uploadedAttachments,
        createdAt: new Date().toISOString(),
        status: "completed",
      };

      addMessage(temporaryUserMessage);
      clearAttachments();

      const assistantMessage = await sendMessage({
        conversationId,
        content,
        mode,
        attachmentIds: uploadedAttachments.map((item) => item.id),
        attachments: uploadedAttachments,
        rawFiles,
        allowTraining,
      });

      addMessage(assistantMessage);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      );
    } finally {
      setSending(false);
    }
  }

  async function handleTranscribe(file: File) {
    const result = await transcribeAudio(file);
    return result.text;
  }

  const activeConv = conversations.find((c) => c.id === currentConversationId);

  return (
    <div className="flex h-dvh overflow-hidden bg-[#FFFEF8]">
      {/* Sidebar */}
      <ChatSidebar
        conversations={conversations}
        onNewChat={handleNewChat}
        onSearch={handleSearch}
        onNavigate={onNavigate}
        currentRoute={currentRoute}
      />

      {/* Main Chat Workspace */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-lime-100 bg-white/95 px-4 shadow-2xs backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-xl p-2 text-gray-700 hover:bg-lime-50 lg:hidden transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="เปิดเมนูนำทาง"
            >
              <Menu size={22} />
            </button>

            <div>
              <h1 className="font-bold text-green-950 text-base sm:text-lg flex items-center gap-2">
                <span>{activeConv?.title || "น้องแตงโม AI"}</span>
              </h1>
              <p className="text-xs text-gray-500">
                วิเคราะห์ความสุกจากเสียงเคาะ · ตรวจรูปภาพ · ถอดเสียงพูด
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCalibrationOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
              title="สอบเทียบไมโครโฟนและปรับจูนความถี่สายพันธุ์"
            >
              <Sliders size={15} />
              <span className="hidden sm:inline">สอบเทียบเสียง</span>
            </button>

            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>พร้อมรับเสียงเคาะ</span>
            </span>

            <button
              type="button"
              onClick={handleNewChat}
              className="rounded-xl p-2 text-gray-500 hover:bg-lime-50 hover:text-green-800 transition-colors"
              title="เริ่มแชทใหม่"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs sm:text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-800 underline text-xs ml-2"
            >
              ปิด
            </button>
          </div>
        )}

        {/* Messages Scroll Area */}
        <section className="flex-1 overflow-y-auto" aria-live="polite">
          <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:py-8">
            {messages.length === 0 ? (
              <EmptyChat onSelectPrompt={(text) => handleSubmit(text)} />
            ) : (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onReport={setReportMessageId}
                />
              ))
            )}

            {/* AI thinking state */}
            {isSending && (
              <div className="flex items-center gap-2.5 text-sm text-green-900 bg-lime-100/70 w-fit px-4 py-2.5 rounded-2xl animate-pulse">
                <span className="text-base animate-bounce">🍉</span>
                <span>น้องแตงโม AI กำลังฟังและประมวลผลคลื่นเสียง...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </section>

        {/* Composer Bottom Area */}
        <ChatComposer
          onSubmit={handleSubmit}
          onTranscribe={handleTranscribe}
        />
      </main>

      {/* Message Report Modal */}
      {reportMessageId && (
        <ReportDialog
          messageId={reportMessageId}
          onClose={() => setReportMessageId(null)}
        />
      )}

      {/* Acoustic Calibration Modal */}
      <AcousticCalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
      />
    </div>
  );
}

function EmptyChat({
  onSelectPrompt,
}: {
  onSelectPrompt: (text: string) => Promise<void>;
}) {
  const prompts = [
    {
      title: "🍉 วิเคราะห์เสียงเคาะแตงโม",
      desc: "เคาะ 3–5 ครั้งในที่เงียบเพื่อวัดความกังวานและความหวาน Brix",
      prompt: "ช่วยวิเคราะห์เสียงเคาะแตงโมลูกนี้ให้หน่อย กำลังเคาะส่งเสียงให้ฟังครับ",
    },
    {
      title: "🔍 ตรวจดูลักษณะภายนอกและขั้ว",
      desc: "วิธีสังเกตขั้วแตงโมแห้งงอ และรอยแต้มดินสีครีม",
      prompt: "ขั้วแตงโมกับรอยแต้มดิน (Ground Spot) บ่งบอกความสุกอย่างไรบ้าง?",
    },
    {
      title: "🌱 แนะนำพันธุ์กินรี vs ตอร์ปิโด",
      desc: "เปรียบเทียบเนื้อสัมผัส ความแน่น และความหวาน",
      prompt: "เปรียบเทียบแตงโมพันธุ์กินรีกับตอร์ปิโด แบบไหนหวานกรอบกว่ากัน?",
    },
    {
      title: "🎙️ วิธีบันทึกเสียงเคาะที่ถูกต้อง",
      desc: "ระยะห่างไมค์ สภาพแวดล้อม และแรงเคาะที่เหมาะสม",
      prompt: "วิธีบันทึกเสียงเคาะแตงโมที่ถูกต้องควรจ่อไมค์ห่างกี่เซนติเมตร และเคาะด้วยอะไร?",
    },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center py-10 sm:py-16 text-center">
      <div className="relative">
        <div className="grid h-24 w-24 place-items-center rounded-[32px] bg-linear-to-b from-lime-200 to-lime-300 text-5xl shadow-md border-2 border-white">
          🍉
        </div>
        <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-green-700 text-white shadow-xs">
          <Sparkles size={14} />
        </span>
      </div>

      <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold text-green-950 tracking-tight">
        สวัสดีครับ! วันนี้มีแตงโมมาให้ฟังไหม?
      </h2>

      <p className="mt-2 max-w-md text-sm sm:text-base text-gray-600 leading-relaxed">
        ส่งข้อความ รูปภาพ แนบไฟล์ หรือกดปุ่มไมโครโฟนเพื่อส่งเสียงเคาะแตงโมมาให้น้องแตงโม AI วิเคราะห์ได้ทันที
      </p>

      <div className="mt-8 grid w-full gap-3 sm:grid-cols-2 text-left">
        {prompts.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => onSelectPrompt(item.prompt)}
            className="group rounded-2xl border border-lime-200/90 bg-white p-4 shadow-2xs hover:border-green-600 hover:bg-lime-50/60 hover:shadow-xs transition-all cursor-pointer"
          >
            <p className="font-bold text-green-950 text-sm group-hover:text-green-800">
              {item.title}
            </p>
            <p className="mt-1 text-xs text-gray-500 leading-5">
              {item.desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
