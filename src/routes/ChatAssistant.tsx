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
import { GeminiApiKeyModal } from '../components/domain/GeminiApiKeyModal';
import { configuredGeminiKey, setGeminiApiKey, clearGeminiApiKey } from '../lib/statelessChatEngine';
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
import { FALLBACK_ENGINES, type VisionEngineInfo, type VisionEngineName } from '../lib/visionEngines';
import {
  getLocalMessages,
  mergeServerAndLocalVisionMessages,
  rememberConversationId,
  restoreConversationId,
  saveLocalMessages,
  toFeedMessage,
  verifyConversationOwnership,
  type ConversationOwnership,
} from '../lib/chatHistory';
import { compressImage, recordingToPcm, useKnockRecorder, validateImage } from '../lib/media';
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
  modelVersion?: string;
  createdAt?: string;
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

function AssistantBar({
  onTool,
  ownership,
  geminiKey,
  onOpenApiKeyModal,
}: {
  onTool: (tool: 'photo' | 'disease' | 'chemicals') => void;
  ownership?: ConversationOwnership | null;
  geminiKey: string | null;
  onOpenApiKeyModal: () => void;
}) {

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 bg-surface-lowest/80 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <MelonAvatar size={28} />
          <span className="absolute right-0 bottom-0 size-3 animate-pulse rounded-full bg-secondary ring-2 ring-surface-lowest" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-title-md leading-tight font-bold text-on-surface">น้องแตงโม AI</span>
            <Badge tone="primary">v2.4 Pro</Badge>
            <button
              type="button"
              onClick={onOpenApiKeyModal}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all cursor-pointer shadow-xs active:scale-95',
                geminiKey
                  ? 'bg-secondary-container text-on-secondary-fixed-variant hover:bg-secondary hover:text-on-secondary'
                  : 'bg-primary/10 text-primary hover:bg-primary hover:text-on-primary',
              )}
              title={geminiKey ? 'Gemini 3.8 Flash: เปิดใช้งานคีย์ส่วนตัวแล้ว (คลิกเพื่อแก้ไข/ลบ)' : 'คลิกเพื่อตั้งค่า Gemini API Key (ฟรี)'}
            >
              <Icon name="key" size={13} />
              <span>{geminiKey ? 'Gemini 3.8 Active' : 'ตั้งค่า Gemini Key'}</span>
            </button>
            {ownership && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors',
                  ownership.isOwner
                    ? 'bg-secondary-container/70 text-on-secondary-fixed-variant'
                    : 'bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold',
                )}
                title={`สถานะความเป็นเจ้าของ: ${ownership.ownerLabel}`}
              >
                <Icon name={ownership.isOwner ? 'verified' : 'warning'} size={13} />
                <span>{ownership.isOwner ? 'ประวัติของคุณ' : 'เซสชันอื่น'}</span>
              </span>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-caption text-secondary">
            <span className="size-1.5 rounded-full bg-secondary" />
            ผู้ช่วยคัดกรองอาการใบแตงโมจากภาพ พร้อมแสดงสถานะเครื่องยนต์ที่ใช้จริง
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
  onOpenApiKeyModal,
  onSelectPrompt,
}: {
  message: Message;
  initial: string;
  onRetry?: () => void;
  onOpenApiKeyModal?: () => void;
  onSelectPrompt?: (text: string) => void;
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

          {message.modelVersion === 'no-key-boundary-rule' && onOpenApiKeyModal ? (
            <div className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Icon name="key" size={18} />
                </span>
                <div className="flex-1 space-y-1">
                  <h4 className="text-label-lg font-bold text-on-surface">
                    ต้องการถามคำถามทั่วไป หรือคุยได้ไม่จำกัด?
                  </h4>
                  <p className="text-caption text-on-surface-variant leading-relaxed">
                    คุณสามารถขอรับ Gemini API Key ฟรีจาก Google AI Studio แล้วนำมาใส่ เพื่อใช้โมเดล Gemini 3.8 Flash คุยได้ทุกหัวข้อ
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pl-10">
                <button
                  type="button"
                  onClick={onOpenApiKeyModal}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-label-md font-bold text-on-primary shadow-cta hover:bg-primary-container transition-all active:scale-95"
                >
                  <Icon name="vpn_key" size={16} />
                  ตั้งค่า Gemini API Key (ฟรี)
                </button>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer inline-flex items-center gap-1 text-label-md font-semibold text-primary hover:underline px-2.5 py-1.5"
                >
                  <span>วิธีขอรับคีย์ที่ Google AI Studio</span>
                  <Icon name="open_in_new" size={14} />
                </a>
              </div>

              {onSelectPrompt ? (
                <div className="pt-2.5 border-t border-outline-variant/20 pl-10">
                  <p className="text-caption font-semibold text-outline mb-1.5">
                    หรือทดลองถามในคลังความรู้ที่ตรวจทานแล้ว (ฟรี ไม่ต้องใช้คีย์):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'ราแป้งและราน้ำค้างแก้อย่างไร?',
                      'ใบไหม้จุดดำเกิดจากอะไร?',
                      'สูตรปุ๋ยแตงโม',
                      'การให้น้ำแตงโม',
                    ].map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => onSelectPrompt(topic)}
                        className="cursor-pointer rounded-full bg-surface-lowest px-3 py-1 text-caption font-medium text-on-surface hover:bg-surface-container-high transition-colors border border-outline-variant/30"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
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
              <span>{message.visionCompare
                ? `ข้อสังเกตโดย ${message.visionCompare.engine}`
                : message.disease
                  ? `ผลวิเคราะห์โดย ${message.disease.model_version}`
                  : message.modelVersion
                    ? `คำตอบโดย ${message.modelVersion}`
                    : 'ข้อความจากระบบ'}</span>
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
  text: 'สวัสดีครับ! ผมคือน้องแตงโม AI 🍉\n\nคุยเรื่องการปลูกแตงโมได้ และส่งภาพใบเพื่อคัดกรองโรคจากเครื่องยนต์ที่เลือก โมเดลหลักรองรับ 4 คลาส ส่วนโมเดลทางเลือกให้ข้อสังเกตเพิ่มเติม\n\nอัดเสียงเคาะเพื่อวัดคุณสมบัติคลื่นเสียงได้ แต่ยังทำนายความสุกหรือ °Brix จากเสียงไม่ได้ ผล AI เป็นเครื่องมือช่วยตัดสินใจ ไม่ใช่คำวินิจฉัยยืนยัน หากบริการไม่พร้อม ระบบจะแจ้งตรง ๆ ครับ',
};

export function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const messagesRef = useRef<Message[]>([GREETING]);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<ChatMode>('general');
  const [visionEngine, setVisionEngine] = useState<VisionEngineName>('legacy4');
  const [engineList, setEngineList] = useState<readonly VisionEngineInfo[]>(FALLBACK_ENGINES);
  const [engineListError, setEngineListError] = useState<string | null>(null);
  const [showEngineModal, setShowEngineModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [geminiKey, setGeminiKey] = useState<string | null>(() => configuredGeminiKey());
  const [busy, setBusy] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string; name: string } | null>(null);

  const feedEnd = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const conversationId = useRef(restoreConversationId(() => newId('conv')));
  const lastSend = useRef<(() => void) | null>(null);
  const lastAnalysedClip = useRef<string | null>(null);

  const toast = useToast();
  const recorder = useKnockRecorder();
  const { query, path, navigate } = useRouter();
  const { initial } = useDisplayUser();
  const user = useAuth((state) => state.user);
  const allowTraining = useAuth((state) => state.consent.improveModel);
  const conversations = useChat((state) => state.conversations);
  const [acousticOnline, setAcousticOnline] = useState<boolean | null>(null);

  const activeConv = conversations.find((c) => c.id === conversationId.current);
  const ownership = verifyConversationOwnership(activeConv, user);

  useEffect(() => {
    let active = true;
    api.acousticModelStatus().then((st) => {
      if (active) setAcousticOnline(st.online);
    }).catch(() => {
      if (active) setAcousticOnline(false);
    });
    api.visionEngines().then((res) => {
      if (active) {
        setEngineList(res.engines);
        setEngineListError(null);
      }
    }).catch((error: unknown) => {
      if (active) setEngineListError(error instanceof Error ? error.message : 'โหลดรายการเครื่องยนต์ไม่ได้');
    });
    return () => { active = false; };
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
        const feedMessages = mergeServerAndLocalVisionMessages(
          history.map(toFeedMessage),
          getLocalMessages(currentThread),
        );
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

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const append = useCallback((message: Message, previewTitle?: string) => {
    const next = [...messagesRef.current, { ...message, createdAt: message.createdAt ?? new Date().toISOString() }];
    messagesRef.current = next;
    setMessages(next);
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
      userId: existing?.userId || user?.id || 'guest-anonymous',
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
  }, [mode, user?.id]);

  /* ── Text / image send ───────────────────────────────────────────── */

  const send = useCallback(
    async (text: string, image?: { dataUrl: string; name: string } | null) => {
      const trimmed = text.trim();
      const photo = image ?? null;
      if (!trimmed && !photo) return;

      // Signed-out visitors have no server-side thread by design. Send a
      // bounded copy of their device-local text turns for conversational memory.
      const history = getLocalMessages(conversationId.current)
        .filter((message) => !message.failed && message.id !== 'greeting' && message.text?.trim())
        .map((message) => ({ role: message.role, content: message.text!.trim() }))
        .slice(-12);

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
          // Vision path: every non-legacy engine is supplemental only.
          let compareData: VisionCompareResponse | undefined;
          let diseaseData: DiseaseDetection | undefined;
          let replyContent = '';

          if (visionEngine !== 'legacy4') {
            try {
              compareData = await api.visionCompare({
                imageBase64: photo.dataUrl,
                engine: visionEngine,
                notes: trimmed || 'วิเคราะห์โรคใบแตงโมผ่านแชท',
              });

              const engLabel = engineList.find((engine) => engine.name === visionEngine)?.title_th ?? visionEngine;
              const pred = compareData.prediction;
              const unusable = pred.abstain === true || pred.is_plant_image === false;
              const summary = typeof pred.summary_th === 'string' ? pred.summary_th :
                typeof pred.explanation === 'string' ? pred.explanation : '';
              replyContent = unusable
                ? `เครื่องยนต์ **${engLabel}** ยังให้ข้อสังเกตจากภาพนี้ไม่ได้ กรุณาถ่ายภาพใบแตงโมที่ชัดเจนแล้วลองใหม่ครับ`
                : `ข้อสังเกตเพิ่มเติมจาก **${engLabel}** (ไม่ใช่คำวินิจฉัย) 🍉\n\n${summary || 'ดูรายละเอียดผลอ่านภาพด้านล่าง'}\n\nคะแนนของโมเดลที่ยังไม่ปรับเทียบไม่ใช่ความน่าจะเป็นของโรค`;
            } catch (cmpErr) {
              // ห้ามถอยไปใช้เส้นทางอื่นเงียบ ๆ (AGENTS.md หัวข้อ 3 ข้อ 4)
              // ผู้ใช้เลือก Claude Vision หรือ Wide-9 มาโดยตั้งใจ ถ้าได้คำตอบจาก
              // เส้นทางอื่นแทนโดยไม่รู้ตัว จะเข้าใจว่าผลมาจากเครื่องยนต์ที่เลือก
              // ซึ่งตีความตัวเลขความมั่นใจต่างกัน (ตัวหนึ่งปรับเทียบแล้ว อีกตัวยังไม่)
              const engineLabel = engineList.find((engine) => engine.name === visionEngine)?.title_th ?? visionEngine;
              console.warn(`[chat] ${visionEngine} engine call failed`, cmpErr);
              throw new Error(`เรียกเครื่องยนต์ ${engineLabel} ไม่สำเร็จ: ${cmpErr instanceof Error ? cmpErr.message : 'ไม่ทราบสาเหตุ'}`);
            }
          }

          if (!compareData) {
            const reply = await api.sendMessage(conversationId.current, {
              content: trimmed,
              mode: 'disease-diagnosis',
              imageBase64: photo.dataUrl,
              allow_training: allowTraining,
              history,
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
            modelVersion: compareData ? undefined : diseaseData?.model_version,
          });
        } else {
          const reply = await api.sendMessage(conversationId.current, {
            content: trimmed,
            mode,
            allow_training: allowTraining,
            history,
          });
          append({
            id: reply.id,
            role: 'assistant',
            time: nowLabel(),
            text: reply.content,
            knock: reply.knockAnalysis,
            modelVersion: reply.modelVersion,
          });
        }
        void useChat.getState().loadConversations();
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ';
        const message = photo ? `ยังไม่มีผลวิเคราะห์ภาพ: ${detail}` : `ยังไม่มีคำตอบจาก AI: ${detail}`;
        toast.error(message);
        append({ id: newId('err'), role: 'assistant', time: nowLabel(), text: message, failed: true });
      } finally {
        setBusy(false);
      }
    },
    [append, mode, visionEngine, engineList, allowTraining, toast],
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

    append({ id: newId('u'), role: 'user', time: nowLabel(), text: 'บันทึกเสียงเคาะผลแตงโม' });
    recorder.reset();
    setBusy(true);

    try {
      const pcm = await recordingToPcm(clip);
      const reply = await api.analyseKnock(pcm);

      append({
        id: newId('acoustic'),
        role: 'assistant',
        time: nowLabel(),
        text: [
          'วัดคลื่นเสียงจากไฟล์นี้ได้ความถี่เด่น ' + reply.reading.dominant_frequency_hz + ' Hz จาก ' + reply.reading.impulse_count + ' จังหวะเคาะ',
          reply.reading.brix_unavailable_reason_th,
          'หากวัดค่า °Brix ด้วยรีแฟรกโตมิเตอร์แล้ว บอกตัวเลขและสายพันธุ์ที่ปลูกมาได้ ผมจะช่วยเทียบกับเป้าหมายที่คุณระบุครับ',
        ].join('\n\n'),
        modelVersion: 'FFT acoustic measurement',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'วัดเสียงไม่สำเร็จ';
      toast.error(message);
      append({ id: newId('err'), role: 'assistant', time: nowLabel(), text: message, failed: true });
    } finally {
      setBusy(false);
    }
  }, [recorder, append, toast]);

  // Fire the analysis as soon as a clip is ready, so the farmer only taps once.
  useEffect(() => {
    if (recorder.state !== 'ready' || !recorder.recording) return;
    if (lastAnalysedClip.current === recorder.recording.dataUrl) return;
    lastAnalysedClip.current = recorder.recording.dataUrl;
    void analyseKnock();
  }, [recorder.state, recorder.recording, analyseKnock]);

  useEffect(() => {
    if (recorder.error) toast.error(recorder.error);
  }, [recorder.error, toast]);

  const recording = recorder.state === 'recording';

  return (
    <AppShell>
      <div className="flex min-h-[calc(100vh-4rem)] flex-col">
        <AssistantBar
          ownership={ownership}
          geminiKey={geminiKey}
          onOpenApiKeyModal={() => setShowApiKeyModal(true)}
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

        {activeConv && !ownership.isOwner && (
          <div className="mx-4 mt-3 mb-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-900 shadow-sm dark:text-amber-200 sm:mx-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon name="warning" size={22} className="shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="text-label-md font-bold">
                  ⚠️ ตรวจสอบประวัติ: แชทนี้สร้างโดย {ownership.ownerLabel} (ไม่ใช่ของบัญชีนี้)
                </p>
                <p className="text-caption text-amber-800/80 dark:text-amber-300/80">
                  เพื่อความถูกต้องและความเป็นส่วนตัว คุณสามารถเริ่มแชทใหม่สำหรับบัญชีนี้ได้ทันที
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const newThread = useChat.getState().startNewChat();
                navigate(`/chat?thread=${newThread}`);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-label-md font-semibold text-white shadow-cta hover:bg-primary-container active:scale-95"
            >
              <Icon name="add" size={16} />
              เริ่มแชทใหม่ของคุณ
            </button>
          </div>
        )}

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
              onOpenApiKeyModal={() => setShowApiKeyModal(true)}
              onSelectPrompt={(text) => void send(text)}
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
                  disabled={!engineList.some((engine) => engine.name === 'wide9')}
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
                  disabled={!engineList.some((engine) => engine.name === 'legacy4')}
                  className={cn(
                    'cursor-pointer rounded-full px-2.5 py-1 text-caption font-bold transition-all',
                    visionEngine === 'legacy4'
                      ? 'bg-outline text-surface-lowest shadow-xs'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
                  )}
                  title={engineList.find((engine) => engine.name === 'legacy4')?.description_th ?? 'Legacy-4: โมเดลหลัก 4 คลาส'}
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
            {engineListError && <p role="alert" className="text-caption text-error px-3">โหลดเครื่องยนต์ AI ไม่สำเร็จ: {engineListError}</p>}

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
            `เปลี่ยนเครื่องยนต์ AI เป็น ${engineList.find((engine) => engine.name === eng)?.title_th ?? eng} แล้ว`,
          );
        }}
      />

      <GeminiApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        currentKey={geminiKey}
        onSaveKey={(key) => {
          setGeminiApiKey(key);
          setGeminiKey(key);
          setShowApiKeyModal(false);
          toast.success('บันทึก Gemini API Key สำเร็จ! แชทพร้อมตอบคำถามด้วยโมเดล Gemini 2.5 Flash');
        }}
        onClearKey={() => {
          clearGeminiApiKey();
          setGeminiKey(null);
          setShowApiKeyModal(false);
          toast.info('ลบ Gemini API Key แล้ว สลับกลับไปใช้โหมดคลังความรู้ฟรี');
        }}
      />
    </AppShell>
  );
}
