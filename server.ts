import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { persistentDb, CloudStorageService, MAX_SIGNED_URL_TTL_SEC } from "./server-storage";
import crypto from "crypto";
import fs from "fs";
import {
  assertSecretsConfigured,
  hashOtpCode,
  hashPassword,
  isProduction,
  safeEqual,
  signJwt,
  verifyJwt,
  verifyPassword,
} from "./server-jwt";
import { DISEASES } from "./src/data/diseases";
import {
  MODEL_SUMMARY,
  OUT_OF_SCOPE_DISEASES,
  buildDetection,
  diagnosisToChatReply,
  modelCoverage,
  type DiseaseDetection,
  type VisionPrediction,
} from "./src/lib/diseaseModel";

dotenv.config();

// A production deployment without its own secrets would sign sessions and
// media URLs with values committed to this repository. Fail at boot, loudly,
// rather than serving forgeable tokens.
assertSecretsConfigured();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/**
 * Every response carries a request id, and every error answers in one shape.
 *
 * Two separate problems. A farmer reporting "it failed" had nothing to quote
 * and the log had nothing to search by, so a 500 was effectively
 * un-investigable after the fact. And error bodies had drifted into three
 * shapes - a bare `{ error }`, `{ error, code }`, and
 * `{ error, retryAfterSeconds }` - which left the client matching on Thai
 * message text to tell a temporary outage from a rejected file.
 *
 * The envelope is applied by wrapping `res.json` rather than by editing the
 * ~70 call sites that answer with an error. A missed call site would keep
 * the old shape silently; a wrapper cannot miss one.
 */
declare module "express-serve-static-core" {
  interface Request {
    /** Correlates this request across the API log and the client's report. */
    requestId: string;
  }
}

/** Statuses where repeating the identical request can succeed by itself. */
const RETRYABLE_STATUS = new Set([408, 425, 429, 502, 503, 504]);

/**
 * Code for a handler that reported only a message.
 *
 * A code is what the client branches on, so leaving it absent would push the
 * client back to reading Thai text. These are deliberately coarse - a
 * handler with something more specific to say passes its own `code`.
 */
function defaultErrorCode(status: number): string {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHENTICATED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 410:
      return "GONE";
    case 413:
      return "PAYLOAD_TOO_LARGE";
    case 415:
      return "UNSUPPORTED_MEDIA_TYPE";
    case 422:
      return "VALIDATION_FAILED";
    case 429:
      return "RATE_LIMITED";
    case 500:
      return "INTERNAL_ERROR";
    case 503:
      return "SERVICE_UNAVAILABLE";
    case 504:
      return "UPSTREAM_TIMEOUT";
    default:
      return status >= 500 ? "SERVER_ERROR" : "REQUEST_FAILED";
  }
}

app.use((req, res, next) => {
  req.requestId = `req_${crypto.randomBytes(8).toString("hex")}`;
  res.setHeader("X-Request-Id", req.requestId);

  const sendJson = res.json.bind(res);
  res.json = (body?: unknown) => {
    if (res.statusCode < 400 || body === null || typeof body !== "object" || Array.isArray(body)) {
      return sendJson(body);
    }
    const record = body as Record<string, unknown>;

    // Already enveloped, by a handler that built one itself.
    if (record.error !== null && typeof record.error === "object") return sendJson(body);
    // An error status whose body is not an error report - a 304-style
    // payload, or a handler reporting partial success. Left alone.
    if (typeof record.error !== "string") return sendJson(body);

    const { error, code, retryable, ...rest } = record;
    return sendJson({
      ...rest,
      error: {
        code: typeof code === "string" ? code : defaultErrorCode(res.statusCode),
        message: error,
        retryable: typeof retryable === "boolean" ? retryable : RETRYABLE_STATUS.has(res.statusCode),
        requestId: req.requestId,
      },
    });
  };
  next();
});

// In-memory rate limiting store for sensitive endpoints (brute-force & flood protection)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * X-Forwarded-For is a client-supplied header. Trusting it unconditionally let
 * anyone reset their own OTP budget by varying the value, which removed the
 * brute-force limit the endpoint exists to provide. It is only honoured when
 * the deployment declares it sits behind a proxy.
 */
const TRUST_PROXY = process.env.TRUST_PROXY === "true";
if (TRUST_PROXY) app.set("trust proxy", true);

function clientIpOf(req: express.Request): string {
  if (TRUST_PROXY) {
    const forwarded = req.headers["x-forwarded-for"];
    const first =
      typeof forwarded === "string"
        ? forwarded.split(",")[0]?.trim()
        : Array.isArray(forwarded)
          ? forwarded[0]?.split(",")[0]?.trim()
          : undefined;
    if (first) return first;
  }
  return req.ip || req.socket.remoteAddress || "unknown_client";
}

/** Drops windows that have already elapsed so the Map cannot grow without bound. */
function pruneRateLimitStore(now: number) {
  if (rateLimitStore.size < 1000) return;
  for (const [key, record] of rateLimitStore) {
    if (now > record.resetAt) rateLimitStore.delete(key);
  }
}

function createRateLimiter(options: { windowMs: number; max: number; message: string }) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = `${req.baseUrl || req.path}_${clientIpOf(req)}`;
    const now = Date.now();
    pruneRateLimitStore(now);

    let record = rateLimitStore.get(key);
    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + options.windowMs };
      rateLimitStore.set(key, record);
    } else {
      record.count++;
    }

    if (record.count > options.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.setHeader("Retry-After", retryAfterSeconds);
      return res.status(429).json({
        error: options.message,
        retryAfterSeconds,
      });
    }
    next();
  };
}

const otpSendLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: "คุณขอรหัส OTP ถี่เกินไป เพื่อความปลอดภัยกรุณารอ 10 นาทีแล้วลองใหม่อีกครั้ง",
});

const otpVerifyLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: "คุณพยายามยืนยันรหัส OTP ถี่เกินไป เพื่อความปลอดภัยกรุณารอสักครู่แล้วลองใหม่",
});

// Enable CORS with restricted origin allowlist in production and local dev support
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000",
      "https://localhost",
      "capacitor://localhost",
    ];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // The response body varies by Origin, so a shared cache must not reuse one
  // origin's response for another.
  res.header("Vary", "Origin");

  if (origin && (!isProduction() || allowedOrigins.includes(origin) || allowedOrigins.includes("*"))) {
    res.header("Access-Control-Allow-Origin", origin);
    // Only meaningful alongside a concrete origin; browsers reject "*" here.
    res.header("Access-Control-Allow-Credentials", "true");
  } else if (!origin) {
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Firebase-AppCheck"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

/* ────────────────────────────── Identity ──────────────────────────────────
 *
 * The signed JWT is the ONLY source of identity. Every handler used to read
 * `x-user-id` and `x-user-role` straight off the request, which meant any
 * caller could name themselves as another farmer — or hand themselves
 * `admin` — by setting a header. curl with `-H "x-user-role: admin"` was a
 * full administrator session.
 *
 * Requests without a valid token are not rejected outright, because the app is
 * usable before signing in. They all resolve to one shared, clearly-labelled
 * guest identity instead, and every endpoint that touches personal data or
 * deletes anything requires a real signed-in user.
 */

/** Shared bucket for unauthenticated callers. Owns nothing personal. */
const GUEST_USER_ID = "guest-anonymous";

type Identity = {
  sub: string;
  role: string;
  phone?: string;
  /** True when no valid token was presented. */
  isGuest: boolean;
};

type IdentifiedRequest = express.Request & { identity?: Identity };

function resolveIdentity(req: express.Request): Identity {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    const payload = verifyJwt(header.slice(7).trim());
    if (payload) {
      return {
        sub: payload.sub,
        role: typeof payload.role === "string" && payload.role ? payload.role : "user",
        phone: payload.phone,
        isGuest: false,
      };
    }
  }
  return { sub: GUEST_USER_ID, role: "guest", isGuest: true };
}

/** Memoised per request so repeated reads do not re-verify the signature. */
function identityOf(req: express.Request): Identity {
  const request = req as IdentifiedRequest;
  if (!request.identity) request.identity = resolveIdentity(req);
  return request.identity;
}

function isElevated(role: string): boolean {
  return role === "admin" || role === "super_admin";
}

/** 401 for anyone who has not signed in. */
function requireUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (identityOf(req).isGuest) {
    return res.status(401).json({
      error: "กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้",
    });
  }
  next();
}

/** 403 for anyone whose verified token does not carry an admin role. */
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const identity = identityOf(req);
  if (identity.isGuest) {
    return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้" });
  }
  if (!isElevated(identity.role)) {
    return res.status(403).json({ error: "บัญชีนี้ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ" });
  }
  next();
}

/**
 * Unique id. `"msg-" + Date.now()` collided whenever two records were created
 * in the same millisecond — which is every chat turn, since each one writes a
 * question and an answer — producing duplicate React keys in the feed.
 */
let idCounter = 0;
function newId(prefix: string): string {
  idCounter = (idCounter + 1) % 1_000_000;
  return `${prefix}-${Date.now()}-${idCounter.toString(36)}${crypto.randomBytes(3).toString("hex")}`;
}

// In-memory data store for the backend API endpoints
interface BackendConversation {
  id: string;
  userId?: string;
  title: string;
  folderId?: string;
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  chatMode: string;
  messageCount: number;
}

interface BackendMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments: any[];
  knockAnalysis?: any;
  /** Present when the message carried a leaf photo that the vision model read. */
  diseaseDetection?: DiseaseDetection;
  createdAt: string;
  status: string;
  responseTimeMs?: number;
  modelVersion?: string;
}

// The fabricated acoustic fixtures that used to sit here are gone. They
// were never referenced - nothing read `seedData` - but they described a
// capability this build does not have: a knock analysis reporting
// 12.2 Brix at 134 Hz, three specimens with cut-and-taste ground truth,
// and a named verifier, none of it measured. There is no acoustic model,
// so every knock path answers 503 (see the knock-analysis branch below).

// Persistent database connected
const db = persistentDb.getDb();

// Initialize Gemini Client if API key is present
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({ apiKey });
}

// In-memory rate limiting map for server protection
const serverRateBuckets: Record<string, number[]> = {};
function checkServerRate(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (!serverRateBuckets[key]) serverRateBuckets[key] = [];
  serverRateBuckets[key] = serverRateBuckets[key].filter((t) => now - t < windowMs);
  if (serverRateBuckets[key].length >= limit) return false;
  serverRateBuckets[key].push(now);
  return true;
}

// -------------------------------------------------------------
// Core API Endpoints
// -------------------------------------------------------------

const VARIETIES_DATA = [
  {
    id: "var-1",
    name: "พันธุ์กินรี (Khinri)",
    minRipeHz: 125,
    maxRipeHz: 146,
    targetBrix: 12.2,
    unripeThresholdHz: 162,
    overripeThresholdHz: 110,
    description: "แตงยอดนิยม เนื้อทรายแน่นหวานฉ่ำ เรโซแนนซ์ชัดเจนย่าน 134 Hz",
    shape: "กลมรี",
    rindType: "ลายเขียวเข้มสลับอ่อน",
  },
  {
    id: "var-2",
    name: "พันธุ์ซอนญ่า (Sonya)",
    minRipeHz: 120,
    maxRipeHz: 142,
    targetBrix: 12.8,
    unripeThresholdHz: 158,
    overripeThresholdHz: 108,
    description: "เนื้อละเอียดสีแดงเข้ม หวานกรอบ ความถี่เรโซแนนซ์ 130 Hz",
    shape: "กลม",
    rindType: "ผิวเขียวเข้มเกือบดำ",
  },
  {
    id: "var-3",
    name: "พันธุ์ตอร์ปิโด (Torpedo)",
    minRipeHz: 130,
    maxRipeHz: 152,
    targetBrix: 11.8,
    unripeThresholdHz: 168,
    overripeThresholdHz: 114,
    description: "ผลทรงรี เปลือกหนาปานกลาง ความถี่สูงกว่าทรงกลมเล็กน้อย 138 Hz",
    shape: "ยาวรี (ตอร์ปิโด)",
    rindType: "ลายริ้วเขียวขจี",
  },
  {
    id: "var-4",
    name: "พันธุ์ไดอาน่า (Diana)",
    minRipeHz: 132,
    maxRipeHz: 155,
    targetBrix: 11.5,
    unripeThresholdHz: 170,
    overripeThresholdHz: 115,
    description: "เปลือกสีทองเนื้อแดง เรโซแนนซ์เปลือกสะท้อนเร็ว 140 Hz",
    shape: "กลมรี",
    rindType: "เปลือกเหลืองทอง",
  },
  {
    id: "var-5",
    name: "พันธุ์ไร้เมล็ด (Seedless)",
    minRipeHz: 118,
    maxRipeHz: 138,
    targetBrix: 12.4,
    unripeThresholdHz: 154,
    overripeThresholdHz: 105,
    description: "เนื้อแน่นไม่มีเมล็ด คลื่นดูดซับสูง เสียงทุ้มก้องกว่าปกติ 128 Hz",
    shape: "กลม",
    rindType: "เขียวเข้มลายพราง",
  },
];

// 0. GET /api/v1/health
app.get("/api/v1/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Watermelon AI API",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// GET /api/v1/varieties
app.get("/api/v1/varieties", (req, res) => {
  res.json(VARIETIES_DATA);
});

// GET /api/v1/varieties/calibration
app.get("/api/v1/varieties/calibration", (req, res) => {
  res.json({
    profiles: VARIETIES_DATA,
    acousticFilter: {
      bandpass: { lowCutHz: 80, highCutHz: 600 },
      noiseGateThresholdDb: -42,
      fftSize: 2048,
    },
  });
});

// 1. GET /api/v1/conversations (Enforces Ownership & Search Defense)
app.get("/api/v1/conversations", (req, res) => {
  const { sub: currentUserId, role: userRole } = identityOf(req);

  // Rate limit: 30 requests / minute
  if (!checkServerRate(`search:${clientIpOf(req)}:${currentUserId}`, 30, 60_000)) {
    // The client reads `error` as a string; a nested object dropped the Thai
    // message and showed "คำขอไม่สำเร็จ (รหัส 429)" instead.
    return res.status(429).json({
      error: "คุณค้นหาหรือเรียกข้อมูลถี่เกินไป กรุณารอสักครู่",
      code: "RATE_LIMIT_EXCEEDED",
    });
  }

  const rawSearch = (req.query.search as string) || "";
  const normalized = rawSearch.normalize("NFKC").trim().slice(0, 200);

  // Security check: Prompt Injection & script tags
  if (
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/i.test(normalized) ||
    /<script\b[^>]*>/i.test(normalized) ||
    /DROP\s+TABLE/i.test(normalized)
  ) {
    return res.status(400).json({
      error: "ไม่สามารถดำเนินการกับคำค้นหานี้ได้",
      code: "SEARCH_NOT_ALLOWED",
      request_id: newId("req"),
    });
  }

  // Enforce ownership: a caller sees only their own conversations. The role
  // comes from the verified token, so it can no longer be claimed by header.
  let list = db.conversations;
  if (!isElevated(userRole)) {
    list = list.filter((c) => !c.userId || c.userId === currentUserId);
  }

  if (normalized) {
    const q = normalized.toLowerCase();
    list = list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  }

  res.json(list);
});

// 2. POST /api/v1/conversations
app.post("/api/v1/conversations", (req, res) => {
  const { sub: currentUserId } = identityOf(req);
  const { title = "แชทแตงโมใหม่ 🍉", mode = "general" } = req.body ?? {};
  const newConv: BackendConversation = {
    id: newId("conv"),
    userId: currentUserId,
    title,
    lastMessage: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPinned: false,
    chatMode: typeof mode === "string" ? mode : "general",
    messageCount: 0,
  };
  db.conversations.unshift(newConv);
  db.messages[newConv.id] = [];
  persistentDb.save();
  res.json(newConv);
});

// 3. GET /api/v1/conversations/:id/messages (Enforces Ownership: returns 404 if not owner)
app.get("/api/v1/conversations/:id/messages", (req, res) => {
  const { id } = req.params;
  const { sub: currentUserId, role: userRole } = identityOf(req);

  const conv = db.conversations.find((c) => c.id === id);
  if (!conv) {
    return res.status(404).json({ error: "ไม่พบรายการ" });
  }

  // Ownership check: if it belongs to someone else, return 404 to avoid
  // leaking the fact that the conversation exists at all.
  if (conv.userId && conv.userId !== currentUserId && !isElevated(userRole)) {
    return res.status(404).json({ error: "ไม่พบรายการ" });
  }

  res.json(db.messages[id] || []);
});

// DELETE /api/v1/conversations/:id
app.delete("/api/v1/conversations/:id", (req, res) => {
  const { id } = req.params;
  const { sub: currentUserId, role: userRole } = identityOf(req);

  const index = db.conversations.findIndex((c) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "ไม่พบรายการแชท" });
  }

  const conv = db.conversations[index];
  if (conv.userId && conv.userId !== currentUserId && !isElevated(userRole)) {
    return res.status(403).json({ error: "ไม่มีสิทธิ์ลบรายการนี้" });
  }

  db.conversations.splice(index, 1);
  delete db.messages[id];
  persistentDb.save();
  persistentDb.logAudit("CONVERSATION_DELETED", currentUserId, `Deleted conversation ${id}`);
  res.json({ success: true, message: "ลบการสนทนาสำเร็จ" });
});

/**
 * Intelligent Watermelon Agricultural Expert Knowledge System
 * Provides deep, accurate, structured guidance with PHI values and safe recommendations.
 */
function generateWatermelonAIExpertResponse(content: string, mode: string): string {
  const query = (content || "").toLowerCase().trim();

  // There is deliberately no knock branch here. It used to report a maturity
  // class, a resonance frequency and a Brix figure that were either hard-coded
  // defaults or Math.random() output, which a farmer reads as a measurement.
  // knock-analysis mode now returns 503 before reaching this function.

  if (mode === "transcription") {
    if (!content) {
      return "ยังไม่ได้รับข้อความที่ถอดจากเสียงครับ กรุณาลองอัดเสียงและส่งมาอีกครั้ง 🍉";
    }
    return `ถอดข้อความเสียงเรียบร้อยแล้วครับ: "${content}" 🍉`;
  }

  if (mode === "transcription") {
    return `ถอดข้อความเสียงเรียบร้อยแล้วครับ: "${content || "ช่วยฟังเสียงเคาะแตงโมลูกนี้หน่อย พันธุ์กินรีหนักสี่กิโลกรัม"}" 🍉`;
  }

  // 1. Diseases & Symptoms (โรคและอาการผิดปกติ)
  if (query.includes("ราน้ำค้าง") || query.includes("downy")) {
    return `🌿 **โรคราน้ำค้างแตงโม (Downy Mildew) — คำแนะนำจากน้องแตงโม AI** 🍉

- **สาเหตุ:** เชื้อรา *Pseudoperonospora cubensis* มักระบาดรุนแรงช่วงฤดูฝน อากาศชื้นสูง หรือหมอกลงจัด
- **อาการสังเกต:** บนผิวใบมีแผลสีเหลืองเป็นเหลี่ยมตามแนวเส้นใบ ใต้ใบพบคราบสปอร์เส้นใยสีเทาหรือสีม่วง หากระบาดรุนแรงใบจะแห้งกรอบม้วนขึ้นและต้นโทรม
- **แนวทางจัดการ:**
  1. **สารเคมีป้องกันกำจัด:** พ่นด้วย **ไดเมโทมอร์ฟ (Dimethomorph)** หรือ **แมนโคเซบ (Mancozeb)** หรือ ไซมอกซานิล
  2. **ระยะปลอดภัยก่อนเก็บเกี่ยว (PHI):** ควรงดพ่นสารอย่างน้อย **7 วัน** ก่อนเก็บเกี่ยว
  3. **ชีววิธี/เขตกรรม:** ตัดแต่งใบส่วนล่างที่มีแผลนำไปเผาทำลายนอกแปลง และปรับระบบน้ำไม่ให้ใบแฉะข้ามคืนครับ`;
  }

  if (query.includes("แอนแทรคโนส") || query.includes("anthracnose") || query.includes("ใบจุด") || query.includes("จุดดำ") || query.includes("แผลดำ")) {
    return `🌿 **โรคแอนแทรคโนสแตงโม (Anthracnose) — คำแนะนำจากน้องแตงโม AI** 🍉

- **สาเหตุ:** เชื้อรา *Colletotrichum orbiculare*
- **อาการสังเกต:** จุดแผลสีน้ำตาลกลม บนใบมีวงซ้อนกัน ขอบแผลเข้ม หากเป็นที่ผลจะมีแผลยุบตัวเป็นหลุมบุ๋มสีดำและมีเมือกสีส้ม
- **แนวทางจัดการ:**
  1. **สารเคมีป้องกันกำจัด:** พ่นด้วย **อะซ็อกซีสโตรบิน (Azoxystrobin)** กลุ่ม FRAC 11 สลับกับ **ไดฟีโนโคนาโซล (Difenoconazole)** กลุ่ม FRAC 3 เพื่อป้องกันเชื้อดื้อยา
  2. **ระยะปลอดภัยก่อนเก็บเกี่ยว (PHI):** ต้องเว้นระยะเก็บเกี่ยว **3–7 วัน**
  3. **ข้อควรระวัง:** ห้ามเก็บเกี่ยวผลผลิตขณะผลแฉะน้ำ และแยกผลที่เป็นแผลออกจากกองผลผลิตทันทีครับ`;
  }

  if (query.includes("ใบด่าง") || query.includes("ไวรัส") || query.includes("ใบหงิก") || query.includes("ยอดหด") || query.includes("ยอดกุด")) {
    return `🌿 **โรคไวรัสใบด่างแตงโม (Watermelon Mosaic Virus - WMV) & อาการยอดหงิก** 🍉

- **สาเหตุ:** เชื้อไวรัส มีแมลงพาหะสำคัญคือ **เพลี้ยไฟ** และ **เพลี้ยอ่อน**
- **อาการสังเกต:** ใบมีแถบสีเขียวเข้มสลับเขียวอ่อน ผิวใบตะปุ่มตะป่ำ ยอดหงิกงอชะงักการเจริญเติบโต ผลบิดเบี้ยว
- **แนวทางจัดการ:**
  1. โรคไวรัสไม่มียารักษาโดยตรง **ต้องถอนต้นที่เป็นโรคใส่ถุงดำนำไปทำลายนอกแปลงทันที** เพื่อไม่ให้เป็นแหล่งแพร่ระบาด
  2. **คุมแมลงพาหะ:** พ่นสารกำจัดเพลี้ยไฟ เช่น **สไปนีโทแรม (Spinetoram)** หรือ **ไดโนทีฟูแรน (Dinotefuran)** (PHI 7 วัน)
  3. ฉีดพ่นเชื้อราบิวเวอเรีย หรือใช้น้ำมันปิโตรเลียมสเปรย์ออยล์คุมไข่แมลง`;
  }

  if (query.includes("ใบเหลือง") || query.includes("ใบไหม้") || query.includes("ใบแห้ง")) {
    return `🍂 **วิเคราะห์สาเหตุอาการใบเหลืองในแตงโม — น้องแตงโม AI** 🍉

อาการใบเหลืองเกิดได้จาก 3 สาเหตุหลักครับ:
1. **โรคราน้ำค้าง (พบบ่อยที่สุด):** สังเกตแผลเหลี่ยมสีเหลือง มีผงสปอร์สีเทาใต้ใบช่วงเช้าตรู่
2. **ขาดธาตุไนโตรเจน (N) หรือ แมกนีเซียม (Mg):** ใบแก่ด้านล่างจะเริ่มเหลืองสม่ำเสมอก่อน ยอดด้านบนยังเขียวอยู่ (แก้ด้วยการให้ปุ๋ยไนโตรเจนทางราก และฉีดพ่นแมกนีเซียมทางใบ)
3. **รากเน่า/น้ำขัง:** ดินแฉะเกินไป รากขาดอากาศหายใจ ใบจะเหลืองทั้งต้นและสลดเหี่ยวตอนแดดจัด

💡 **วิธีตรวจสอบ:** พลิกดูใต้ใบเพื่อเช็กคราบเชื้อรา และถ่ายรูปใบส่งเข้ามาในแชทเพื่อให้ AI สแกนตรวจจับความแม่นยำสูงได้ทันทีครับ`;
  }

  if (query.includes("เพลี้ย") || query.includes("แมลง") || query.includes("หนอน") || query.includes("ไรแดง")) {
    return `🐛 **การจัดการแมลงศัตรูแตงโม — คำแนะนำจากน้องแตงโม AI** 🍉

- **เพลี้ยไฟ (ยอดหงิก ใบม้วนงอขึ้น):**
  - ใช้ **สไปนีโทแรม (Spinetoram 12% SC)** อัตรา 10-15 ซีซี/น้ำ 20 ลิตร หรือ ไดโนทีฟูแรน
  - พ่นช่วงเช้าหรือเย็นเน้นบริเวณยอดและใต้ใบ (PHI 7 วัน)
- **ไรแดงแตงโม (ใบมีจุดประสีบรอนซ์ขาว):**
  - ใช้ **โพรพาร์ไกต์ (Propargite)** หรือ เฮกซีไทอะซ็อกซ์ (Hexythiazox) สลับกลุ่มสาร
- **แมลงวันผลไม้ / แมลงวันแตง (หนอนเจาะผล):**
  - ติดตั้งกับดักกาวเหนียวและฟีโรโมนเมธิลยูจีนอลรอบแปลง
  - ฉีดพ่นโปรตีนเหยื่อพิษห่างจากแนวแปลง 5-10 เมตรครับ`;
  }

  // 2. Fertilizer & Nutrition (ปุ๋ยและธาตุอาหาร)
  if (query.includes("ปุ๋ย") || query.includes("ฮอร์โมน") || query.includes("บำรุง") || query.includes("ขยายผล") || query.includes("ความหวาน") || query.includes("หวาน")) {
    return `🌱 **โปรแกรมการใส่ปุ๋ยแตงโมตามระยะการเจริญเติบโต (สูตรแม่นยำ)** 🍉

1. **ระยะรองพื้น (ก่อนปลูก):**
   - ปุ๋ยคอก/ปุ๋ยหมัก 1,000–2,000 กก./ไร่ + ปุ๋ยเคมีสูตร **15-15-15** อัตรา 25 กก./ไร่
2. **ระยะทอดยอด-แตกแขนง (15–20 วันหลังย้ายกล้า):**
   - เน้นไนโตรเจนช่วยยืดเถา: **25-7-7** หรือ **46-0-0** ผสม **15-15-15** อัตรา 20–25 กก./ไร่
3. **ระยะออกดอก-ติดผล (30–35 วัน):**
   - ใส่ **15-15-15** ร่วมกับฉีดพ่น **แคลเซียม-โบรอน** ทางใบ เพื่อช่วยในการผสมเกสร ขั้วเหนียว ป้องกันผลแตกก้นเน่า
4. **ระยะขยายขนาดผล (40–50 วัน):**
   - เร่งขนาดและน้ำหนัก: ใส่สูตร **13-13-21** หรือ **14-7-35** อัตรา 25–30 กก./ไร่
5. **ระยะสร้างน้ำตาลก่อนเก็บเกี่ยว (55–60 วัน):**
   - เพิ่มความหวาน กรอบ: ใส่ **0-0-60** เล็กน้อยทางน้ำ งดปุ๋ยไนโตรเจน และ **งดน้ำ 5–7 วันก่อนเก็บเกี่ยว** จะได้ค่า Brix สูงถึง 12–13 °Brix ครับ`;
  }

  // 3. Cultivars (สายพันธุ์แตงโม)
  if (query.includes("พันธุ์") || query.includes("ตอร์ปิโด") || query.includes("กินรี") || query.includes("ซอนญ่า") || query.includes("ไดอาน่า") || query.includes("ไร้เมล็ด")) {
    return `🍉 **คู่มือลักษณะสายพันธุ์แตงโมยอดนิยมในไทย**

- **กินรี (Kinnaree):**
  - ผลทรงกลมรี ผิวลายเขียวเข้มสลับอ่อน เนื้อแดงละเอียด เมล็ดน้อย
  - อายุเก็บเกี่ยว: **60–65 วัน** | ค่าความหวานเฉลี่ย: **11–12 °Brix** | น้ำหนักผล 4–6 กก.
- **ตอร์ปิโด (Torpedo):**
  - ทรงกระบอกยาวรี เปลือกบางแต่เหนียว ทนการขนส่งระยะไกล เนื้อแน่นกรอบ
  - อายุเก็บเกี่ยว: **65–70 วัน** | ค่าความหวานเฉลี่ย: **12–13 °Brix** | น้ำหนักผล 5–8 กก.
- **ซอนญ่า (Sonya):**
  - ผลกลม ลายตอร์ปิโด เนื้อแดงสด ไส้ตันแน่น กรอบ ไม่ล้มง่าย
  - อายุเก็บเกี่ยว: **60–65 วัน** | ความหวาน: **12 °Brix**
- **ไดอาน่า (Diana) / แตงโมเปลือกเหลือง:**
  - เปลือกสีเหลืองทอง เนื้อสีแดงสด ตลาดพรีเมียมราคาดี
  - อายุเก็บเกี่ยว: **65 วัน** | ค่าความหวาน: **12–13 °Brix**
- **แตงโมไร้เมล็ด (Seedless):**
  - พันธุ์ตรีพลอยด์ ผลกลมรี เนื้อแน่นกรอบ ราคาสูง ต้องปลูกร่วมกับแตงโมพันธุ์ธรรมดา 20% เพื่อช่วยผสมเกสรครับ`;
  }

  // 4. Watering & Irrigation (การให้น้ำ)
  if (query.includes("น้ำ") || query.includes("รดน้ำ") || query.includes("น้ำหยด") || query.includes("แฉะ")) {
    return `💧 **เทคนิคการให้น้ำแตงโมให้ได้ผลผลิตเกรด A** 🍉

1. **ระยะต้นกล้าถึงแตกเถา (1–25 วัน):** ให้น้ำสม่ำเสมอทุกวันช่วงเช้า ดินชื้นพอดี ไม่แฉะขัง
2. **ระยะออกดอกผสมเกสร (30–35 วัน):** **ลดปริมาณน้ำลงเล็กน้อย** เพื่อให้เกสรติดง่าย ดอกไม่ร่วง
3. **ระยะขยายผล (38–50 วัน):** ช่วงนี้แตงโมต้องการน้ำมากที่สุด ให้น้ำวันละ 1-2 ครั้ง ดินห้ามแห้งเด็ดขาดเพราะจะทำให้ผลชะงัก
4. **ระยะก่อนเก็บเกี่ยว (55 วันขึ้นไป):** **ต้องลดและงดน้ำ 5–7 วันก่อนตัดผล** เพื่อให้ความหวานเข้มข้น เนื้อแน่น ไม่ฉ่ำน้ำจนไส้ล้มหรือผลแตกครับ`;
  }

  // 5. Ripeness & Acoustic Analysis (การดูแตงโมสุก / เสียงเคาะ)
  if (query.includes("เคาะ") || query.includes("สุก") || query.includes("ดูยังไง") || query.includes("แก่")) {
    return `🍉 **3 วิธีดูแตงโมแก่สุกพร้อมตัดขาย / รับประทาน**

1. **เสียงเคาะ (Acoustic Resonance):**
   - **เสียงตึง กังวานโปร่ง (120–150 Hz):** สุกพอดี เนื้อแน่น หวานฉ่ำ (ใช้ฟีเจอร์อัดเสียงในแอปวัดได้เลย)
   - **เสียงแปะๆ ทึบตัน (< 110 Hz):** สุกงอมเกินไป อาจเริ่มไส้ล้มหรือเละ
   - **เสียงป๊อกๆ แน่นแข็ง (> 160 Hz):** ยังอ่อน เนื้อยังไม่เข้าสี
2. **รอยแต้มดิน (Ground Spot):**
   - จุดที่ผลแตงแตะพื้นดิน ควรเปลี่ยนจากสีขาวเป็น **สีเหลืองนวลหรือเหลืองครีมเข้ม**
3. **มือเกาะ (Tendril) และขั้วผล:**
   - หนวดหรือมือเกาะข้อเดียวกับขั้วผลแตง **แห้งเป็นสีน้ำตาลไหม้เกิน 2 ใน 3** แสดงว่าแก่จัดพร้อมเก็บเกี่ยวครับ`;
  }

  // 6. Pricing & Market (ราคาตลาด)
  if (query.includes("ราคา") || query.includes("ตลาด") || query.includes("กิโล") || query.includes("ขาย")) {
    return `📊 **สรุปสถานการณ์ราคาแตงโมวันนี้ (ราคากลางประเทศไทย)** 🍉

- **ราคาหน้าสวน (คละเกรด):** ประมาณ **8.50 – 12.00 บาท/กก.**
- **เกรด A (ผลสมบูรณ์ น้ำหนัก > 4 กก. ไร้ตำหนิ):** ประมาณ **14.00 – 18.00 บาท/กก.**
- **ราคาตลาดขายส่ง (ตลาดไท / สี่มุมเมือง):** **16.00 – 22.00 บาท/กก.**
- **แตงโมพรีเมียม (ไร้เมล็ด / เปลือกเหลือง):** **25.00 – 35.00 บาท/กก.**

💡 สามารถดูราคาแยกตามตลาดและกราฟย้อนหลังได้ที่เมนู **"ราคาตลาดวันนี้"** ในแถบเมนูด้านข้างครับ`;
  }

  // General helpful watermelon assistant response
  return `สวัสดีครับ! น้องแตงโม AI ยินดีช่วยเหลือเกษตรกรและผู้บริโภคทุกท่านครับ 🍉

ผมสามารถช่วยคุณได้หลากหลายเรื่อง เช่น:
1. 📸 **วิเคราะห์โรคพืช:** ถ่ายรูปใบแตงโมส่งเข้ามา เพื่อตรวจโรคราน้ำค้าง แอนแทรคโนส หรือไวรัสใบด่าง พร้อมคำแนะนำยาและค่า PHI
2. 🎙️ **วัดความสุกจากเสียงเคาะ:** อัดเสียงเคาะผลแตงโมเพื่อประเมินความสุกและความหวาน Brix
3. 🌱 **เทคนิคการปลูกและสูตรปุ๋ย:** สอบถามสูตรปุ๋ยตามระยะ การจัดการน้ำ หรือการเลือกสายพันธุ์ (กินรี, ตอร์ปิโด, ซอนญ่า)
4. 📈 **เช็กราคาตลาด:** ตรวจสอบราคากลางผลผลิตแตงโม

ต้องการให้น้องแตงโม AI ช่วยเหลือเรื่องใดเป็นพิเศษ พิมพ์ถามหรือส่งรูปภาพมาได้เลยครับ!`;
}

/**
 * Terms that mean "spray a chemical on a crop you are going to sell".
 * Advice containing one of these must state the pre-harvest interval.
 */
const CHEMICAL_HINTS = [
  "พ่นสาร",
  "ฉีดพ่น",
  "สารเคมี",
  "ยาฆ่า",
  "สารกำจัด",
  "แมนโคเซบ",
  "อะซ็อกซีสโตรบิน",
  "ไดเมโทมอร์ฟ",
  "ไดฟีโนโคนาโซล",
  "สไปนีโทแรม",
  "ไดโนทีฟูแรน",
  "โพรพาร์ไกต์",
  "คลอร์ไพริฟอส",
  "อิมิดาคลอพริด",
  "คาร์เบนดาซิม",
];

/** Markers that a pre-harvest interval is already stated. */
const PHI_HINTS = ["PHI", "ระยะปลอดภัย", "ก่อนเก็บเกี่ยว", "หยุดพ่น", "งดพ่น"];

const PHI_FALLBACK_NOTE =
  "\n\n⏱️ **ก่อนพ่นสารเคมีทุกครั้ง:** ต้องตรวจระยะปลอดภัยก่อนเก็บเกี่ยว (PHI) ของสารตัวนั้นจาก" +
  "ฉลากข้างขวด แล้วหยุดพ่นให้ครบจำนวนวันก่อนเก็บผลขาย ข้อความนี้ยังไม่ได้ระบุค่า PHI ไว้ " +
  "จึงยังไม่ควรใช้เป็นอัตราพ่นจริง — ดูค่า PHI รายโรคได้ที่หน้า \"โรคที่ตรวจได้\" " +
  "หรือปรึกษาเจ้าหน้าที่เกษตรในพื้นที่ครับ\n\n" +
  "ℹ️ AI เป็นเครื่องมือช่วยตัดสินใจ ไม่ใช่คำวินิจฉัยยืนยัน";

/**
 * Appends the pre-harvest-interval caution when a reply recommends a
 * chemical without one. The catalogue-built replies in diseaseModel.ts
 * always include a PHI figure, but a Gemini answer is free text, so the
 * guarantee has to be enforced here rather than assumed.
 */
function ensurePhiDisclosure(reply: string): string {
  if (!reply) return reply;
  const mentionsChemical = CHEMICAL_HINTS.some((term) => reply.includes(term));
  if (!mentionsChemical) return reply;
  const statesPhi = PHI_HINTS.some((term) => reply.includes(term));
  if (statesPhi) return reply;
  return reply + PHI_FALLBACK_NOTE;
}

// 4. POST /api/v1/conversations/:id/messages
app.post("/api/v1/conversations/:id/messages", async (req, res) => {
  const { id } = req.params;
  const { content, mode, attachment_ids = [], allow_training = false, imageBase64 } = req.body ?? {};
  const now = new Date().toISOString();
  const { sub: currentUserId, role: userRole } = identityOf(req);

  if (content !== undefined && content !== null && typeof content !== "string") {
    return res.status(400).json({ error: "รูปแบบข้อความไม่ถูกต้อง" });
  }

  /**
   * Knock analysis has no model behind it yet.
   *
   * This branch used to build a complete-looking `knockAnalysis` from
   * Math.random(): a resonance frequency of 125-150 Hz, a Brix figure of
   * 11.4-12.9, a 93% confidence and a fixed "สุกพอดี" verdict - none of it
   * derived from the recording the farmer had just uploaded. The scanner
   * renders those fields as "ผลที่วัดได้ ... Hz" beside the cultivar
   * calibration band, so a farmer could decide when to cut on a dice roll.
   *
   * The vision path already returns 503 rather than guess a disease. The
   * same rule applies here: no acoustic service, no reading.
   */
  if (mode === "knock-analysis") {
    return res.status(503).json({
      error:
        "ระบบวิเคราะห์เสียงเคาะยังไม่พร้อมใช้งาน จึงยังประเมินความหวานจากเสียงให้ไม่ได้ " +
        "ระบบจะไม่เดาค่าความถี่หรือค่า Brix ให้ ระหว่างนี้ใช้การตรวจโรคจากภาพ " +
        "หรือสังเกตรอยแต้มดินและขั้วผลตามคู่มือการปลูกได้ครับ",
      code: "ACOUSTIC_SERVICE_UNAVAILABLE",
    });
  }

  let conv = db.conversations.find((c) => c.id === id);
  // Appending to another farmer's thread only needed its id: an outsider
  // could write into their history and rename the conversation.
  if (conv && conv.userId && conv.userId !== currentUserId && !isElevated(userRole)) {
    return res.status(404).json({ error: "ไม่พบรายการ" });
  }
  if (!conv) {
    conv = {
      id,
      userId: currentUserId,
      title: content ? (content.trim().slice(0, 24) + " 🍉") : "วิเคราะห์แตงโม",
      lastMessage: "",
      createdAt: now,
      updatedAt: now,
      isPinned: false,
      chatMode: mode || "general",
      messageCount: 0,
    };
    db.conversations.unshift(conv);
    db.messages[id] = [];
  } else {
    if (!conv.userId) conv.userId = currentUserId;
    if ((conv.title === "วิเคราะห์แตงโม" || conv.title.startsWith("conv-")) && content) {
      conv.title = content.trim().slice(0, 24) + " 🍉";
    }
  }
  if (!db.messages[id]) db.messages[id] = [];

  /**
   * Resolve the leaf photo for this turn. The caller may inline it as
   * `imageBase64`, or upload it to /files first and pass `attachment_ids`.
   */
  const resolvedAttachments = (Array.isArray(attachment_ids) ? attachment_ids : [])
    .map((attachmentId: string) => db.attachments?.[attachmentId])
    .filter(Boolean);

  let photoBase64: string | null = typeof imageBase64 === "string" && imageBase64 ? imageBase64 : null;
  if (!photoBase64) {
    const image = resolvedAttachments.find((a: any) => a.type === "image");
    if (image) {
      const filePath = CloudStorageService.getFilePath(image.storedName || image.name);
      if (filePath) {
        photoBase64 = fs.readFileSync(filePath).toString("base64");
      } else {
        // Do not quietly answer as if no photo was sent.
        return res.status(410).json({
          error: "ไฟล์ภาพที่แนบมาหาไม่พบในระบบแล้ว กรุณาอัปโหลดใหม่",
          detail: `attachment ${image.id}`,
        });
      }
    }
  }
  const unknownAttachments = (Array.isArray(attachment_ids) ? attachment_ids : []).filter(
    (attachmentId: string) => !db.attachments?.[attachmentId],
  );
  if (unknownAttachments.length) {
    return res.status(404).json({
      error: "ไม่พบไฟล์ที่แนบมา กรุณาอัปโหลดใหม่",
      detail: `unknown attachment_ids: ${unknownAttachments.join(", ")}`,
    });
  }

  // The user's own turn was previously never stored, so reloading a
  // conversation showed the assistant talking to itself.
  const userMessage: BackendMessage = {
    id: newId("msg"),
    conversationId: id,
    role: "user",
    content: content || (photoBase64 ? "[ส่งภาพใบแตงโมให้วิเคราะห์]" : ""),
    attachments: resolvedAttachments.map((a: any) => ({
      id: a.id,
      type: a.type,
      name: a.name,
      mimeType: a.mimeType,
      url: a.url,
    })),
    createdAt: now,
    status: "completed",
  };
  /* ── Vision turn: a photo answers "โรคอะไร" from the model, not from text ── */
  if (photoBase64) {
    const outcome = await runVisionDiagnosis(photoBase64);
    if (!outcome.ok) {
      // Nothing is committed, so the caller's retry does not duplicate the
      // question. The error itself is never swallowed.
      return res.status(outcome.status).json({ error: outcome.error, detail: outcome.detail });
    }

    // Keep the photo so reloading the conversation shows what was analysed.
    // An inline `imageBase64` has no attachment row yet, so make one.
    if (!userMessage.attachments.length) {
      try {
        const clean = photoBase64.replace(/^data:[^;]+;base64,/, "");
        const saved = await CloudStorageService.saveFile("chat-leaf.jpg", Buffer.from(clean, "base64"));
        const attachment = {
          id: newId("att"),
          type: "image" as const,
          name: saved.filename,
          mimeType: "image/jpeg",
          url: saved.signedUrl,
        };
        if (!db.attachments) db.attachments = {};
        db.attachments[attachment.id] = {
          ...attachment,
          storedName: saved.filename,
          size: saved.size,
          ownerId: currentUserId,
        };
        userMessage.attachments = [attachment];
      } catch (err) {
        // The diagnosis still stands; only the thumbnail is lost on reload.
        console.warn("[chat] could not store the inline photo", err);
      }
    }

    db.messages[id].push(userMessage);
    const diagnosis = outcome.diagnosis;
    // The record belongs to whoever asked, so disease history can be scoped
    // to them. Every record was previously filed under "farm-01".
    const record = recordDiagnosis(diagnosis, currentUserId, content || "ส่งภาพผ่านแชท");
    const visionReply: BackendMessage = {
      id: newId("msg"),
      conversationId: id,
      role: "assistant",
      content: diagnosisToChatReply(diagnosis),
      attachments: [],
      diseaseDetection: { ...diagnosis, recordId: record.id, detectedAt: record.detectedAt },
      createdAt: new Date().toISOString(),
      status: "completed",
      modelVersion: diagnosis.model_version,
    };

    conv.title = `ตรวจโรค: ${diagnosis.thai_name.split(' ')[0]} 🍉`;
    conv.lastMessage = diagnosis.thai_name;
    conv.updatedAt = visionReply.createdAt;
    conv.messageCount += 2;
    db.messages[id].push(visionReply);
    persistentDb.save();
    persistentDb.logAudit("CHAT_VISION", id, `${diagnosis.status}: ${diagnosis.thai_name}`);
    return res.json(visionReply);
  }

  if (mode === "disease-diagnosis") {
    // The whole point of this mode is the photo. Asking for it beats
    // answering from the text alone and sounding equally certain.
    const reply: BackendMessage = {
      id: newId("msg"),
      conversationId: id,
      role: "assistant",
      content:
        "ส่งภาพใบแตงโมมาให้ผมดูได้เลยครับ 🍉 กดปุ่มกล้องหรือรูปภาพใต้ช่องพิมพ์\n\n" +
        "ถ่ายให้เห็นแผลบนใบชัด ๆ ในแสงธรรมชาติ จะช่วยให้ผมอ่านได้แม่นขึ้นครับ\n\n" +
        "ผมอ่านได้ 3 โรคคือ แอนแทรคโนส ราน้ำค้าง และไวรัสใบด่าง ถ้าเป็นโรคอื่น " +
        "ผมจะบอกว่าสรุปไม่ได้ ไม่เดาให้ครับ",
      attachments: [],
      createdAt: now,
      status: "completed",
    };
    conv.lastMessage = "รอภาพใบแตงโมจากผู้ใช้";
    conv.updatedAt = now;
    conv.messageCount += 2;
    db.messages[id].push(userMessage);
    db.messages[id].push(reply);
    persistentDb.save();
    return res.json(reply);
  }


  // Determine reply content: using Gemini AI if configured, otherwise intelligent expert system
  let replyText = "";
  let usedGemini = false;
  if (aiClient) {
    try {
      const prompt = `คุณคือ "น้องแตงโม AI" ผู้เชี่ยวชาญด้านสรีรวิทยาและการวิเคราะห์ความสุกของแตงโมไทย จากเสียงเคาะ (Acoustic Resonance), ภาพถ่ายรอยแต้มดิน, ขั้วแตงโม, และสายพันธุ์ (กินรี, ตอร์ปิโด, ซอนญ่า, ไดอาน่า, ไร้เมล็ด)
คำถามของผู้ใช้: "${content}"
โหมด: ${mode}
กฎที่ต้องทำตามเสมอ: ถ้าแนะนำสารเคมีหรือการพ่นสาร ต้องระบุระยะปลอดภัยก่อนเก็บเกี่ยว (PHI) เป็นจำนวนวันทุกครั้ง
และต้องบอกว่า AI เป็นเครื่องมือช่วยตัดสินใจ ไม่ใช่คำวินิจฉัยยืนยัน
โปรดตอบเป็นภาษาไทยอย่างสุภาพ กระชับ อบอุ่น และให้เกร็ดความรู้ที่เป็นประโยชน์เกี่ยวกับแตงโม:`;

      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      replyText = response.text || "";
      usedGemini = Boolean(replyText);
    } catch (err) {
      console.warn("Gemini call error fallback:", err);
    }
  }

  if (!replyText) {
    replyText = generateWatermelonAIExpertResponse(content, mode);
  }

  // A language model will happily name a fungicide without its pre-harvest
  // interval. The catalogue-driven replies always carry one; a generated
  // one is checked and gets the caution appended if it does not.
  replyText = ensurePhiDisclosure(replyText);

  const assistantMessage: BackendMessage = {
    id: newId("msg"),
    conversationId: id,
    role: "assistant",
    content: replyText,
    attachments: [],
    createdAt: new Date().toISOString(),
    status: "completed",
    // The reply came from whichever engine actually produced it, not from
    // an acoustic model that was never involved in a text answer.
    modelVersion: usedGemini ? "gemini-2.5-flash" : "watermelon-expert-rules",
  };

  conv.lastMessage = replyText.slice(0, 80) + (replyText.length > 80 ? "..." : "");
  conv.updatedAt = now;
  conv.messageCount += 2;

  db.messages[id].push(userMessage);
  db.messages[id].push(assistantMessage);

  // If user opted-in to training
  if (allow_training === true) {
    // Only what was actually collected is recorded. This used to store a
    // sweetnessBrix of 12.0 and a variety of "พันธุ์กินรี" for every text
    // chat, so invented measurements entered the training set.
    db.trainingCandidates.unshift({
      id: newId("cand"),
      sourceType: "chat",
      sourceId: assistantMessage.id,
      ownerId: currentUserId,
      userConsentValid: true,
      anonymizationStatus: "pending",
      qualityReviewStatus: "pending",
      createdAt: now.split("T")[0],
    });
  }
  persistentDb.save();
  res.json(assistantMessage);
});

// 5. POST /api/v1/files
/** Decoded upload ceiling. The JSON body limit is 50 MB of base64, ~37 MB raw. */
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const ACCEPTED_UPLOAD_PREFIXES = ["image/", "audio/"];

app.post("/api/v1/files", async (req, res) => {
  const { name = "watermelon-knock-recording.webm", mimeType = "audio/webm", fileData } = req.body ?? {};
  const { sub: currentUserId } = identityOf(req);

  // This used to fall through to a fabricated attachment pointing at a
  // "watermelon-sample.webm" that was never stored, so an upload failure
  // looked like a success and the file silently vanished.
  if (typeof fileData !== "string" || !fileData) {
    return res.status(400).json({ error: "ไม่พบข้อมูลไฟล์ที่จะอัปโหลด (fileData)" });
  }
  if (typeof mimeType !== "string" || !ACCEPTED_UPLOAD_PREFIXES.some((p) => mimeType.startsWith(p))) {
    return res.status(415).json({ error: "รองรับเฉพาะไฟล์ภาพและไฟล์เสียงเท่านั้น" });
  }

  const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  if (!buffer.length) {
    return res.status(400).json({ error: "ไฟล์ที่ส่งมาว่างเปล่าหรือถอดรหัส base64 ไม่สำเร็จ" });
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return res.status(413).json({ error: "ไฟล์ใหญ่เกิน 12 MB กรุณาย่อขนาดก่อนอัปโหลด" });
  }

  try {
    const saved = await CloudStorageService.saveFile(typeof name === "string" ? name : "upload", buffer);
    const attachment = {
      id: newId("att"),
      type: mimeType.startsWith("image/") ? "image" : "audio",
      name: saved.filename,
      mimeType,
      url: saved.signedUrl,
    };
    // Keep the id → stored filename mapping, otherwise a later
    // `attachment_ids` in a chat message cannot be resolved to a file.
    if (!db.attachments) db.attachments = {};
    db.attachments[attachment.id] = {
      ...attachment,
      storedName: saved.filename,
      size: saved.size,
      ownerId: currentUserId,
    };
    persistentDb.save();
    return res.json(attachment);
  } catch (err) {
    console.error("[files] upload failed", err);
    return res.status(500).json({ error: "บันทึกไฟล์บนเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
  }
});

// 6. POST /api/v1/audio/transcriptions
//
// No speech-to-text service is wired up. This used to return one fixed
// Thai sentence for every recording, which reads as a transcript of
// whatever the farmer just said.
app.post("/api/v1/audio/transcriptions", (req, res) => {
  res.status(503).json({
    error: "ระบบถอดข้อความจากเสียงยังไม่พร้อมใช้งาน กรุณาพิมพ์คำถามแทนได้ครับ",
    code: "TRANSCRIPTION_SERVICE_UNAVAILABLE",
  });
});

// 7. POST /api/v1/audio/knock-analysis
//
// Same reasoning as the knock-analysis chat mode: there is no acoustic
// model, and the fixed 134 Hz / 12.2 °Brix response was indistinguishable
// from a real reading of the farmer's own fruit.
app.post("/api/v1/audio/knock-analysis", (req, res) => {
  res.status(503).json({
    error:
      "ระบบวิเคราะห์เสียงเคาะยังไม่พร้อมใช้งาน ระบบจะไม่เดาค่าความถี่หรือค่าความหวานให้ครับ",
    code: "ACOUSTIC_SERVICE_UNAVAILABLE",
  });
});

// 8. POST /api/v1/feedback/reports
app.post("/api/v1/feedback/reports", (req, res) => {
  const { message_id, category, detail } = req.body ?? {};
  const report = {
    report_id: newId("rep"),
    message_id,
    category,
    detail,
    reporterId: identityOf(req).sub,
    status: "open",
    created_at: new Date().toISOString(),
  };
  db.reports.push(report);
  // The report was only held in memory before, so it was lost on restart.
  persistentDb.save();
  res.json({ success: true, reportId: report.report_id });
});

// 9. GET /api/v1/prompts
app.get("/api/v1/prompts", (req, res) => {
  res.json(db.prompts);
});

// 10. GET /api/v1/folders
app.get("/api/v1/folders", (req, res) => {
  res.json(db.folders);
});

// 11. GET /api/v1/knowledge
app.get("/api/v1/knowledge", (req, res) => {
  res.json(db.knowledge);
});

// 12. PATCH /api/v1/users/me/consent
//
// Every caller used to write to the literal key "me", so one farmer
// turning off model training switched it off in the stored record for
// everyone — and `forget-me`, which deletes `consents[userId]`, never
// removed it.
app.patch("/api/v1/users/me/consent", requireUser, (req, res) => {
  const { sub: currentUserId } = identityOf(req);
  const incoming = req.body ?? {};
  if (typeof incoming !== "object" || Array.isArray(incoming)) {
    return res.status(400).json({ error: "รูปแบบข้อมูลความยินยอมไม่ถูกต้อง" });
  }
  // Only booleans; a consent flag set to a string would read as truthy.
  const flags: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === "boolean") flags[key] = value;
  }
  db.consents[currentUserId] = {
    ...db.consents[currentUserId],
    ...flags,
    updated_at: new Date().toISOString(),
  };
  persistentDb.save();
  res.json({ success: true, consent: db.consents[currentUserId] });
});

// 13. GET /api/v1/admin/statistics
//
// Was open to anyone and reported invented figures (14,280 users, 9,410
// messages today, 4,320 MB stored) on a database holding a handful of
// rows. Numbers an operator acts on are counted, not made up.
app.get("/api/v1/admin/statistics", requireAdmin, (req, res) => {
  const since = Date.now() - 24 * 3600 * 1000;
  const allMessages = Object.values(db.messages).flat();
  const messagesToday = allMessages.filter((m: any) => {
    const at = Date.parse(m?.createdAt ?? "");
    return Number.isFinite(at) && at >= since;
  }).length;

  const latencies = allMessages
    .map((m: any) => m?.responseTimeMs)
    .filter((ms: unknown): ms is number => typeof ms === "number" && Number.isFinite(ms));

  const diseaseRecords = db.diseaseRecords ?? [];

  res.json({
    totalUsers: (db.users ?? []).length,
    conversationsCount: db.conversations.length,
    messagesCount: allMessages.length,
    messagesToday,
    diseaseScansCount: diseaseRecords.length,
    inconclusiveScansCount: diseaseRecords.filter((r: any) => r.status === "inconclusive").length,
    pendingReportsCount: db.reports.filter((r: any) => r.status === "open").length,
    // Null rather than a placeholder when nothing has been measured yet.
    averageResponseLatencyMs: latencies.length
      ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length)
      : null,
    optInTrainingCount: db.trainingCandidates.filter((c: any) => c.userConsentValid).length,
    auditLogsCount: db.auditLogs.length,
    // There is no acoustic model, so there is nothing to count here.
    knockAnalysesCount: 0,
  });
});

// 14. DELETE /api/v1/users/me/conversations
//
// "Clear my chat history" used to assign `db.conversations = []` and
// `db.messages = {}`: one unauthenticated request destroyed every
// conversation belonging to every user.
app.delete("/api/v1/users/me/conversations", requireUser, (req, res) => {
  const { sub: currentUserId } = identityOf(req);
  const mine = db.conversations.filter((c: any) => c.userId === currentUserId);
  for (const conv of mine) delete db.messages[conv.id];
  db.conversations = db.conversations.filter((c: any) => c.userId !== currentUserId);
  persistentDb.save();
  persistentDb.logAudit("CHAT_HISTORY_CLEARED", currentUserId, `Cleared ${mine.length} conversations`);
  res.json({ success: true, deletedCount: mine.length, message: "ลบประวัติการแชทของคุณสำเร็จ" });
});

// 15. GET /api/v1/users/me/data-export
//
// This served `JSON.stringify(db)` to anyone who asked: every user row,
// every conversation, every audit log and the live OTP sessions with
// their codes. It now returns the same per-user archive as the PDPA
// export endpoint.
app.get("/api/v1/users/me/data-export", requireUser, (req, res) => {
  const { sub: currentUserId } = identityOf(req);
  res.setHeader("Content-Disposition", `attachment; filename=watermelon-user-export-${currentUserId}.json`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(buildPersonalExport(currentUserId), null, 2));
});

// 16. GET /api/v1/watermelons (Lab Specimens)
//
// Rows without an owner are the seeded reference specimens and stay
// visible; anything a farmer recorded is theirs alone.
app.get("/api/v1/watermelons", (req, res) => {
  const { sub: currentUserId, role: userRole } = identityOf(req);
  if (isElevated(userRole)) return res.json(db.watermelons);
  res.json(db.watermelons.filter((w: any) => !w.ownerId || w.ownerId === currentUserId));
});

/**
 * A measurement that was not supplied is absent, not a plausible number.
 * `Number(x) || fallback` also replaced a legitimate measured 0.
 */
function optionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// 17. POST /api/v1/watermelons (Create Specimen)
//
// Missing fields used to be filled with 4.5 kg, 11.5 °Brix, 135 Hz and a
// 0.9 confidence. Those landed in the lab record — and from there into the
// training candidates — as if someone had measured them.
app.post("/api/v1/watermelons", requireUser, (req, res) => {
  const body = req.body ?? {};
  const { sub: currentUserId } = identityOf(req);

  const weightKg = optionalNumber(body.weightKg);
  if (weightKg === null || weightKg <= 0) {
    return res.status(400).json({ error: "กรุณาระบุน้ำหนักผล (weightKg) ที่ชั่งได้จริง" });
  }
  if (typeof body.variety !== "string" || !body.variety.trim()) {
    return res.status(400).json({ error: "กรุณาระบุสายพันธุ์ (variety)" });
  }

  const newSpecimen = {
    id: newId("wm"),
    ownerId: currentUserId,
    code: typeof body.code === "string" && body.code.trim() ? body.code.trim() : newId("WM"),
    variety: body.variety.trim(),
    origin: typeof body.origin === "string" && body.origin.trim() ? body.origin.trim() : null,
    harvestDate: typeof body.harvestDate === "string" ? body.harvestDate : new Date().toISOString().split("T")[0],
    weightKg,
    soundCharacteristics: typeof body.soundCharacteristics === "string" ? body.soundCharacteristics : null,
    predictedStatus: typeof body.predictedStatus === "string" ? body.predictedStatus : null,
    predictedBrix: optionalNumber(body.predictedBrix),
    confidence: optionalNumber(body.confidence),
    dominantFrequencyHz: optionalNumber(body.dominantFrequencyHz),
    snrDb: optionalNumber(body.snrDb),
    status: "pending_cut",
    createdAt: new Date().toISOString(),
  };
  db.watermelons.unshift(newSpecimen);
  persistentDb.save();
  res.status(201).json(newSpecimen);
});

// 18. POST /api/v1/watermelons/:id/ground-truth (Record Cut & Taste Results)
// 18. POST /api/v1/watermelons/:id/ground-truth (Record Cut & Taste Results)
//
// This is the label a future acoustic model would be trained on. Every
// field used to have a cheerful default — 12.0 °Brix, "สุกพอดี",
// agreementStatus "match" — so posting an empty body produced a verified
// specimen that agreed with the prediction. `userConsentValid` was also
// hard-coded true regardless of what the owner had consented to.
app.post("/api/v1/watermelons/:id/ground-truth", requireUser, (req, res) => {
  const { id } = req.params;
  const body = req.body ?? {};
  const { sub: currentUserId, role: userRole } = identityOf(req);

  const index = db.watermelons.findIndex((w) => w.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "ไม่พบตัวอย่างผลแตงโมนี้ในระบบ" });
  }
  const specimen = db.watermelons[index];
  if (specimen.ownerId && specimen.ownerId !== currentUserId && !isElevated(userRole)) {
    return res.status(403).json({ error: "ไม่มีสิทธิ์บันทึกผลผ่าตรวจของตัวอย่างนี้" });
  }

  const actualBrix = optionalNumber(body.actualBrix);
  if (actualBrix === null) {
    return res.status(400).json({ error: "กรุณาระบุค่าความหวานที่วัดได้จริง (actualBrix)" });
  }
  if (typeof body.actualMaturity !== "string" || !body.actualMaturity.trim()) {
    return res.status(400).json({ error: "กรุณาระบุผลการผ่าตรวจ (actualMaturity)" });
  }
  if (typeof body.verifiedBy !== "string" || !body.verifiedBy.trim()) {
    return res.status(400).json({ error: "กรุณาระบุชื่อผู้ตรวจสอบ (verifiedBy)" });
  }
  const ALLOWED_AGREEMENT = ["match", "mismatch", "partial"];
  const agreementStatus = typeof body.agreementStatus === "string" ? body.agreementStatus : "";
  if (!ALLOWED_AGREEMENT.includes(agreementStatus)) {
    return res.status(400).json({
      error: `กรุณาระบุผลเทียบกับที่ AI ทำนาย (agreementStatus) เป็น ${ALLOWED_AGREEMENT.join(" / ")}`,
    });
  }

  const truth = {
    cutDate: typeof body.cutDate === "string" ? body.cutDate : new Date().toISOString().split("T")[0],
    actualMaturity: body.actualMaturity.trim(),
    actualBrix,
    fleshColor: typeof body.fleshColor === "string" ? body.fleshColor : null,
    crispnessScore: optionalNumber(body.crispnessScore),
    hollowCore: typeof body.hollowCore === "boolean" ? body.hollowCore : null,
    tasteNotes: typeof body.tasteNotes === "string" ? body.tasteNotes : null,
    verifiedBy: body.verifiedBy.trim(),
    agreementStatus,
    recordedBy: currentUserId,
  };

  specimen.groundTruth = truth;
  specimen.status = "verified";

  // Only enters the training set when the owner actually consented.
  const ownerConsent = db.consents[specimen.ownerId ?? currentUserId];
  if (ownerConsent?.improveModel === true) {
    db.trainingCandidates.unshift({
      id: newId("cand"),
      sourceType: "audio",
      sourceId: id,
      ownerId: specimen.ownerId ?? currentUserId,
      userConsentValid: true,
      anonymizationStatus: "pending",
      qualityReviewStatus: "pending",
      detectedClass: truth.actualMaturity,
      sweetnessBrix: truth.actualBrix,
      variety: specimen.variety,
      createdAt: new Date().toISOString().split("T")[0],
    });
  }

  persistentDb.save();
  res.json({ success: true, watermelon: specimen, addedToTrainingSet: ownerConsent?.improveModel === true });
});

// 19. POST /api/v1/storage/upload (Upload audio knock recording or watermelon photo)
app.post("/api/v1/storage/upload", requireUser, async (req, res) => {
  try {
    const { filename, fileData } = req.body ?? {};
    const { sub: currentUserId } = identityOf(req);
    if (typeof fileData !== "string" || !fileData) {
      return res.status(400).json({ error: "Missing fileData (base64 string required)" });
    }
    const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    if (!buffer.length) {
      return res.status(400).json({ error: "ถอดรหัส base64 ไม่สำเร็จ" });
    }
    if (buffer.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({ error: "ไฟล์ใหญ่เกิน 12 MB" });
    }
    const result = await CloudStorageService.saveFile(
      typeof filename === "string" && filename ? filename : "audio-knock.webm",
      buffer,
    );
    if (!db.attachments) db.attachments = {};
    db.attachments[newId("att")] = {
      type: result.filename.match(/\.(jpe?g|png|webp)$/i) ? "image" : "audio",
      name: result.filename,
      storedName: result.filename,
      size: result.size,
      url: result.signedUrl,
      ownerId: currentUserId,
    };
    persistentDb.save();
    persistentDb.logAudit("STORAGE_UPLOAD", currentUserId, `Uploaded file: ${result.filename} (${result.size} bytes)`);
    res.json({
      success: true,
      filename: result.filename,
      size: result.size,
      signedUrl: result.signedUrl,
      downloadUrl: result.signedUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Upload failed: " + err.message });
  }
});

// 20. POST /api/v1/storage/signed-url (Generate Pre-signed URL)
//
// This was an open signing oracle: any caller could name any file in the
// uploads directory — another farmer's leaf photo or knock recording —
// and be handed a valid read URL for it, with an unbounded lifetime.
// Signing is now limited to files the caller uploaded.
app.post("/api/v1/storage/signed-url", requireUser, (req, res) => {
  const { filename, operation = "read", expiresInSec = 7200 } = req.body ?? {};
  const { sub: currentUserId, role: userRole } = identityOf(req);

  if (typeof filename !== "string" || !filename) {
    return res.status(400).json({ error: "Filename required" });
  }
  if (operation !== "read" && operation !== "write") {
    return res.status(400).json({ error: 'operation must be "read" or "write"' });
  }

  const storedName = path.basename(filename);
  const owned = Object.values(db.attachments ?? {}).some(
    (a: any) => a?.storedName === storedName && (a.ownerId === currentUserId || isElevated(userRole)),
  );
  if (!owned) {
    return res.status(403).json({ error: "ไม่มีสิทธิ์เข้าถึงไฟล์นี้" });
  }

  const result = CloudStorageService.generateSignedUrl(storedName, operation, Number(expiresInSec));
  res.json({ success: true, ...result, maxTtlSeconds: MAX_SIGNED_URL_TTL_SEC });
});

// 21. GET /api/v1/storage/files/:token/:expiresAt/:filename (Serve Secure Media with Signed URL verification)
app.get("/api/v1/storage/files/:token/:expiresAt/:filename", (req, res) => {
  const { token, expiresAt, filename } = req.params;
  const isValid = CloudStorageService.verifySignedUrl(token, filename, Number(expiresAt), "read");
  if (!isValid) {
    return res.status(403).json({ error: "Pre-signed URL is invalid or has expired (HTTP 403 Forbidden)" });
  }
  const filePath = CloudStorageService.getFilePath(filename);
  if (!filePath) {
    return res.status(404).json({ error: "File not found" });
  }
  res.sendFile(filePath);
});

// 22. POST /api/v1/database/sync (Offline PWA Sync)
//
// Both branches used to spread a client-supplied object straight into the
// database, and a chat message landed in whatever `conversationId` the
// caller named — defaulting to "conv-1", someone else's thread. Records
// are now rebuilt field by field and only written to threads the caller
// owns.
const SYNC_BATCH_LIMIT = 200;

app.post("/api/v1/database/sync", requireUser, (req, res) => {
  const { pendingRecords } = req.body ?? {};
  const { sub: currentUserId } = identityOf(req);

  if (!Array.isArray(pendingRecords)) {
    return res.status(400).json({ error: "pendingRecords ต้องเป็นรายการ (array)" });
  }
  if (pendingRecords.length > SYNC_BATCH_LIMIT) {
    return res.status(413).json({ error: `ส่งได้ครั้งละไม่เกิน ${SYNC_BATCH_LIMIT} รายการ` });
  }

  let syncedCount = 0;
  const rejected: string[] = [];

  for (const record of pendingRecords) {
    if (!record || typeof record !== "object") {
      rejected.push("รายการไม่ใช่ออบเจ็กต์");
      continue;
    }

    if (
      (record.type === "specimen" || record.type === "knock-analysis") &&
      record.specimen &&
      typeof record.specimen === "object"
    ) {
      const weightKg = optionalNumber(record.specimen.weightKg);
      if (weightKg === null || weightKg <= 0 || typeof record.specimen.variety !== "string") {
        rejected.push("ตัวอย่างขาดน้ำหนักหรือสายพันธุ์");
        continue;
      }
      db.watermelons.unshift({
        id: newId("wm"),
        ownerId: currentUserId,
        code: typeof record.specimen.code === "string" ? record.specimen.code : newId("WM"),
        variety: record.specimen.variety,
        origin: typeof record.specimen.origin === "string" ? record.specimen.origin : null,
        harvestDate:
          typeof record.specimen.harvestDate === "string"
            ? record.specimen.harvestDate
            : new Date().toISOString().split("T")[0],
        weightKg,
        predictedBrix: optionalNumber(record.specimen.predictedBrix),
        dominantFrequencyHz: optionalNumber(record.specimen.dominantFrequencyHz),
        status: "pending_cut",
        syncedFromOffline: true,
        createdAt: new Date().toISOString(),
      });
      syncedCount++;
      continue;
    }

    if (record.type === "chat-message" && record.message && typeof record.message === "object") {
      const convId = record.conversationId;
      if (typeof convId !== "string" || !convId) {
        rejected.push("ข้อความไม่ได้ระบุ conversationId");
        continue;
      }
      const conv = db.conversations.find((c) => c.id === convId);
      if (!conv || (conv.userId && conv.userId !== currentUserId)) {
        rejected.push(`ไม่มีสิทธิ์เขียนลงห้องแชท ${convId}`);
        continue;
      }
      if (typeof record.message.content !== "string") {
        rejected.push("ข้อความไม่มีเนื้อหา");
        continue;
      }
      if (!db.messages[convId]) db.messages[convId] = [];
      // Rebuilt rather than spread: an offline payload must not be able to
      // forge an assistant turn or a diagnosis.
      db.messages[convId].push({
        id: newId("msg"),
        conversationId: convId,
        role: "user",
        content: record.message.content,
        attachments: [],
        createdAt: new Date().toISOString(),
        status: "synced_offline",
      });
      conv.messageCount += 1;
      conv.updatedAt = new Date().toISOString();
      syncedCount++;
      continue;
    }

    rejected.push(`ชนิดข้อมูลไม่รองรับ: ${String(record.type)}`);
  }

  persistentDb.save();
  persistentDb.logAudit("OFFLINE_SYNC", currentUserId, `Synced ${syncedCount} records from field offline cache`);
  // Rejections are reported rather than silently dropped.
  res.json({ success: true, syncedCount, rejectedCount: rejected.length, rejected });
});

// 23. GET /api/v1/database/stats
app.get("/api/v1/database/stats", (req, res) => {
  res.json({
    engine: "Persistent JSON Database with GCS/Local Storage Adapter",
    conversationsCount: db.conversations.length,
    watermelonsCount: db.watermelons.length,
    auditLogsCount: db.auditLogs.length,
    trainingCandidatesCount: db.trainingCandidates.length,
    diseaseRecordsCount: (db.diseaseRecords || []).length,
    lastSaved: new Date().toISOString(),
  });
});

// 23.1 Watermelon Plant Disease Detection (real EfficientNet-B0 vision service)
//
// This endpoint only does transport. The disease catalogue, the confidence
// thresholds, the PHI wording and the caveats all come from
// src/lib/diseaseModel.ts, so the API and the UI cannot drift into disagreeing
// about what a prediction means.
//
// There is deliberately NO fallback diagnosis. If the vision service is down
// the caller gets a 503 and an honest message. The previous version answered
// with Math.random() over the catalogue, which a farmer could act on: a
// guessed fungicide is far worse than a visible outage.
const VISION_SERVICE_URL = (process.env.VISION_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const VISION_TIMEOUT_MS = Number(process.env.VISION_TIMEOUT_MS) || 20_000;

/**
 * Engine modes the vision service accepts, cheapest first. See the header of
 * `fastapi_service/inference.py`: `fast` is one view of the whole frame,
 * `balanced` and `deep` also score overlapping crops, which is what catches a
 * small lesion the full-frame resize throws away.
 *
 * Validated here rather than forwarded blind, so an unknown value from a
 * caller becomes "use the service default" instead of a 422 the farmer sees.
 */
const VISION_MODES = ["fast", "balanced", "deep"] as const;

type VisionOutcome =
  | { ok: true; diagnosis: DiseaseDetection }
  | { ok: false; status: number; error: string; detail?: string };

/**
 * Sends one image to the vision service and maps the prediction onto the
 * disease catalogue. Returns a failure object instead of throwing so callers
 * can decide how to surface it — but never returns a guessed diagnosis.
 */
async function runVisionDiagnosis(imageBase64: string, mode?: string): Promise<VisionOutcome> {
  let prediction: VisionPrediction;
  // Omitted rather than defaulted: the service's own VISION_MODE decides, so
  // the accuracy/latency trade lives in one place instead of being pinned
  // here by a Node default that nobody remembers to change.
  const requestedMode = VISION_MODES.includes(mode as (typeof VISION_MODES)[number]) ? mode : undefined;
  try {
    const response = await fetch(`${VISION_SERVICE_URL}/predict-base64`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestedMode ? { imageBase64, mode: requestedMode } : { imageBase64 }),
      signal: AbortSignal.timeout(VISION_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      // 4xx means the image itself was rejected; anything else is our fault.
      const clientFault = response.status >= 400 && response.status < 500;
      return {
        ok: false,
        status: clientFault ? 422 : 502,
        error: clientFault
          ? "อ่านภาพไม่สำเร็จ กรุณาถ่ายใหม่ให้เห็นใบชัดเจน (JPEG, PNG หรือ WebP ไม่เกิน 10 MB)"
          : "ระบบวิเคราะห์ภาพตอบกลับผิดพลาด ยังสรุปผลไม่ได้",
        detail: detail.slice(0, 300),
      };
    }

    prediction = (await response.json()) as VisionPrediction;
  } catch (err) {
    return {
      ok: false,
      status: 503,
      error: "ระบบวิเคราะห์ภาพยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง — ระบบจะไม่เดาผลโรคให้",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  try {
    return { ok: true, diagnosis: buildDetection(prediction) };
  } catch (err) {
    // Thrown when the checkpoint's classes no longer match the catalogue.
    console.error("[vision] mapping failed", err);
    return {
      ok: false,
      status: 502,
      error: "ผลจากโมเดลไม่ตรงกับคลังข้อมูลโรคของระบบ จึงไม่แสดงผลเพื่อความปลอดภัย",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Saves a diagnosis to the permanent history. Shared by chat and the scanner. */
function recordDiagnosis(diagnosis: DiseaseDetection, farmId: string, notes: string) {
  if (!db.diseaseRecords) db.diseaseRecords = [];
  const record = {
    id: newId("dis"),
    detectedAt: new Date().toISOString(),
    farmId,
    notes,
    status: diagnosis.status,
    disease_id: diagnosis.disease_id,
    thai_name: diagnosis.thai_name,
    confidence_percentage: diagnosis.confidence_percentage,
    severity: diagnosis.severity,
    severity_level: diagnosis.severity_level,
    urgent_action: diagnosis.urgent_action,
    phi_days: diagnosis.phi_days,
    model_version: diagnosis.model_version,
    // Engine v3 provenance. Stored because a row read back in six months has
    // to say how it was produced: a `suspect` from one crop and a `diagnosed`
    // from the whole frame are different kinds of evidence, and a row with a
    // marginal photo behind it should not be trended against a clean one.
    engine: diagnosis.engine,
    escalated_from_healthy: diagnosis.escalated_from_healthy,
    evidence_region: diagnosis.evidence_region?.name ?? null,
    lesion_area_percentage: diagnosis.lesion_area_percentage,
    photo_quality: diagnosis.photo_quality?.verdict ?? null,
    confidence_calibrated: diagnosis.confidence_calibrated,
  };
  db.diseaseRecords.unshift(record);
  persistentDb.save();
  persistentDb.logAudit(
    "DISEASE_DETECT",
    farmId,
    `${diagnosis.status}: ${diagnosis.thai_name} at ${diagnosis.confidence_percentage}% (${diagnosis.model_version})`,
  );
  return record;
}

app.get("/api/v1/watermelon/disease-catalog", (req, res) => {
  res.json({
    success: true,
    count: DISEASES.length,
    model: {
      ...MODEL_SUMMARY,
      detectable_count: DISEASES.length - OUT_OF_SCOPE_DISEASES.length,
      out_of_scope_diseases: OUT_OF_SCOPE_DISEASES,
    },
    diseases: DISEASES.map((disease) => ({
      ...disease,
      // Five of these eight are reference knowledge only. Say so in the
      // payload rather than letting a UI imply the model can spot them.
      detectable_from_photo: modelCoverage(disease.id) !== null,
      model_metrics: modelCoverage(disease.id),
    })),
  });
});

app.get("/api/v1/watermelon/disease-history", (req, res) => {
  if (!db.diseaseRecords) db.diseaseRecords = [];
  const { sub: currentUserId, role: userRole } = identityOf(req);
  // Records written before the real model existed carry no `model_version`:
  // the old endpoint picked a disease with Math.random() and invented a
  // confidence figure. They stay in the database because they are the user's
  // rows to delete, but they must not be displayed as readings.
  // Scans used to be returned to every caller, so one farmer saw which
  // diseases another had found and when.
  const visible = isElevated(userRole)
    ? db.diseaseRecords
    : db.diseaseRecords.filter((r: any) => !r.farmId || r.farmId === currentUserId);

  const records = visible.map((record: any) => ({
    ...record,
    from_verified_model: Boolean(record.model_version),
    unverified_note: record.model_version
      ? undefined
      : "ผลนี้บันทึกไว้ก่อนระบบจะใช้โมเดลจริง ตัวเลขความมั่นใจไม่ได้มาจากการวิเคราะห์ภาพ",
  }));
  res.json({
    success: true,
    count: records.length,
    unverifiedCount: records.filter((r: any) => !r.from_verified_model).length,
    records,
  });
});

app.get("/api/v1/watermelon/disease-model", async (req, res) => {
  try {
    const response = await fetch(`${VISION_SERVICE_URL}/health`, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) throw new Error(`vision service returned ${response.status}`);
    res.json({ success: true, online: true, vision: await response.json(), benchmark: MODEL_SUMMARY });
  } catch (err) {
    res.status(503).json({
      success: false,
      online: false,
      error: "ยังเชื่อมต่อระบบวิเคราะห์ภาพไม่ได้",
      detail: err instanceof Error ? err.message : String(err),
      benchmark: MODEL_SUMMARY,
    });
  }
});

/**
 * Whether the acoustic (knock) analysis is usable.
 *
 * Mirrors `/watermelon/disease-model` so a screen can disable its
 * microphone button up front instead of letting a farmer record ten
 * seconds of knocking and then fail on submit. There is no acoustic model
 * in this build, so this always reports offline — honestly, and in one
 * place, rather than each caller having to know.
 */
app.get("/api/v1/watermelon/acoustic-model", (req, res) => {
  res.status(503).json({
    success: false,
    online: false,
    error: "ระบบวิเคราะห์เสียงเคาะยังไม่พร้อมใช้งาน",
    detail:
      "ยังไม่มีโมเดลวิเคราะห์คลื่นเสียงในระบบ ระบบจะไม่ประเมินความถี่หรือค่าความหวานจากเสียง " +
      "ระหว่างนี้ใช้การตรวจโรคจากภาพใบ หรือสังเกตรอยแต้มดินและขั้วผลตามคู่มือการปลูกได้ครับ",
    code: "ACOUSTIC_SERVICE_UNAVAILABLE",
  });
});

app.post("/api/v1/watermelon/disease-detect", async (req, res) => {
  const { imageBase64, notes = "", mode } = req.body ?? {};
  const { sub: currentUserId } = identityOf(req);
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({ error: "กรุณาแนบรูปภาพใบแตงโมที่ต้องการตรวจโรค" });
  }

  const outcome = await runVisionDiagnosis(imageBase64, typeof mode === "string" ? mode : undefined);
  if (!outcome.ok) {
    return res.status(outcome.status).json({ error: outcome.error, detail: outcome.detail });
  }

  // `farmId` was taken from the request body, defaulting to "farm-01", so
  // a caller could file a scan under any farm — and the history endpoint
  // had nothing to scope by.
  const record = recordDiagnosis(outcome.diagnosis, currentUserId, typeof notes === "string" ? notes : "");
  res.json({ ...outcome.diagnosis, recordId: record.id, detectedAt: record.detectedAt });
});

/**
 * Strips server-side fields before a user row leaves the API. Handlers used
 * to return the stored object directly, which now holds `passwordHash`.
 */
function publicUser(user: Record<string, any>) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// 24. Authentication & Phone OTP / Social Endpoints (Hardened with RFC 7519 JWT & Rate Limiting)
/** Thai mobile numbers, digits only. */
function normalisePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return /^0[689]\d{8}$/.test(digits) ? digits : null;
}

/** Expired OTP sessions used to accumulate in the database file forever. */
function pruneOtpSessions() {
  if (!db.otpSessions) {
    db.otpSessions = {};
    return;
  }
  const now = Date.now();
  for (const [token, session] of Object.entries(db.otpSessions)) {
    if (!session || typeof session.expiresAt !== "number" || session.expiresAt < now) {
      delete db.otpSessions[token];
    }
  }
}

app.post("/api/v1/auth/otp/send", otpSendLimiter, (req, res) => {
  // `phone.length` on a non-string was `undefined`, and `undefined < 9` is
  // false, so a numeric phone sailed past this check and crashed later on
  // `phone.slice(-4)`.
  const phone = normalisePhone(req.body?.phone);
  if (!phone) {
    return res.status(400).json({ error: "กรุณาระบุเบอร์โทรศัพท์มือถือไทย 10 หลักที่ถูกต้อง" });
  }

  pruneOtpSessions();

  // randomInt is uniform and cryptographically sound; Math.random is not,
  // and this value is a credential.
  const otpCode = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  const sessionToken = "sess_" + crypto.randomBytes(16).toString("hex");
  db.otpSessions[sessionToken] = {
    // Stored as an HMAC, not cleartext: the database file is also what the
    // data-export endpoint reads, and a live OTP is a credential.
    code: hashOtpCode(otpCode, sessionToken),
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0,
    phone,
  };
  persistentDb.save();
  persistentDb.logAudit("AUTH_OTP_REQUEST", phone, "Generated OTP session");

  // Printing the code is a development aid; in production it would put a
  // live credential into whatever collects stdout.
  if (!isProduction()) {
    console.log(`[AUTH OTP DEV] Phone: ${phone} | Code: ${otpCode} | Session: ${sessionToken}`);
  }

  const responsePayload: { success: boolean; sessionToken: string; message: string; demoCode?: string } = {
    success: true,
    sessionToken,
    message: `ส่งรหัส OTP 6 หลักไปยัง ${phone} เรียบร้อยแล้ว (รหัสมีอายุ 5 นาที)`,
  };

  if (!isProduction() || process.env.ENABLE_DEMO_OTP === "true") {
    responsePayload.demoCode = otpCode;
  }

  res.json(responsePayload);
});

app.post("/api/v1/auth/otp/verify", otpVerifyLimiter, (req, res) => {
  // `role` is deliberately NOT read from the body. It used to be, so
  // `{"role":"admin"}` on this public endpoint minted an admin session.
  const { sessionToken, code } = req.body ?? {};
  if (!db.otpSessions) db.otpSessions = {};
  if (typeof sessionToken !== "string" || typeof code !== "string") {
    return res.status(400).json({ error: "ข้อมูลยืนยันรหัส OTP ไม่ครบถ้วน" });
  }
  const session = db.otpSessions[sessionToken];
  if (!session) {
    return res.status(400).json({ error: "เซสชัน OTP หมดอายุหรือไม่มีอยู่ในระบบ" });
  }
  if (Date.now() > session.expiresAt) {
    delete db.otpSessions[sessionToken];
    persistentDb.save();
    return res.status(400).json({ error: "รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่" });
  }
  session.attempts++;
  if (!safeEqual(hashOtpCode(code, sessionToken), session.code)) {
    if (session.attempts >= 5) {
      delete db.otpSessions[sessionToken];
      persistentDb.save();
      return res.status(400).json({ error: "กรอกรหัสผิดเกินจำนวนครั้งที่กำหนด" });
    }
    persistentDb.save();
    return res.status(400).json({ error: `รหัส OTP ไม่ถูกต้อง (เหลือโอกาส ${5 - session.attempts} ครั้ง)` });
  }

  /**
   * The phone number comes from the session, not from the request.
   *
   * It used to be taken from the body and never compared with the number
   * the code was sent to, so requesting an OTP for your own phone and then
   * verifying it with someone else's number in the payload returned a
   * valid session for their account.
   */
  const phone = session.phone;
  if (!phone) {
    delete db.otpSessions[sessionToken];
    persistentDb.save();
    return res.status(400).json({ error: "เซสชัน OTP ไม่สมบูรณ์ กรุณาขอรหัสใหม่" });
  }

  delete db.otpSessions[sessionToken];
  if (!db.users) db.users = [];
  let user = db.users.find((u: any) => u.phone && u.phone.replace(/\D/g, "") === phone);
  if (!user) {
    user = {
      id: newId("usr"),
      name: `เกษตรกร (${phone.slice(-4)})`,
      phone,
      role: "user",
      organization: "แปลงเกษตรกรไทย",
    };
    db.users.push(user);
  }
  persistentDb.save();
  persistentDb.logAudit("AUTH_LOGIN_SUCCESS", user.id, "Phone OTP login verified");

  // Issue real RFC 7519 HMAC-SHA256 Signed JWT
  const token = signJwt({
    sub: user.id,
    phone: user.phone,
    role: user.role,
  });

  res.json({ success: true, user: publicUser(user), token });
});

app.post("/api/v1/auth/social", (req, res) => {
  // `role` is not read from the body here either.
  const { provider, email, name, avatar } = req.body ?? {};
  if (provider !== "google" && provider !== "line") {
    return res.status(400).json({ error: "ผู้ให้บริการเข้าสู่ระบบไม่ถูกต้อง" });
  }
  // Without an email there is nothing to match on, and the old fallback
  // (`user_<timestamp>@…`) created a brand-new account on every attempt.
  if (typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "ไม่ได้รับอีเมลจากผู้ให้บริการ กรุณาลองเข้าสู่ระบบอีกครั้ง" });
  }
  if (!db.users) db.users = [];
  const normalisedEmail = email.trim().toLowerCase();
  let user = db.users.find((u: any) => u.email && u.email.toLowerCase() === normalisedEmail);
  if (!user) {
    user = {
      id: newId("usr"),
      name:
        typeof name === "string" && name.trim()
          ? name.trim()
          : provider === "line"
            ? "ผู้ใช้ LINE"
            : "ผู้ใช้ Google",
      email: normalisedEmail,
      role: "user",
      avatar: typeof avatar === "string" ? avatar : "🍉",
      provider,
    };
    db.users.push(user);
  }
  persistentDb.save();
  persistentDb.logAudit("AUTH_SOCIAL_LOGIN", user.id, `Social login via ${provider}`);

  // Issue real RFC 7519 HMAC-SHA256 Signed JWT
  const token = signJwt({
    sub: user.id,
    phone: user.phone,
    role: user.role,
  });

  res.json({ success: true, user: publicUser(user), token });
});

/**
 * Deliberately the same message whether the account is unknown or the
 * password is wrong, so this endpoint cannot be used to enumerate which
 * phone numbers are registered.
 */
const LOGIN_FAILED_MESSAGE = "เบอร์โทรศัพท์ อีเมล หรือรหัสผ่านไม่ถูกต้อง";

const loginLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "พยายามเข้าสู่ระบบถี่เกินไป เพื่อความปลอดภัยกรุณารอ 10 นาทีแล้วลองใหม่",
});

app.post("/api/v1/auth/login", loginLimiter, (req, res) => {
  /**
   * This endpoint used to be an authentication bypass.
   *
   * `password` was destructured and then never checked, and an identifier
   * that matched no account was *created* and handed a signed token. So
   * posting a known farmer's phone number — with no password at all —
   * returned a valid session for their account, and `role: "admin"` in the
   * same body made it an administrator session.
   */
  const { identifier, password } = req.body ?? {};
  if (typeof identifier !== "string" || !identifier.trim()) {
    return res.status(400).json({ error: "กรุณาระบุเบอร์โทรศัพท์มือถือ หรือ อีเมล" });
  }
  if (!db.users) db.users = [];
  const cleanId = identifier.trim();
  const cleanPhone = cleanId.replace(/\D/g, "");

  const user = db.users.find(
    (u: any) =>
      (u.phone && cleanPhone.length >= 9 && u.phone.replace(/\D/g, "") === cleanPhone) ||
      (u.email && u.email.toLowerCase() === cleanId.toLowerCase()),
  );

  if (!user) {
    persistentDb.logAudit("AUTH_LOGIN_FAILED", "anonymous", "Unknown identifier");
    return res.status(401).json({ error: LOGIN_FAILED_MESSAGE });
  }

  // Accounts created by OTP or a social provider have no password to
  // check. Saying so beats letting them in without one.
  if (!user.passwordHash) {
    return res.status(401).json({
      error: "บัญชีนี้ยังไม่ได้ตั้งรหัสผ่าน กรุณาเข้าสู่ระบบด้วยรหัส OTP ทาง SMS",
      code: "PASSWORD_NOT_SET",
    });
  }

  if (typeof password !== "string" || !verifyPassword(password, user.passwordHash)) {
    persistentDb.logAudit("AUTH_LOGIN_FAILED", user.id, "Wrong password");
    persistentDb.save();
    return res.status(401).json({ error: LOGIN_FAILED_MESSAGE });
  }

  persistentDb.logAudit("AUTH_LOGIN_SUCCESS", user.id, "Password login verified");
  persistentDb.save();

  const token = signJwt({
    sub: user.id,
    phone: user.phone,
    role: user.role,
  });

  res.json({ success: true, user: publicUser(user), token });
});

app.post("/api/v1/auth/register", (req, res) => {
  // `role` is not read from the body: it used to be, which made this a
  // self-service route to an admin account.
  const { name, phone, email, password, province, cultivar, plotSize } = req.body ?? {};
  const cleanPhone = normalisePhone(phone);
  if (!cleanPhone) {
    return res.status(400).json({ error: "กรุณาระบุหมายเลขโทรศัพท์มือถือไทย 10 หลักที่ถูกต้อง" });
  }
  if (password !== undefined && password !== null && password !== "") {
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร" });
    }
  }

  if (!db.users) db.users = [];

  const existing = db.users.find((u: any) => u.phone && u.phone.replace(/\D/g, "") === cleanPhone);
  if (existing) {
    // Updating the stored name from an unauthenticated request let anyone
    // rewrite another farmer's profile by knowing their phone number.
    return res.status(409).json({
      error: "เบอร์โทรศัพท์นี้สมัครไว้แล้ว กรุณาเข้าสู่ระบบ หรือขอรหัส OTP เพื่อยืนยันตัวตน",
      code: "PHONE_ALREADY_REGISTERED",
    });
  }

  const user: Record<string, unknown> = {
    id: newId("usr"),
    name: typeof name === "string" && name.trim() ? name.trim() : `เกษตรกร (${cleanPhone.slice(-4)})`,
    phone: cleanPhone,
    // No synthetic `<phone>@watermelon-ai.org` address: it is not a real
    // mailbox, and it ended up in the profile as if the farmer had given it.
    email: typeof email === "string" && email.includes("@") ? email.trim().toLowerCase() : undefined,
    role: "user",
    // Profile fields are recorded only when the farmer actually supplied
    // them; the defaults used to invent a province, cultivar and plot size.
    province: typeof province === "string" && province.trim() ? province.trim() : undefined,
    cultivar: typeof cultivar === "string" && cultivar.trim() ? cultivar.trim() : undefined,
    plotSize: typeof plotSize === "string" && plotSize.trim() ? plotSize.trim() : undefined,
  };
  if (typeof password === "string" && password) {
    user.passwordHash = hashPassword(password);
  }
  db.users.push(user);

  persistentDb.save();
  persistentDb.logAudit("AUTH_REGISTER_SUCCESS", String(user.id), "Farmer registered");

  const token = signJwt({
    sub: String(user.id),
    phone: cleanPhone,
    role: "user",
  });

  res.json({ success: true, user: publicUser(user), token });
});

app.get("/api/v1/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "ไม่พบข้อมูลยืนยันตัวตน (Authorization header missing)" });
  }
  const token = authHeader.slice(7).trim();
  const payload = verifyJwt(token);
  if (!payload) {
    return res.status(401).json({ error: "โทเค็นไม่ถูกต้องหรือหมดอายุแล้ว" });
  }
  const user = (db.users || []).find((u: any) => u.id === payload.sub);
  if (!user) {
    return res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้งานในระบบ" });
  }
  res.json({ success: true, user: publicUser(user), issuedAt: payload.iat, expiresAt: payload.exp });
});

// 25. PDPA & Compliance Hardening Endpoints
app.get("/api/v1/pdpa/policy", (req, res) => {
  res.json({
    organizationName: "สหกรณ์พัฒนาเทคโนโลยีแตงโมไทย จำกัด (Watermelon AI Co-op)",
    registrationNo: "0105569001234",
    dpo: {
      name: "ดร.วิชาญ วิจัยพืชสวน (Data Protection Officer)",
      email: "dpo@watermelon-ai.org",
      phone: "+66 2 999 8888",
      address: "อาคารวิจัยนวัตกรรมเกษตรอัจฉริยะ ชั้น 4 สุพรรณบุรี 72000",
    },
    legalBases: [
      { purpose: "วิเคราะห์ความถี่เสียงเคาะและความสุกของผลแตงโม", basis: "Consent (ความยินยอมตาม ม.19)" },
      { purpose: "บันทึกประวัติการตรวจวัดและใบรับรองคุณภาพ", basis: "Contract / Legitimate Interest (สัญญาและประโยชน์อันชอบธรรม)" },
      { purpose: "พัฒนาและฝึกฝนโมเดล AI น้องแตงโม (แบบนิรนาม)", basis: "Explicit Consent (ความยินยอมโดยชัดแจ้ง)" },
    ],
    rightsSupported: [
      "สิทธิในการเข้าถึงและรับสำเนา (Right to Access)",
      "สิทธิในการขอแก้ไขข้อมูล (Right to Rectification)",
      "สิทธิในการขอลบหรือทำลายข้อมูล (Right to Erasure / Right to be Forgotten)",
      "สิทธิในการโอนย้ายข้อมูล (Right to Data Portability)",
      "สิทธิในการถอนความยินยอม (Right to Withdraw Consent)",
    ],
  });
});

app.post("/api/v1/pdpa/forget-me", requireUser, (req, res) => {
  const { sub: currentUserId } = identityOf(req);

  // The client sends `{ confirm: true }` and the server used to ignore it,
  // so any stray POST erased the account.
  if (req.body?.confirm !== true) {
    return res.status(400).json({
      error: "ต้องยืนยันการลบข้อมูลด้วย confirm: true เพื่อป้องกันการลบโดยไม่เจตนา",
      code: "CONFIRMATION_REQUIRED",
    });
  }

  const myConversations = db.conversations.filter((c: any) => c.userId === currentUserId);
  // Messages carry no `userId`, so the old filter
  // (`m.userId !== currentUserId`) matched nothing and every message was
  // left behind after a right-to-erasure request. They are deleted by
  // conversation instead.
  for (const conv of myConversations) delete db.messages[conv.id];
  db.conversations = db.conversations.filter((c: any) => c.userId !== currentUserId);

  delete db.consents[currentUserId];

  // Uploaded photos and recordings are personal data too, and the files
  // themselves were never removed.
  let removedFiles = 0;
  for (const [attachmentId, attachment] of Object.entries(db.attachments ?? {})) {
    if ((attachment as any)?.ownerId !== currentUserId) continue;
    const storedName = (attachment as any).storedName;
    if (typeof storedName === "string") {
      const filePath = CloudStorageService.getFilePath(storedName);
      if (filePath) {
        try {
          fs.unlinkSync(filePath);
          removedFiles++;
        } catch (err) {
          console.warn("[pdpa] could not delete uploaded file", storedName, err);
        }
      }
    }
    delete db.attachments![attachmentId];
  }

  const removedScans = (db.diseaseRecords ?? []).filter((r: any) => r.farmId === currentUserId).length;
  db.diseaseRecords = (db.diseaseRecords ?? []).filter((r: any) => r.farmId !== currentUserId);

  db.watermelons = db.watermelons.filter((w: any) => w.ownerId !== currentUserId);

  db.trainingCandidates = db.trainingCandidates.map((cand: any) =>
    cand.ownerId === currentUserId
      ? { ...cand, userConsentValid: false, anonymizationStatus: "purged" }
      : cand,
  );

  db.reports = db.reports.filter((r: any) => r.reporterId !== currentUserId);

  // The account itself has to go, otherwise the name and phone number
  // survive the erasure request.
  if (db.users) {
    db.users = db.users.filter((u: any) => u.id !== currentUserId);
  }

  persistentDb.save();
  // The audit entry records that the request happened, without the data.
  persistentDb.logAudit(
    "PDPA_RIGHT_TO_ERASURE",
    currentUserId,
    `Erased ${myConversations.length} conversations, ${removedScans} scans, ${removedFiles} files`,
  );
  res.json({
    success: true,
    deleted: {
      conversations: myConversations.length,
      diseaseScans: removedScans,
      uploadedFiles: removedFiles,
    },
    message: "ดำเนินการลบข้อมูลส่วนบุคคลและประวัติทั้งหมดตามสิทธิ์ PDPA มาตรา 33 เรียบร้อยแล้ว",
  });
});

/**
 * The caller's own data, and nothing else.
 *
 * The previous version attached `watermelons: db.watermelons` — every lab
 * specimen in the database, whoever recorded it — and included
 * conversations with no owner, which are the shared seed threads.
 */
function buildPersonalExport(userId: string) {
  const myConversations = db.conversations.filter((c: any) => c.userId === userId);
  const myMessages: Record<string, any[]> = {};
  for (const conv of myConversations) {
    if (db.messages[conv.id]) myMessages[conv.id] = db.messages[conv.id];
  }
  const profile = db.users?.find((u: any) => u.id === userId);
  return {
    exportedAt: new Date().toISOString(),
    format: "PDPA Data Portability JSON (Section 31)",
    userId,
    userProfile: profile ? publicUser(profile) : { id: userId },
    conversations: myConversations,
    messages: myMessages,
    consents: db.consents[userId] ?? {},
    watermelons: db.watermelons.filter((w: any) => w.ownerId === userId),
    diseaseScans: (db.diseaseRecords ?? []).filter((r: any) => r.farmId === userId),
    uploadedFiles: Object.values(db.attachments ?? {})
      .filter((a: any) => a?.ownerId === userId)
      .map((a: any) => ({ name: a.name, mimeType: a.mimeType, size: a.size })),
  };
}

app.get("/api/v1/pdpa/export-my-data", requireUser, (req, res) => {
  const { sub: currentUserId } = identityOf(req);
  persistentDb.logAudit("PDPA_DATA_PORTABILITY_EXPORT", currentUserId, "Exported personal data archive");
  res.setHeader("Content-Disposition", `attachment; filename=watermelon-pdpa-export-${currentUserId}.json`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(buildPersonalExport(currentUserId), null, 2));
});

// 26. API Service Information & Endpoints Directory at /api
app.get(["/api", "/api/v1"], (req, res) => {
  res.json({
    service: "Watermelon AI - Multi-Platform (Web, Android, iOS) Backend REST API",
    status: "online",
    version: "2.0.0",
    description: "AI-powered acoustic frequency analysis and ripeness assessment for watermelons",
    docs: "/api/v1/health",
    endpoints: {
      health: "/api/v1/health",
      database_stats: "/api/v1/database/stats",
      conversations: "/api/v1/conversations",
      // Both return 503: no speech-to-text or acoustic model is deployed.
      transcriptions: "/api/v1/audio/transcriptions",
      knock_analysis: "/api/v1/audio/knock-analysis",
      acoustic_model_status: "/api/v1/watermelon/acoustic-model",
      disease_detect: "/api/v1/watermelon/disease-detect",
      disease_model_status: "/api/v1/watermelon/disease-model",
      varieties: "/api/v1/varieties",
      calibration: "/api/v1/varieties/calibration",
      media_presigned_url: "/api/v1/media/presigned-upload-url",
      auth_otp: "/api/v1/auth/otp/send",
      social_login: "/api/v1/auth/social",
      pdpa_policy: "/api/v1/pdpa/policy",
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Unknown API paths must answer in JSON.
 *
 * The production SPA fallback below is `app.get("*")`, which also matched
 * `/api/v1/typo` and returned index.html with a 200. The client then tried
 * to parse HTML as JSON, got null, and reported a generic failure for what
 * was really a wrong URL.
 */
app.use("/api", (req, res) => {
  res.status(404).json({
    error: `ไม่พบ API นี้ (${req.method} /api${req.path})`,
    code: "ENDPOINT_NOT_FOUND",
  });
});

/**
 * Anything thrown out of a handler reached Express's default handler and
 * came back as an HTML error page, which the typed client cannot read.
 * Stack traces stay on the server.
 */
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // The request id goes in the log line so the id the farmer was shown
  // leads straight to this stack trace.
  console.error(`[api] unhandled error on ${req.method} ${req.originalUrl} (${req.requestId})`, err);
  if (res.headersSent) return;

  // A body that is not valid JSON is the caller's mistake, not a 500.
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "รูปแบบ JSON ที่ส่งมาไม่ถูกต้อง", code: "INVALID_JSON" });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "ข้อมูลที่ส่งมามีขนาดใหญ่เกินกำหนด", code: "PAYLOAD_TOO_LARGE" });
  }

  res.status(500).json({
    error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง",
    code: "INTERNAL_ERROR",
  });
});

// Setup Vite middleware for Web UI & PWA (Dev / Production)
async function startServer() {
  if (isProduction()) {
    const distDir = path.resolve(__dirname, "dist");
    if (!fs.existsSync(path.join(distDir, "index.html"))) {
      throw new Error(`No production build found at ${distDir}. Run "npm run build" first.`);
    }
    app.use(express.static(distDir));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            "**/data/**",
            "**/uploads/**",
            "**/*.log",
            "**/.git/**",
            "**/tmp/**",
            "**/dist/**",
            "**/coverage/**",
            "**/.system_generated/**",
          ],
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🍉 Watermelon AI Multi-Platform Server running on http://0.0.0.0:${PORT}`);
    console.log(`🌐 Web App & PWA: http://localhost:${PORT}`);
    console.log(`📡 API Endpoints: http://localhost:${PORT}/api/v1/health`);
  });
}

// An unhandled rejection here left the process alive with nothing
// listening and no explanation on stdout.
startServer().catch((err) => {
  console.error("❌ Failed to start Watermelon AI server:", err);
  process.exit(1);
});
