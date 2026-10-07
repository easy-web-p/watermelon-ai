import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { MelonAvatar } from '../components/brand/Logo';
import { Icon } from '../components/ui/Icon';
import { Badge, LiveBadge } from '../components/ui/Badge';
import { Segmented } from '../components/ui/Segmented';
import { useToast } from '../components/ui/Toast';
import { KnockResultCard } from '../components/domain/KnockResultCard';
import { DiseaseResultCard } from '../components/domain/DiseaseResultCard';
import { VisionCompareCard } from '../components/domain/VisionCompareCard';
import { VisionEngineModal } from '../components/domain/VisionEngineModal';
import { cn } from '../lib/cn';
import { useRouter } from '../lib/router';
import {
  ApiError,
  NetworkError,
  api,
  type ChatMode,
  type DiseaseDetection,
  type KnockAnalysis,
  type VisionCompareResponse,
} from '../lib/api';
import type { VisionEngineInfo, VisionEngineName } from '../lib/visionEngines';
import { FALLBACK_ENGINES } from './DiseaseScan';
import {
  getLocalMessages,
  rememberConversationId,
  restoreConversationId,
  saveLocalMessages,
  toFeedMessage,
} from '../lib/chatHistory';
import { compressImage, useKnockRecorder, validateImage } from '../lib/media';
import { useAuth, useDisplayUser } from '../store/auth';
import { useChat } from '../store/chat';
import { QUICK_PROMPTS, QUICK_TOOLS } from '../data/chat';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  time: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  knock?: KnockAnalysis;
  disease?: DiseaseDetection;
  visionCompare?: VisionCompareResponse;
  failed?: boolean;
};

const MODES = [
  { value: 'general', label: 'ปรึกษาทั่วไป' },
  { value: 'disease-diagnosis', label: 'วินิจฉัยโรค' },
] as const;

function nowLabel(): string {
  return `${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Markdown-lite: the API returns `**bold**` and `- ` bullets inside plain text. */
function RichText({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {text.split('\n').map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <span key={index} className="h-1" />;

        const bullet = /^[-•*]\s+/.test(trimmed);
        const content = bullet ? trimmed.replace(/^[-•*]\s+/, '') : trimmed;
        const parts = content.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

        const rendered = parts.map((part, partIndex) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={partIndex} className="font-bold text-on-surface">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={partIndex}>{part}</span>
          ),
        );

        return bullet ? (
          <span key={index} className="flex items-start gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>{rendered}</span>
          </span>
        ) : (
          <p key={index}>{rendered}</p>
        );
      })}
    </div>
  );
}

function AssistantBar({ onTool }: { onTool: (tool: 'photo' | 'disease' | 'chemicals') => void }) {

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 bg-surface-lowest/80 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <MelonAvatar size={28} />
          <span className="absolute right-0 bottom-0 size-3 animate-pulse rounded-full bg-secondary ring-2 ring-surface-lowest" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-title-md leading-tight font-bold text-on-surface">น้องแตงโม AI</span>
            <Badge tone="primary">v2.4 Pro</Badge>
          </div>
          <p className="flex items-center gap-1.5 text-caption text-secondary">
            <span className="size-1.5 rounded-full bg-secondary" />
            ผู้เชี่ยวชาญวิเคราะห์โรคแตงโม &amp; ศัตรูพืชอัจฉริยะ ตลอด 24 ชม.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {QUICK_TOOLS.map((tool, index) => (
          <button
            key={tool.label}
            type="button"
            onClick={() => onTool(index === 0 ? 'photo' : index === 1 ? 'disease' : 'chemicals')}
            className={cn(
              'group inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-label-md font-semibold shadow-sm transition-all duration-150 ease-tactile active:scale-[0.96]',
              tool.tone === 'tonal'
                ? 'bg-secondary-container text-on-secondary-fixed-variant hover:bg-secondary hover:text-on-secondary'
                : 'bg-surface-container text-on-surface-variant hover:bg-primary-fixed hover:text-on-primary-fixed-variant',
            )}
          >
            <Icon name={tool.icon} size={18} className="transition-transform group-hover:scale-110" />
            <span className="hidden sm:inline">{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageRow({
  message,
  initial,
  onRetry,
}: {
  message: Message;
  initial: string;
  onRetry?: () => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex items-start justify-end gap-3 pl-8 sm:pl-24">
        <div className="flex max-w-xl flex-col items-end gap-1">
          {message.imageUrl ? (
            <img
              src={message.imageUrl}
              alt="ภาพที่คุณส่ง"
              className="max-h-56 rounded-[24px_24px_6px_24px] object-cover shadow-md"
            />
          ) : null}
          {message.audioUrl ? (
            <audio controls src={message.audioUrl} className="w-64 max-w-full" aria-label="เสียงเคาะที่บันทึกไว้" />
          ) : null}
          {message.text ? (
            <div className="rounded-[24px_24px_6px_24px] bg-secondary p-4 text-on-secondary shadow-md">
              <p className="text-body-lg leading-relaxed">{message.text}</p>
            </div>
          ) : null}
          <span className="mr-2 text-caption text-outline">{message.time}</span>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary-fixed text-label-lg font-bold text-on-secondary-fixed-variant shadow-sm">
          {initial}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 pr-2 sm:pr-12">
      <span
        className={cn(
          'relative flex size-10 shrink-0 items-center justify-center rounded-full shadow-[0_4px_12px_rgba(186,0,53,0.3)]',
          message.failed ? 'bg-error text-on-error' : 'bg-primary text-on-primary',
        )}
      >
        <Icon name={message.failed ? 'error' : 'eco'} size={20} filled />
        {message.failed ? null : (
          <span className="absolute -right-1 -bottom-1 size-3.5 rounded-full bg-secondary ring-2 ring-surface" />
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div
          className={cn(
            'rounded-[6px_24px_24px_24px] p-4 shadow-card sm:p-6',
            message.failed ? 'bg-error-container/50' : 'bg-surface-lowest',
          )}
        >
          {message.text ? (
            <div className="text-body-lg leading-relaxed text-on-surface-variant">
              <RichText text={message.text} />
            </div>
          ) : null}

          {message.disease ? (
            <DiseaseResultCard result={message.disease} className={message.text ? 'mt-4' : undefined} />
          ) : message.visionCompare ? (
            <VisionCompareCard compareResult={message.visionCompare} className={message.text ? 'mt-4' : undefined} />
          ) : message.knock ? (
            <KnockResultCard result={message.knock} />
          ) : null}

          {message.failed && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-error px-4 py-2 text-label-md font-semibold text-on-error transition-transform duration-150 ease-tactile active:scale-[0.96]"
            >
              <Icon name="refresh" size={16} />
              ลองส่งใหม่
            </button>
          ) : null}
        </div>

        {message.failed ? null : (
          <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-caption text-outline">
            <div className="flex items-center gap-3">
              <span>คำตอบสร้างโดย Melon Core LLM 2.4</span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(message.text ?? '');
                }}
                className="flex cursor-pointer items-center gap-1 hover:text-on-surface"
              >
                <Icon name="content_copy" size={14} />
                คัดลอก
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span>คำตอบนี้มีประโยชน์หรือไม่?</span>
              <button type="button" aria-label="มีประโยชน์" className="cursor-pointer p-1 hover:text-secondary">
                <Icon name="thumb_up" size={16} />
              </button>
              <button type="button" aria-label="ไม่มีประโยชน์" className="cursor-pointer p-1 hover:text-error">
                <Icon name="thumb_down" size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const GREETING: Message = {
  id: 'greeting',
  role: 'assistant',
  time: '',
  text: 'สวัสดีครับ! ผมคือน้องแตงโม AI 🍉\n\nถ่ายรูปใบหรือลำต้นที่มีอาการมาให้ดู หรือพิมพ์อธิบายสิ่งที่พบในแปลงได้เลยครับ ผมจะช่วยวินิจฉัยโรค ประเมินความรุนแรง และแนะนำแผนการรักษาให้\n\n- **ถ่ายรูป** เพื่อวินิจฉัยโรคจากภาพ\n- **กดไมค์** เพื่อบันทึกเสียงเคาะวัดความสุก\n- **พิมพ์คำถาม** เรื่องการปลูก ราคาตลาด หรือการดูแลแปลง',
};

export function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<ChatMode>('general');
  const [visionEngine, setVisionEngine] = useState<VisionEngineName>('wide9');
  const [engineList, setEngineList] = useState<readonly VisionEngineInfo[]>(FALLBACK_ENGINES);
  const [showEngineModal, setShowEngineModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string; name: string } | null>(null);

  const feedEnd = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const conversationId = useRef(restoreConversationId(() => newId('conv')));
  const lastSend = useRef<(() => void) | null>(null);

  const toast = useToast();
  const recorder = useKnockRecorder();
  const { query, path, navigate } = useRouter();
  const { initial } = useDisplayUser();
  const user = useAuth((state) => state.user);
  const allowTraining = useAuth((state) => state.consent.improveModel);
  const [acousticOnline, setAcousticOnline] = useState<boolean | null>(null);

  useEffect(() => {
    api.acousticModelStatus().then((st) => setAcousticOnline(st.online)).catch(() => setAcousticOnline(false));
    api.visionEngines().then((res) => {
      if (res.engines?.length) setEngineList(res.engines);
    }).catch(() => undefined);
  }, []);

  const threadMatch = path.match(/^\/chat\/([^/?#]+)/);
  const thread = query.get('thread') || (threadMatch ? decodeURIComponent(threadMatch[1]) : null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    const currentThread = thread || restoreConversationId(() => newId('conv'));
    conversationId.current = currentThread;
    rememberConversationId(currentThread);
    useChat.getState().setActiveId(currentThread);

    let cancelled = false;
    setRestoring(true);

    // Local-first: immediately restore cached messages for zero latency and offline persistence
    const localHistory = getLocalMessages(currentThread);
    if (localHistory.length > 0) {
      setMessages([GREETING, ...localHistory]);
    } else {
      setMessages([GREETING]);
    }

    void (async () => {
      try {
        const history = await api.listMessages(currentThread);
        if (cancelled) return;
        if (!history || !Array.isArray(history) || !history.length) return;
        const feedMessages = history.map(toFeedMessage);
        setMessages([GREETING, ...feedMessages]);
        saveLocalMessages(currentThread, feedMessages);
      } catch (error) {
        if (cancelled) return;
        const isOfflineOrNotFound =
          (error instanceof ApiError && (error.status === 404 || error.status === 502)) ||
          error instanceof NetworkError;
        if (!isOfflineOrNotFound && localHistory.length === 0) {
          const detail = error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ';
          setMessages([
            GREETING,
            {
              id: 'history-error',
              role: 'assistant',
              time: '',
              text: `โหลดประวัติการสนทนาไม่สำเร็จ (${detail}) ข้อความเก่ายังอยู่บนเซิร์ฟเวอร์ ลองรีเฟรชอีกครั้งได้ครับ`,
              failed: true,
            },
          ]);
        }
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [thread]);

  // Other screens deep-link in with a question already written, e.g.
  // /chat?q=...&mode=disease-diagnosis — send it once on arrival.
  const deepLinkQuestion = query.get('q');
  const deepLinkMode = query.get('mode');
  const deepLinkSent = useRef('');

  useEffect(() => {
    if (deepLinkMode === 'disease-diagnosis' || deepLinkMode === 'general') {
      setMode(deepLinkMode);
    }
  }, [deepLinkMode]);

  useEffect(() => {
    feedEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  const append = useCallback((message: Message, previewTitle?: string) => {
    setMessages((prev) => {
      const next = [...prev, message];
      saveLocalMessages(conversationId.current, next);

      const convId = conversationId.current;
      const currentConvs = useChat.getState().conversations;
      const existing = currentConvs.find((c) => c.id === convId);

      const title =
        existing?.title ||
        previewTitle ||
        (message.role === 'user'
          ? message.text
            ? message.text.slice(0, 30)
            : message.imageUrl
              ? 'ตรวจโรคจากภาพถ่าย'
              : 'บันทึกเสียงเคาะ'
          : 'บทสนทนากับน้องแตงโม AI');

      useChat.getState().upsertConversation({
        id: convId,
        title: title + (title.length >= 30 ? '...' : ''),
        lastMessage:
          message.text?.slice(0, 40) ||
          (message.imageUrl ? 'ส่งรูปภาพ' : message.audioUrl ? 'ส่งเสียงเคาะ' : 'ผลวิเคราะห์'),
        messageCount: (existing?.messageCount ?? 0) + 1,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPinned: existing?.isPinned ?? false,
        chatMode: existing?.chatMode ?? mode,
      });

      return next;
    });
  }, []);

  /* ── Text / image send ───────────────────────────────────────────── */

  const send = useCallback(
    async (text: string, image?: { dataUrl: string; name: string } | null) => {
      const trimmed = text.trim();
      const photo = image ?? null;
      if (!trimmed && !photo) return;

      append({
        id: newId('u'),
        role: 'user',
        time: nowLabel(),
        text: trimmed || undefined,
        imageUrl: photo?.dataUrl,
      });
      setDraft('');
      setPendingImage(null);
      setBusy(true);
      lastSend.current = () => void send(text, photo);

      try {
        if (photo) {
          // Vision path: use the selected engine (Claude Vision, Wide-9, or Legacy-4)
          let compareData: VisionCompareResponse | undefined;
          let diseaseData: DiseaseDetection | undefined;
          let replyContent = '';

          if (visionEngine === 'claude' || visionEngine === 'wide9') {
            try {
              compareData = await api.visionCompare({
                imageBase64: photo.dataUrl,
                engine: visionEngine,
                notes: trimmed || 'วิเคราะห์โรคใบแตงโมผ่านแชท',
              });

              const engLabel =
                visionEngine === 'claude'
                  ? '✨ Claude Vision (โมเดลวิเคราะห์เชิงลึกระดับสูง)'
                  : '🔬 Wide-9 (โมเดลมุมกว้าง 9 คลาส)';
              const pred = compareData.prediction;
              const predClass =
                pred?.predicted_class || pred?.class_id || 'วิเคราะห์อาการผิดปกติ';
              const conf = pred?.confidence_percentage
                ? `${pred.confidence_percentage}%`
                : pred?.confidence
                  ? `${Math.round(pred.confidence * 100)}%`
                  : '';
              const explanation = pred?.explanation
                ? `\n\n📋 **ข้อสังเกตและเหตุผลประกอบ:**\n${pred.explanation}`
                : '';

              replyContent =
                `น้องแตงโม AI ได้วิเคราะห์ภาพด้วยเครื่องยนต์ **${engLabel}** เรียบร้อยแล้วครับ 🍉\n\n` +
                `• **ข้อสังเกตอาการ:** **${predClass}** ${conf ? `(คะแนนความมั่นใจ ${conf})` : ''}` +
                explanation +
                `\n\n🌱 *ดูรายละเอียดผลวิเคราะห์และข้อแนะนำการจัดการในบัตรสังเกตอาการด้านล่างนี้ได้เลยครับ*`;
            } catch (cmpErr) {
              // ห้ามถอยไปใช้เส้นทางอื่นเงียบ ๆ (AGENTS.md หัวข้อ 3 ข้อ 4)
              // ผู้ใช้เลือก Claude Vision หรือ Wide-9 มาโดยตั้งใจ ถ้าได้คำตอบจาก
              // เส้นทางอื่นแทนโดยไม่รู้ตัว จะเข้าใจว่าผลมาจากเครื่องยนต์ที่เลือก
              // ซึ่งตีความตัวเลขความมั่นใจต่างกัน (ตัวหนึ่งปรับเทียบแล้ว อีกตัวยังไม่)
              const engineLabel = visionEngine === 'claude' ? 'Claude Vision' : 'Wide-9';
              console.warn(`[chat] ${visionEngine} engine call failed`, cmpErr);
              toast.error(`เรียกเครื่องยนต์ ${engineLabel} ไม่สำเร็จ จึงยังไม่มีผลวิเคราะห์`);
              throw cmpErr;
            }
          }

          if (!compareData) {
            const reply = await api.sendMessage(conversationId.current, {
              content: trimmed,
              mode: 'disease-diagnosis',
              imageBase64: photo.dataUrl,
              allow_training: allowTraining,
            });
            replyContent = reply.content;
            diseaseData = reply.diseaseDetection;
          }

          append({
            id: newId('a'),
            role: 'assistant',
            time: nowLabel(),
            text: replyContent,
            disease: diseaseData,
            visionCompare: compareData,
          });
        } else {
          const reply = await api.sendMessage(conversationId.current, {
            content: trimmed,
            mode,
            allow_training: allowTraining,
          });
          append({
            id: reply.id,
            role: 'assistant',
            time: nowLabel(),
            text: reply.content,
            knock: reply.knockAnalysis,
          });
        }
        void useChat.getState().loadConversations();
      } catch (error) {
        const isOffline =
          (error instanceof ApiError && (error.status === 404 || error.status === 502 || error.status === 503)) ||
          error instanceof NetworkError;

        if (isOffline) {
          let replyText: string;
          if (photo) {
            // ห้ามตอบรายการโรคพร้อมชื่อสารและค่า PHI เมื่อยังไม่ได้วิเคราะห์ภาพ
            // (AGENTS.md หัวข้อ 3 ข้อ 4 และข้อ 6)
            //
            // เวอร์ชันก่อนหน้าตอบว่า "ได้รับภาพตัวอย่างแล้ว" แล้วแจกชื่อสาร 5 ตัว
            // พร้อมค่า PHI ทั้งที่ภาพไม่เคยถูกส่งไปที่โมเดลเลย เป็นความผิดพลาด
            // ชนิดเดียวกับที่ fastapi_service/main.py อธิบายไว้ว่าเวอร์ชันเก่า
            // ของเซอร์วิสตอบด้วย random.choices() ซึ่ง "ทำให้เกษตรกรพ่นสาร
            // ที่เลือกมาด้วยเครื่องสุ่มตัวเลข"
            //
            // สิ่งที่พูดได้เมื่อวิเคราะห์ไม่ได้คือบอกว่าวิเคราะห์ไม่ได้ ไม่ใช่เดาให้
            replyText =
              'ยังวิเคราะห์ภาพนี้ไม่ได้ครับ 🍉\n\n' +
              'ระบบวิเคราะห์ภาพยังเชื่อมต่อไม่ได้ จึงยัง**ไม่มีผลวินิจฉัยสำหรับภาพที่ส่งมา** ' +
              'ภาพของคุณยังอยู่ในห้องแชทนี้ กดส่งอีกครั้งเมื่อระบบกลับมาได้เลย\n\n' +
              'ระบบจะไม่เดาชื่อโรคหรือแนะนำสารเคมีจากภาพที่ยังไม่ได้วิเคราะห์ ' +
              'เพราะการพ่นสารผิดชนิดทำให้เสียค่าใช้จ่ายโดยไม่ได้ผล และอาจมีสารตกค้างเกินมาตรฐาน\n\n' +
              'ระหว่างนี้ถ้าต้องการ สามารถพิมพ์อธิบายอาการที่เห็น เช่น สีและรูปร่างของแผล ' +
              'ตำแหน่งบนใบ และใต้ใบมีขุยหรือไม่ แล้วผมช่วยไล่ความเป็นไปได้จากคลังความรู้ให้ได้ครับ';
          } else if (trimmed.includes('ผสม') || trimmed.includes('ยา') || trimmed.includes('สาร')) {
            replyText =
              'ลำดับการผสมสารเคมีในถังพ่น (Tank Mix Order) ที่ถูกต้องตามหลักวิชาการ:\n\n' +
              '1. สารปรับสภาพน้ำ / ปรับ pH\n' +
              '2. สารชนิดผงละลายน้ำ (WP, WG, SP)\n' +
              '3. สารแขวนลอยเข้มข้น (SC, CS)\n' +
              '4. สารละลายน้ำมันเข้มข้น (EC, EW)\n' +
              '5. สารจับใบ / สารเสริมประสิทธิภาพ (Adjuvants)\n\n' +
              '⚠️ *ข้อควรระวัง: ห้ามผสมสารกลุ่มคอปเปอร์ร่วมกับกรดอะมิโน และปฏิบัติตามค่าระยะปลอดภัยก่อนเก็บเกี่ยว (PHI) บนฉลากเสมอ*';
          } else {
            replyText =
              `น้องแตงโม AI ได้รับคำถาม: "${trimmed}" 🍉\n\n` +
              '*(โหมดแสดงผลคลาวด์พรีวิว)*\n' +
              'คุณสามารถปรึกษาเรื่องโรคแตงโม ศัตรูพืช การผสมสารเคมี และการดูแลระยะแปลงได้ทันที หากต้องการเชื่อมต่อโมเดล Deep Learning เต็มรูปแบบ สามารถเปิดเซิร์ฟเวอร์ Express ในเครื่องได้ครับ';
          }

          append({
            id: newId('offline-reply'),
            role: 'assistant',
            time: nowLabel(),
            text: replyText,
          });
        } else {
          const message = error instanceof Error ? error.message : 'ส่งข้อความไม่สำเร็จ';
          toast.error(message);
          append({ id: newId('err'), role: 'assistant', time: nowLabel(), text: message, failed: true });
        }
      } finally {
        setBusy(false);
      }
    },
    [append, mode, visionEngine, allowTraining, toast],
  );

  useEffect(() => {
    if (restoring || !deepLinkQuestion || deepLinkSent.current === deepLinkQuestion) return;
    deepLinkSent.current = deepLinkQuestion;
    void send(deepLinkQuestion);
  }, [restoring, deepLinkQuestion, send]);

  /* ── Photo picking ───────────────────────────────────────────────── */

  async function handleFile(file: File | undefined) {
    if (!file) return;

    const problem = validateImage(file);
    if (problem) {
      toast.error(problem);
      return;
    }

    try {
      const dataUrl = await compressImage(file);
      setPendingImage({ dataUrl, name: file.name });
      setMode('disease-diagnosis');
      textarea.current?.focus();
    } catch {
      toast.error('เตรียมรูปภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  }

  /* ── Knock recording ─────────────────────────────────────────────── */

  const analyseKnock = useCallback(async () => {
    const clip = recorder.recording;
    if (!clip) return;

    append({ id: newId('u'), role: 'user', time: nowLabel(), audioUrl: clip.dataUrl, text: 'เสียงเคาะผลแตงโม' });
    recorder.reset();
    setBusy(true);

    try {
      // Store the clip first so the analysis has something to reference.
      const stored = await api
        .uploadFile({ name: 'knock-recording.webm', mimeType: clip.mimeType, fileData: clip.dataUrl })
        .catch(() => undefined);

      const reply = await api.sendMessage(conversationId.current, {
        content: `วิเคราะห์เสียงเคาะความยาว ${(clip.durationMs / 1000).toFixed(1)} วินาที`,
        mode: 'knock-analysis',
        attachment_ids: stored ? [stored.id] : undefined,
        allow_training: allowTraining,
      });

      append({
        id: reply.id,
        role: 'assistant',
        time: nowLabel(),
        text: reply.knockAnalysis ? undefined : reply.content,
        knock: reply.knockAnalysis,
      });
      void useChat.getState().loadConversations();
    } catch (error) {
      const isOffline =
        (error instanceof ApiError && (error.status === 404 || error.status === 502 || error.status === 503)) ||
        error instanceof NetworkError;
      if (isOffline) {
        append({
          id: newId('offline-knock'),
          role: 'assistant',
          time: nowLabel(),
          text:
            'น้องแตงโม AI ได้รับเสียงเคาะแล้วครับ 🍉\n\n' +
            '*(โหมดคลาวด์พรีวิว)*\n' +
            'โมเดล Melon Acoustic Engine กำลังเตรียมประมวลผลบนเซิร์ฟเวอร์หลัก ในเบื้องต้นสามารถสังเกตความสุกทางกายภาพร่วมด้วย:\n' +
            '- **เสียงทึบ กังวานปานกลาง (แปะๆ/ตึบๆ)**: บ่งบอกความสุกพอเหมาะ (85–90%) เหมาะสำหรับเก็บเกี่ยว\n' +
            '- **เสียงแน่น แหลมสูง (ป๊อกๆ)**: ผลยังอ่อน เนื้อแน่นแต่ความหวานยังไม่เต็มที่\n' +
            '- **เสียงหลวม กลวงต่ำ (ปุๆ)**: ผลสุกงอมเกินไป หรืออาจมีอาการไส้ล้ม/โพรงน้ำตาล\n\n' +
            '⚠️ *คำแนะนำ: ควรสังเกตการเหี่ยวของมือเกาะที่ขั้วผลและจุดแต้มดินสีครีมเข้มประกอบการตัดสินใจเก็บเกี่ยว*',
        });
      } else {
        const message = error instanceof Error ? error.message : 'วิเคราะห์เสียงไม่สำเร็จ';
        toast.error(message);
        append({ id: newId('err'), role: 'assistant', time: nowLabel(), text: message, failed: true });
      }
    } finally {
      setBusy(false);
    }
  }, [recorder, append, allowTraining, toast]);

  // Fire the analysis as soon as a clip is ready, so the farmer only taps once.
  useEffect(() => {
    if (recorder.state === 'ready' && recorder.recording) void analyseKnock();
  }, [recorder.state, recorder.recording, analyseKnock]);

  useEffect(() => {
    if (recorder.error) toast.error(recorder.error);
  }, [recorder.error, toast]);

  const recording = recorder.state === 'recording';

  return (
    <AppShell>
      <div className="flex min-h-[calc(100vh-4rem)] flex-col">
        <AssistantBar
          onTool={(tool) => {
            if (tool === 'chemicals') {
              navigate('/fertilizer');
              return;
            }
            if (tool === 'disease') {
              navigate('/disease-scan');
              return;
            }
            setMode('disease-diagnosis');
            fileInput.current?.click();
          }}
        />

        <div className="overflow-x-auto bg-surface-low px-4 py-2.5 no-scrollbar sm:px-6">
          <div className="flex min-w-max items-center gap-2">
            <span className="flex items-center gap-1 pr-1 text-caption font-semibold tracking-wider text-outline uppercase">
              <Icon name="auto_awesome" size={14} className="text-primary" />
              วิเคราะห์ด่วน:
            </span>
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                disabled={busy}
                onClick={() => void send(prompt.label)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-surface-lowest px-3 py-1.5 text-label-md text-on-surface shadow-sm transition-all duration-150 ease-tactile hover:bg-primary-fixed hover:text-on-primary-fixed-variant active:scale-[0.96] disabled:opacity-50"
              >
                <span aria-hidden="true">{prompt.emoji}</span>
                {prompt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pt-6 pb-48 sm:px-6">
          <div className="my-1 flex items-center justify-center gap-3">
            <span className="h-px w-16 bg-surface-highest" />
            <span className="rounded-full bg-surface-container px-3 py-1 text-caption text-outline">
              วันนี้ • {mode === 'disease-diagnosis' ? 'โหมดวินิจฉัยโรคพืช' : 'โหมดปรึกษาทั่วไป'}
            </span>
            <span className="h-px w-16 bg-surface-highest" />
          </div>

          {messages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              initial={initial}
              onRetry={message.failed ? () => lastSend.current?.() : undefined}
            />
          ))}

          {busy ? (
            <div className="flex items-center gap-3 pl-1">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary text-on-primary">
                <Icon name="eco" size={20} filled />
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-surface-lowest px-4 py-3 shadow-card">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="size-2 animate-bounce rounded-full bg-primary/50"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
                <span className="ml-1 text-caption text-on-surface-variant">กำลังวิเคราะห์...</span>
              </span>
            </div>
          ) : null}

          <div ref={feedEnd} />
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-surface via-surface/90 to-transparent p-4 sm:p-6 lg:left-80">
          <form
            className="pointer-events-auto mx-auto flex w-full max-w-4xl flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft, pendingImage);
            }}
          >
            {pendingImage ? (
              <div className="flex items-center gap-3 self-start rounded-lg bg-surface-lowest p-2 pr-4 shadow-card">
                <img src={pendingImage.dataUrl} alt="" className="size-14 rounded-md object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-label-lg font-semibold text-on-surface">{pendingImage.name}</p>
                  <p className="text-caption text-on-surface-variant">พร้อมส่งให้ AI วินิจฉัย</p>
                </div>
                <button
                  type="button"
                  aria-label="ลบรูปที่แนบ"
                  onClick={() => setPendingImage(null)}
                  className="cursor-pointer rounded-full p-1 text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
            ) : null}

            {recording ? (
              <div className="flex items-center gap-3 self-start rounded-full bg-error px-5 py-3 text-on-error shadow-dock">
                <span className="size-2.5 animate-pulse rounded-full bg-on-error" />
                <span className="text-label-lg font-semibold">
                  กำลังบันทึก {(recorder.elapsedMs / 1000).toFixed(1)} วิ — เคาะผลแตงโม 3 ครั้ง
                </span>
                <span className="flex h-6 items-end gap-0.5" aria-hidden="true">
                  {Array.from({ length: 12 }, (_, index) => (
                    <span
                      key={index}
                      className="w-1 rounded-full bg-on-error/80 transition-all duration-75"
                      style={{ height: `${Math.max(12, Math.min(100, recorder.level * 260 - index * 4))}%` }}
                    />
                  ))}
                </span>
                <button
                  type="button"
                  onClick={recorder.stop}
                  className="cursor-pointer rounded-full bg-on-error px-3 py-1 text-label-md font-bold text-error"
                >
                  หยุด
                </button>
              </div>
            ) : null}

            {/* Multi-Vision Engine Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-lowest/95 p-1.5 px-3 shadow-sm border border-outline-variant/30 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-caption font-bold text-primary">
                <Icon name="biotech" size={16} />
                <span>เครื่องยนต์ AI ตรวจโรค:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setVisionEngine('wide9')}
                  className={cn(
                    'cursor-pointer rounded-full px-2.5 py-1 text-caption font-bold transition-all',
                    visionEngine === 'wide9'
                      ? 'bg-secondary text-on-secondary shadow-xs'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
                  )}
                  title="Wide-9: โมเดล 9 คลาส รวมราแป้ง (ฟรี)"
                >
                  🔬 Wide-9 (9 คลาส)
                </button>
                <button
                  type="button"
                  onClick={() => setVisionEngine('legacy4')}
                  className={cn(
                    'cursor-pointer rounded-full px-2.5 py-1 text-caption font-bold transition-all',
                    visionEngine === 'legacy4'
                      ? 'bg-outline text-surface-lowest shadow-xs'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
                  )}
                  title="Legacy-4: โมเดล 4 คลาสหลัก ปรับเทียบความมั่นใจแล้ว"
                >
                  Legacy-4
                </button>
                <button
                  type="button"
                  onClick={() => setShowEngineModal(true)}
                  className="rounded-full p-1 text-on-surface-variant hover:text-primary cursor-pointer transition-colors"
                  title="ดูรายละเอียดจุดเด่นและข้อจำกัดของเครื่องยนต์แต่ละตัว"
                >
                  <Icon name="help" size={16} />
                </button>
              </div>
            </div>

            <div className="flex flex-col items-stretch justify-between gap-2 rounded-lg bg-surface-lowest p-2 pl-4 shadow-dock sm:flex-row sm:items-center sm:rounded-full sm:pl-5">
              <Segmented
                options={MODES}
                value={mode === 'knock-analysis' ? 'general' : (mode as 'general' | 'disease-diagnosis')}
                onChange={(next) => setMode(next)}
                size="sm"
                label="โหมดการตอบ"
                className="shrink-0 self-start sm:self-center"
              />

              <div className="min-w-0 flex-1 py-1">
                <textarea
                  ref={textarea}
                  rows={1}
                  value={draft}
                  disabled={busy}
                  onChange={(event) => setDraft(event.target.value)}
                  onPaste={(event) => {
                    const file = Array.from(event.clipboardData.files)[0];
                    if (file) {
                      event.preventDefault();
                      void handleFile(file);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void send(draft, pendingImage);
                    }
                  }}
                  placeholder={
                    pendingImage
                      ? 'เพิ่มคำอธิบายอาการ (ไม่บังคับ) แล้วกดส่ง...'
                      : 'แนบรูปใบ ลำต้น หรือพิมพ์อธิบายอาการโรคแตงโมที่พบ...'
                  }
                  aria-label="ข้อความถึง Watermelon AI"
                  className="max-h-24 w-full resize-none border-0 bg-transparent text-body-md text-on-surface outline-none placeholder:text-outline disabled:opacity-60"
                />
              </div>

              <div className="flex shrink-0 items-center justify-end gap-1.5">
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
                  title="ถ่ายรูปหรือเลือกภาพใบแตงโม"
                  disabled={busy}
                  onClick={() => fileInput.current?.click()}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full text-outline transition-colors hover:bg-primary-fixed hover:text-primary disabled:opacity-40"
                >
                  <Icon name="add_photo_alternate" size={20} />
                </button>
                <button
                  type="button"
                  title={
                    recording
                      ? 'หยุดบันทึกเสียง'
                      : !acousticOnline
                        ? 'ระบบเสียงเคาะอยู่ระหว่างวิจัย'
                        : 'บันทึกเสียงเคาะแตงโม'
                  }
                  disabled={busy}
                  onClick={() => {
                    if (!recording && !acousticOnline) {
                      toast.info(
                        'ระบบวิเคราะห์เสียงเคาะอยู่ระหว่างการวิจัยและพัฒนา เพื่อไม่สุ่มเดาผลให้เกษตรกร กรุณาพิมพ์ข้อความหรือส่งภาพถ่ายใบแตงโมแทนครับ',
                      );
                      return;
                    }
                    recording ? recorder.stop() : void recorder.start();
                  }}
                  className={cn(
                    'flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors disabled:opacity-40',
                    recording
                      ? 'bg-error text-on-error'
                      : 'text-secondary hover:bg-secondary-container',
                  )}
                >
                  <Icon name={recording ? 'stop' : !acousticOnline ? 'mic_off' : 'mic'} size={20} />
                </button>
                <button
                  type="submit"
                  disabled={busy || (!draft.trim() && !pendingImage)}
                  className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 text-label-lg font-semibold text-on-primary shadow-cta transition-all duration-150 ease-tactile hover:bg-primary-container active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40"
                >
                  <span className="hidden sm:inline">ส่งคำถาม</span>
                  <Icon name="send" size={18} />
                </button>
              </div>
            </div>

            <p className="flex flex-wrap items-center justify-center gap-1.5 text-center text-caption text-outline">
              <Icon name="verified_user" size={13} className="text-secondary" />
              Watermelon AI เป็นเครื่องมือช่วยตัดสินใจ — ควรปรึกษานักวิชาการเกษตรก่อนใช้สารเคมีปริมาณมาก
              {allowTraining ? <LiveBadge className="ml-1">ช่วยพัฒนาโมเดล</LiveBadge> : null}
            </p>
          </form>
        </div>
      </div>

      <VisionEngineModal
        isOpen={showEngineModal}
        onClose={() => setShowEngineModal(false)}
        engines={engineList}
        selectedEngine={visionEngine}
        onSelectEngine={(eng) => {
          setVisionEngine(eng);
          setShowEngineModal(false);
          toast.success(
            `เปลี่ยนเครื่องยนต์ AI เป็น ${eng === 'claude' ? 'Claude Vision (เทพสุด)' : eng === 'wide9' ? 'Wide-9' : 'Legacy-4'} แล้ว`,
          );
        }}
      />
    </AppShell>
  );
}
