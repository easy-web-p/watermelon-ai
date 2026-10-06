/**
 * Typed client for the Watermelon AI REST API (`server.ts`).
 *
 * In the browser the base URL is relative so Vite's dev proxy and the
 * production Express server both work without configuration. Inside the
 * Capacitor WebView there is no origin to be relative to, so
 * `VITE_API_BASE_URL` must point at the deployed API.
 */

import type { ClassMetrics, DetectionStatus, DiseaseDetection } from './diseaseModel';
import type { VisionEngineList, VisionEngineName } from './visionEngines';

const RAW_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
export const API_BASE = `${RAW_BASE}/api/v1`;

/** Mirrors `RETRYABLE_STATUS` in `server.ts`. */
const RETRYABLE_STATUS = new Set([408, 425, 429, 502, 503, 504]);

/**
 * A request the server received and refused.
 *
 * Branch on `code`, not on `message`: the message is Thai prose written for
 * the farmer and gets reworded without warning. `requestId` is worth
 * showing beside an unexpected failure - it is the only handle anyone has
 * on the server-side log line for that request.
 */
export class ApiError extends Error {
  readonly status: number;
  /** Stable machine-readable reason, e.g. `ACOUSTIC_SERVICE_UNAVAILABLE`. */
  readonly code: string;
  /** Whether sending the identical request again could succeed on its own. */
  readonly retryable: boolean;
  /** Server-side correlation id, when the server supplied one. */
  readonly requestId?: string;

  constructor(
    message: string,
    status: number,
    options: { code?: string; retryable?: boolean; requestId?: string } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = options.code ?? 'REQUEST_FAILED';
    this.retryable = options.retryable ?? RETRYABLE_STATUS.has(status);
    this.requestId = options.requestId;
  }
}

/** Thrown when the request never reached the server (offline, DNS, CORS). */
export class NetworkError extends Error {
  constructor(message = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบสัญญาณอินเทอร์เน็ต') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Thrown when the server was reachable but took longer than `timeout`.
 *
 * Kept distinct from `NetworkError`: a farmer on a weak signal who is told
 * "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" will check their connection, when the real
 * answer is that the analysis is slow and retrying may work.
 */
export class TimeoutError extends Error {
  constructor(message = 'เซิร์ฟเวอร์ใช้เวลานานเกินกำหนด กรุณาลองใหม่อีกครั้ง') {
    super(message);
    this.name = 'TimeoutError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** Milliseconds before the request is aborted. */
  timeout?: number;
};

/** Set by the auth store so every request carries the signed-in identity. */
let authHeaders: Record<string, string> = {};

export function setAuthHeaders(headers: Record<string, string>) {
  authHeaders = headers;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, timeout = 20_000 } = options;

  // A signal that has already fired never dispatches another `abort`, so
  // listening for one let the request go out after the caller gave up.
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  }

  // Compose the caller's signal with our own timeout so either can abort.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...authHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    // Our own timeout fired. This used to surface as NetworkError, which
    // blamed the farmer's signal for a slow server.
    if (timedOut) throw new TimeoutError();
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const reported =
      payload && typeof payload === 'object' && 'error' in payload ? (payload as { error: unknown }).error : null;

    // `{ error: { code, message, retryable, requestId } }` is the shape the
    // server sends now. A bare `{ error: 'ข้อความ' }` is what earlier builds
    // sent, and a response held by an older service worker can still be
    // one, so both are read rather than only the current shape.
    const envelope = reported && typeof reported === 'object' ? (reported as Record<string, unknown>) : null;
    const message =
      (typeof envelope?.message === 'string' ? envelope.message : null) ??
      (typeof reported === 'string' ? reported : null) ??
      `คำขอไม่สำเร็จ (รหัส ${response.status})`;

    throw new ApiError(message, response.status, {
      code: typeof envelope?.code === 'string' ? envelope.code : undefined,
      retryable: typeof envelope?.retryable === 'boolean' ? envelope.retryable : undefined,
      // The header is set on every response, so it survives a body that
      // never made it through JSON.parse.
      requestId:
        (typeof envelope?.requestId === 'string' ? envelope.requestId : null) ??
        response.headers.get('X-Request-Id') ??
        undefined,
    });
  }

  if (response.ok && payload === null) {
    const isHtml = text.trim().startsWith('<') || (response.headers.get('content-type') ?? '').includes('text/html');
    if (isHtml) {
      throw new ApiError(
        'เซิร์ฟเวอร์ API ยังไม่เปิดให้บริการ หรือกำลังเชื่อมต่อระบบภายนอก',
        502,
      );
    }
  }

  return payload as T;
}

/* ───────────────────────────── Types ───────────────────────────── */

export type ApiUser = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: string;
  avatar?: string;
  organization?: string;
};

/**
 * Acoustic ripeness analysis.
 *
 * No acoustic model is deployed, so no endpoint returns this any more:
 * `mode: 'knock-analysis'` answers 503 rather than invent a frequency and a
 * Brix reading (see `api.acousticModelStatus`). The type stays because
 * conversations stored by earlier builds still carry one, and those records
 * are read back when a thread is restored.
 *
 * Every field is declared required because that is what a working service
 * would return — but a record read out of the database may be missing any
 * of them, `probabilities` and `resonanceDecayRate` most often. Anything
 * rendering a stored analysis has to tolerate that; `KnockResultCard` does.
 */
export type KnockAnalysis = {
  maturityClass: string;
  maturityGrade: number;
  confidence: number;
  qualityStatus: string;
  detectedImpacts: number;
  dominantFrequencyHz: number;
  snrDb: number;
  sweetnessEstimateBrix: number;
  resonanceDecayRate: number;
  probabilities: { unripe: number; ripe: number; overripe: number };
  recommendations: string[];
};

export type ApiMessage = {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments: ApiAttachment[];
  knockAnalysis?: KnockAnalysis;
  /** Present when this turn carried a leaf photo the vision model read. */
  diseaseDetection?: DiseaseDetection;
  createdAt: string;
  status: string;
  responseTimeMs?: number;
  modelVersion?: string;
};

export type ApiConversation = {
  id: string;
  userId?: string;
  title: string;
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  chatMode: string;
  messageCount: number;
};

export type ApiAttachment = {
  id: string;
  type: 'image' | 'audio';
  name: string;
  mimeType: string;
  url: string;
};

/**
 * Vision diagnosis. The shape is defined in `diseaseModel.ts` next to the
 * confidence thresholds that produce it, so the thresholds and the payload
 * can never be changed independently.
 *
 * Read `status` before anything else: on `inconclusive` and `healthy` there is
 * no disease and `disease_id` is null. Treat `confidence_percentage` as the
 * model's raw softmax score, not a calibrated probability.
 */
export type {
  DiseaseDetection,
  DetectionStatus,
  ModelClass,
  ClassMetrics,
  // Engine v3: the evidence a caller needs in order to doubt a verdict.
  PhotoQuality,
  LesionMeasurement,
  EvidenceRegion,
  Aggregation,
  VisionPrediction,
} from './diseaseModel';
/** How each status should read. Renderers switch on this, never on the raw status. */
export { STATUS_PRESENTATION } from './diseaseModel';
export {
  MODEL_METRICS,
  MODEL_SUMMARY,
  MODEL_CLASSES,
  /** Thai labels for the `scores` keys, which are raw English model labels. */
  MODEL_CLASS_THAI,
  OUT_OF_SCOPE_DISEASES,
  MIN_DISEASE_CONFIDENCE,
  MIN_HEALTHY_CONFIDENCE,
  modelCoverage,
} from './diseaseModel';

export type VisionComparePrediction = {
  class_id?: string;
  predicted_class?: string;
  confidence?: number;
  confidence_percentage?: number;
  engine?: string;
  explanation?: string;
  reasons?: string[];
  findings?: string[];
  raw_scores?: Record<string, number>;
  leaf_check?: {
    is_leaf?: boolean;
    confidence?: number;
    reason?: string;
  };
  [key: string]: unknown;
};

export type VisionCompareResponse = {
  success: boolean;
  engine: VisionEngineName;
  prediction: VisionComparePrediction;
  disclaimer: string;
};

export type DiseaseRecord = {
  id: string;
  detectedAt: string;
  farmId: string;
  notes: string;
  status: DetectionStatus;
  /** `null` for healthy and inconclusive scans. */
  disease_id: string | null;
  thai_name: string;
  confidence_percentage: number;
  severity: string;
  severity_level: number;
  urgent_action: string;
  phi_days: number | null;
  model_version: string;
  /**
   * `false` for rows written before the vision model was wired up, when the
   * endpoint chose a disease at random. Their numbers mean nothing — show
   * `unverified_note` instead of the confidence figure.
   */
  from_verified_model: boolean;
  unverified_note?: string;
};

/** One `src/data/diseases.ts` entry plus whether the model can detect it. */
export type DiseaseCatalogEntry = {
  id: string;
  name: string;
  latin: string;
  pathogen: string;
  category: string;
  severity: string;
  yieldLoss: string;
  symptoms: string[];
  conditions: string;
  chemical: string;
  biological: string;
  cultural: string;
  phi: number;
  detectable_from_photo: boolean;
  model_metrics: ClassMetrics | null;
};

export type DiseaseCatalog = {
  success: boolean;
  count: number;
  model: {
    architecture: string;
    accuracy: number;
    macroF1: number;
    testImages: number;
    provenance: string;
    detectable_count: number;
    out_of_scope_diseases: { id: string; name: string }[];
  };
  diseases: DiseaseCatalogEntry[];
};

/**
 * Whether knock (acoustic) analysis can be used at all.
 *
 * Always `online: false` in this build — there is no acoustic model, and
 * the chat and scanner paths return 503 rather than invent a frequency and
 * a Brix reading. Call this before showing a microphone button so the
 * farmer is told up front instead of after recording.
 */
export type AcousticModelStatus = {
  success: boolean;
  online: boolean;
  error?: string;
  detail?: string;
  code?: string;
};

/** Liveness of the Python vision service behind the Node API. */
export type DiseaseModelStatus = {
  success: boolean;
  online: boolean;
  error?: string;
  vision?: {
    model_loaded: boolean;
    model_version: string;
    architecture: string;
    device: string;
    classes: string[];
    /** Absent from a v2 service. See `fastapi_service/inference.py`. */
    engine_version?: string;
    modes?: string[];
    default_mode?: string;
    /**
     * `fitted: false` means `confidence` is a raw softmax score rather than a
     * probability, and reads higher than the real hit rate.
     */
    calibration?: { temperature: number; fitted: boolean; note: string };
    aggregation?: {
      tile_suspicion_threshold: number;
      tile_min_tissue_fraction: number;
      rule: string;
    };
  };
  benchmark: typeof import('./diseaseModel').MODEL_SUMMARY;
};

export type ApiVariety = {
  id: string;
  name: string;
  minRipeHz: number;
  maxRipeHz: number;
  targetBrix: number;
  unripeThresholdHz: number;
  overripeThresholdHz: number;
  description: string;
  shape: string;
  rindType: string;
};

export type ChatMode = 'general' | 'knock-analysis' | 'transcription' | 'disease-diagnosis';

/* ───────────────────────────── Endpoints ───────────────────────────── */

export const api = {
  health: () =>
    request<{ status: string; service: string; uptimeSeconds: number; environment: string }>('/health', {
      timeout: 5_000,
    }),

  /* Conversations */
  listConversations: () => request<ApiConversation[]>('/conversations'),

  createConversation: (body: { title?: string; chatMode?: ChatMode }) =>
    request<ApiConversation>('/conversations', { method: 'POST', body }),

  listMessages: (conversationId: string) =>
    request<ApiMessage[]>(`/conversations/${encodeURIComponent(conversationId)}/messages`),

  /**
   * Sends one chat turn. Pass `imageBase64` (or `attachment_ids` from
   * `uploadFile`) to have the vision model read a leaf photo: the reply then
   * carries `diseaseDetection` alongside the text, and both are persisted in
   * the conversation. Rejects with 503 when the vision service is unreachable
   * rather than answering from text alone.
   */
  sendMessage: (
    conversationId: string,
    body: {
      content: string;
      mode?: ChatMode;
      attachment_ids?: string[];
      imageBase64?: string;
      allow_training?: boolean;
    },
  ) =>
    request<ApiMessage>(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      body,
      timeout: 45_000,
    }),

  deleteConversation: (conversationId: string) =>
    request<{ success: boolean }>(`/conversations/${encodeURIComponent(conversationId)}`, { method: 'DELETE' }),

  /* Uploads */
  uploadFile: (body: { name: string; mimeType: string; fileData: string }) =>
    request<ApiAttachment>('/files', { method: 'POST', body, timeout: 60_000 }),

  /* Vision & acoustics */
  /**
   * `mode` picks the accuracy/latency trade in the vision engine: `fast` reads
   * the whole frame once, `balanced` and `deep` also score overlapping crops,
   * which is what finds a lesion too small to survive the full-frame resize.
   * Omit it to use whatever the service was configured with. An unknown value
   * is ignored rather than rejected.
   */
  detectDisease: (body: {
    imageBase64: string;
    farmId?: string;
    notes?: string;
    mode?: 'fast' | 'balanced' | 'deep';
    /**
     * เครื่องยนต์ที่จะใช้อ่านภาพ ละไว้เพื่อใช้ค่าเริ่มต้นของเซอร์วิส (`legacy4`)
     *
     * ชื่อที่เซอร์วิสไม่รู้จักจะถูกตอบ 422 ไม่ใช่ถอยไปใช้ตัวเริ่มต้นเงียบ ๆ
     * เพราะแต่ละตัวตีความตัวเลข `confidence` ต่างกัน — `legacy4` ปรับเทียบแล้ว
     * ส่วนตัวอื่นยังไม่ ดูข้อดีข้อจำกัดรายตัวจาก `visionEngines()`
     *
     * `claude` ต้องใช้เวลานานกว่าหลายเท่าและมีค่าใช้จ่ายต่อการเรียก
     * จึงควรให้ผู้ใช้เลือกเอง ไม่ตั้งเป็นค่าเริ่มต้น
     */
    engine?: VisionEngineName;
  }) =>
    request<DiseaseDetection>('/watermelon/disease-detect', {
      method: 'POST',
      body,
      // claude ที่ effort สูงใช้เวลาคิดนานกว่าโมเดลจำแนกมาก
      timeout: body.engine === 'claude' ? 180_000 : 60_000,
    }),

  /**
   * เครื่องยนต์ที่เปิดใช้ได้ พร้อมข้อดีข้อจำกัดของแต่ละตัว
   *
   * ให้หน้าจอแสดงตัวเลือกจากของจริงที่เซอร์วิสมี ไม่ใช่รายชื่อที่ hard-code ไว้
   * `calibrated` คือฟิลด์ที่สำคัญที่สุด: ถ้าเป็น false ห้ามเขียนกำกับว่าตัวเลข
   * ความมั่นใจคือความน่าจะเป็น
   */
  visionEngines: () => request<VisionEngineList>('/watermelon/vision-engines', { timeout: 8_000 }),

  /**
   * อ่านภาพเดียวด้วยเครื่องยนต์ที่ระบุ คืนผลดิบและข้อสังเกตจากเซอร์วิส
   * สำหรับเปรียบเทียบมุมมองของแต่ละ engine โดยไม่ปะปนกับคำวินิจฉัยหลัก
   */
  visionCompare: (body: {
    imageBase64: string;
    engine?: VisionEngineName;
    mode?: 'fast' | 'balanced' | 'deep';
    notes?: string;
  }) =>
    request<VisionCompareResponse>('/watermelon/vision-compare', {
      method: 'POST',
      body,
      timeout: body.engine === 'claude' ? 180_000 : 60_000,
    }),

  diseaseCatalog: () => request<DiseaseCatalog>('/watermelon/disease-catalog'),

  /**
   * Whether the vision service is reachable. Returns 503 when it is not, so
   * a screen can disable its camera button instead of failing on submit.
   */
  diseaseModelStatus: () => request<DiseaseModelStatus>('/watermelon/disease-model', { timeout: 8_000 }),

  /**
   * Resolves to `{ online: false }` instead of rejecting, so a screen can
   * branch on one value without a try/catch around its own render path.
   * The 503 body is the answer here, not a failure.
   */
  acousticModelStatus: async (): Promise<AcousticModelStatus> => {
    try {
      return await request<AcousticModelStatus>('/watermelon/acoustic-model', { timeout: 8_000 });
    } catch (error) {
      if (error instanceof ApiError && error.status === 503) {
        return { success: false, online: false, error: error.message };
      }
      throw error;
    }
  },

  diseaseHistory: () =>
    request<{ success: boolean; count: number; unverifiedCount: number; records: DiseaseRecord[] }>(
      '/watermelon/disease-history',
    ),

  varieties: () => request<ApiVariety[]>('/varieties'),

  /* Auth */
  sendOtp: (phone: string) =>
    request<{ success: boolean; sessionToken: string; message: string; demoCode?: string }>('/auth/otp/send', {
      method: 'POST',
      body: { phone },
    }),

  verifyOtp: (body: { sessionToken: string; code: string; phone: string }) =>
    request<{ success: boolean; user: ApiUser; token: string }>('/auth/otp/verify', { method: 'POST', body }),

  socialLogin: (body: { provider: 'google' | 'line'; email?: string; name?: string; avatar?: string }) =>
    request<{ success: boolean; user: ApiUser; token: string }>('/auth/social', { method: 'POST', body }),

  login: (body: { identifier: string; password?: string }) =>
    request<{ success: boolean; user: ApiUser; token: string }>('/auth/login', { method: 'POST', body }),

  register: (body: {
    name: string;
    phone: string;
    email?: string;
    password?: string;
    province?: string;
    cultivar?: string;
    plotSize?: string;
  }) =>
    request<{ success: boolean; user: ApiUser; token: string }>('/auth/register', { method: 'POST', body }),

  me: () => request<{ success: boolean; user: ApiUser }>('/auth/me'),

  /* PDPA */
  updateConsent: (body: Record<string, boolean>) =>
    request<unknown>('/users/me/consent', { method: 'PATCH', body }),

  exportMyData: () => request<unknown>('/pdpa/export-my-data', { timeout: 60_000 }),

  forgetMe: (body: { confirm: boolean }) => request<unknown>('/pdpa/forget-me', { method: 'POST', body }),

  /* Feedback */
  submitReport: (body: Record<string, unknown>) =>
    request<{ success?: boolean; id?: string; reportId?: string }>('/feedback/reports', { method: 'POST', body }),
};
