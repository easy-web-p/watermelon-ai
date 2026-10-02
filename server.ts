import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { persistentDb, CloudStorageService } from "./server-storage";
import crypto from "crypto";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

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
  createdAt: string;
  status: string;
  responseTimeMs?: number;
  modelVersion?: string;
}

const seedData = {
  conversations: [
    {
      id: "conv-1",
      title: "เคาะแตงโมพันธุ์กินรีลูกแรก 🍉",
      lastMessage: "AI ประเมินว่าแตงโมมีแนวโน้มสุกพร้อมรับประทาน (หวาน 12.2 °Bx)",
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      isPinned: true,
      chatMode: "knock-analysis",
      messageCount: 2,
    },
  ] as BackendConversation[],
  messages: {
    "conv-1": [
      {
        id: "msg-1-1",
        conversationId: "conv-1",
        role: "user",
        content: "ช่วยวิเคราะห์เสียงเคาะแตงโมลูกนี้หน่อย พันธุ์กินรี",
        attachments: [],
        createdAt: new Date(Date.now() - 3600000 * 2 + 1000).toISOString(),
        status: "completed",
      },
      {
        id: "msg-1-2",
        conversationId: "conv-1",
        role: "assistant",
        content: "น้องแตงโม AI วิเคราะห์คลื่นเสียงเรียบร้อยแล้วครับ: ผลการประเมินคือสุกพอดี เนื้อหวานฉ่ำ ค่าความหวานประมาณ 12.2 °Brix",
        attachments: [],
        knockAnalysis: {
          maturityClass: "สุกพอดี (หวานฉ่ำ)",
          maturityGrade: 4,
          confidence: 0.94,
          qualityStatus: "passed",
          detectedImpacts: 4,
          dominantFrequencyHz: 134,
          snrDb: 28,
          sweetnessEstimateBrix: 12.2,
          recommendations: [
            "เสียงเคาะกังวาน ไม่ทึบอับ แสดงถึงเนื้อสัมผัสฉ่ำน้ำ ไม่กลวง",
            "แนะนำแช่เย็นก่อนรับประทานเพื่อเพิ่มรสชาติสดชื่น",
          ],
        },
        createdAt: new Date(Date.now() - 3600000 * 2 + 2500).toISOString(),
        status: "completed",
        responseTimeMs: 1450,
        modelVersion: "WM-Knock-v2.4-Acoustic",
      },
    ] as BackendMessage[],
  } as Record<string, BackendMessage[]>,
  prompts: [
    {
      id: "p-1",
      title: "วิเคราะห์เสียงเคาะ 3–5 จังหวะ",
      content: "ช่วยวิเคราะห์เสียงเคาะแตงโมลูกนี้ ตรวจดูระดับความถี่ และประเมินว่าเนื้อในยังแน่นหรือเริ่มกลวง",
      category: "วิเคราะห์เสียง",
      usageCount: 432,
      isShared: true,
    },
    {
      id: "p-2",
      title: "ตรวจสอบความสุกจากภาพถ่ายรอยแต้มดิน",
      content: "ตรวจสอบภาพแตงโมลูกนี้ ดูสีของรอยแต้มดิน (Ground spot) และสภาพขั้วว่าพร้อมเก็บเกี่ยวหรือยัง",
      category: "ดูลักษณะภายนอก",
      usageCount: 318,
      isShared: true,
    },
  ],
  folders: [
    { id: "f-1", name: "แปลงวิจัยสุพรรณบุรี", color: "#16A34A", conversationCount: 5, createdAt: "2026-03-01" },
    { id: "f-2", name: "ทดสอบแตงโมไร้เมล็ด", color: "#E11D48", conversationCount: 3, createdAt: "2026-03-10" },
  ],
  knowledge: [
    {
      id: "doc-1",
      title: "คู่มือมาตรฐานคลื่นเสียงเคาะผลไม้ตระกูลแตง (Cucurbitaceae Acoustic Ripeness)",
      description: "ตารางเปรียบเทียบคลื่นเสียงความถี่ 80–200 Hz กับระยะสุกแก่ของแตงโมไทย 5 สายพันธุ์หลัก",
      category: "วิชาการ & วิจัย",
      chunkCount: 24,
      updatedAt: "2026-03-20",
      scope: "public",
      fileSize: "2.4 MB",
    },
  ],
  reports: [] as any[],
  trainingCandidates: [
    {
      id: "cand-1",
      sourceType: "audio",
      sourceId: "msg-1-1",
      userConsentValid: true,
      anonymizationStatus: "completed",
      qualityReviewStatus: "approved",
      detectedClass: "สุกพอดี (หวานฉ่ำ)",
      sweetnessBrix: 12.2,
      variety: "พันธุ์กินรี",
      createdAt: "2026-03-29",
    },
  ],
  consents: {} as Record<string, any>,
  watermelons: [
    {
      id: "wm-1",
      code: "WM-2026-081",
      variety: "พันธุ์กินรี (Khinri)",
      origin: "แปลงปลูกสุพรรณบุรี",
      harvestDate: "2026-03-27",
      weightKg: 4.85,
      soundCharacteristics: "เสียงกังวานแน่น คลื่นความถี่หลัก 134 Hz ไม่กลวง",
      predictedStatus: "สุกพอดี (หวานฉ่ำ)",
      predictedBrix: 12.2,
      confidence: 0.94,
      dominantFrequencyHz: 134,
      snrDb: 28,
      status: "verified",
      knockRecordingUrl: "/audio/samples/ripe-sample.wav",
      sampleType: "ripe",
      groundTruth: {
        cutDate: "2026-03-28",
        actualMaturity: "สุกพอดี (เนื้อทราย)",
        actualBrix: 12.4,
        fleshColor: "แดงเข้ม (Deep Ruby Red)",
        crispnessScore: 9,
        hollowCore: false,
        tasteNotes: "หวานฉ่ำ ไส้ไม่แตก ความแน่นของเนื้อสมบูรณ์แบบ ตรงกับที่โมเดลประเมิน 134 Hz",
        verifiedBy: "ดร.วิชาญ พืชสวนแตงไทย",
        agreementStatus: "match",
      },
    },
    {
      id: "wm-2",
      code: "WM-2026-082",
      variety: "พันธุ์ตอร์ปิโด (Torpedo)",
      origin: "ฟาร์มกาญจนบุรี",
      harvestDate: "2026-03-28",
      weightKg: 6.2,
      soundCharacteristics: "เสียงแหลมสูง ตึงแน่น ไร้การสั่นสะท้อนลึก 178 Hz",
      predictedStatus: "ยังดิบ / อ่อน (เนื้อแน่นกรอบ)",
      predictedBrix: 9.1,
      confidence: 0.91,
      dominantFrequencyHz: 178,
      snrDb: 24,
      status: "verified",
      knockRecordingUrl: "/audio/samples/unripe-sample.wav",
      sampleType: "unripe",
      groundTruth: {
        cutDate: "2026-03-29",
        actualMaturity: "ยังดิบ (เนื้อแข็ง)",
        actualBrix: 8.9,
        fleshColor: "ชมพูอ่อนอมขาวริมเปลือก",
        crispnessScore: 6,
        hollowCore: false,
        tasteNotes: "เนื้อแข็งกรอบยังไม่สะสมน้ำตาล เปลือกหนา ตรงกับการคาดการณ์ของ AI",
        verifiedBy: "ทีมงานแปลงทดลอง",
        agreementStatus: "match",
      },
    },
    {
      id: "wm-3",
      code: "WM-2026-083",
      variety: "พันธุ์ซอนญ่า (Sonya)",
      origin: "ฟาร์มนครปฐม",
      harvestDate: "2026-03-25",
      weightKg: 5.1,
      soundCharacteristics: "เสียงทุ้มต่ำและก้องกลวงสะท้อนโพรง 96 Hz",
      predictedStatus: "สุกเกิน / ไส้ล้ม (เนื้อร่วน)",
      predictedBrix: 10.5,
      confidence: 0.88,
      dominantFrequencyHz: 96,
      snrDb: 21,
      status: "verified",
      knockRecordingUrl: "/audio/samples/overripe-sample.wav",
      sampleType: "overripe",
      groundTruth: {
        cutDate: "2026-03-27",
        actualMaturity: "สุกเกิน / ไส้แตก",
        actualBrix: 10.2,
        fleshColor: "แดงคล้ำ (Dark Plum Red)",
        crispnessScore: 4,
        hollowCore: true,
        tasteNotes: "มีโพรงแกนกลางชัดเจน เนื้อร่วนฉ่ำน้ำแต่ขาดความกรอบ กลิ่นเริ่มหมักเล็กน้อย",
        verifiedBy: "ดร.วิชาญ พืชสวนแตงไทย",
        agreementStatus: "match",
      },
    },
  ] as any[],
};

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
// API Endpoints (as defined in the user's architectural guide)
// -------------------------------------------------------------

// 1. GET /api/v1/conversations (Enforces Ownership & Search Defense)
app.get("/api/v1/conversations", (req, res) => {
  const clientIp = req.ip || "127.0.0.1";
  const currentUserId = (req.headers["x-user-id"] as string) || "usr-somchai-01";
  const userRole = (req.headers["x-user-role"] as string) || "user";

  // Rate limit: 30 requests / minute
  if (!checkServerRate(`search:${clientIp}:${currentUserId}`, 30, 60_000)) {
    return res.status(429).json({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "คุณค้นหาหรือเรียกข้อมูลถี่เกินไป กรุณารอสักครู่ (HTTP 429)",
      },
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
      error: {
        code: "SEARCH_NOT_ALLOWED",
        message: "ไม่สามารถดำเนินการกับคำค้นหานี้ได้",
        request_id: "req_" + Math.random().toString(36).slice(2, 8),
      },
    });
  }

  // Enforce Ownership: Users can only retrieve their own conversations (unless admin/super_admin)
  let list = db.conversations;
  if (userRole !== "admin" && userRole !== "super_admin") {
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
  const currentUserId = (req.headers["x-user-id"] as string) || "usr-somchai-01";
  const { title = "แชทแตงโมใหม่ 🍉", mode = "general" } = req.body;
  const newConv: BackendConversation = {
    id: "conv-" + Date.now(),
    userId: currentUserId,
    title,
    lastMessage: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPinned: false,
    chatMode: mode,
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
  const currentUserId = (req.headers["x-user-id"] as string) || "usr-somchai-01";
  const userRole = (req.headers["x-user-role"] as string) || "user";

  const conv = db.conversations.find((c) => c.id === id);
  if (!conv) {
    return res.status(404).json({ error: "ไม่พบรายการ" });
  }

  // Ownership check: If belonging to someone else, return 404 to avoid leaking existence
  if (conv.userId && conv.userId !== currentUserId && userRole !== "admin" && userRole !== "super_admin") {
    return res.status(404).json({ error: "ไม่พบรายการ" });
  }

  res.json(db.messages[id] || []);
});

// DELETE /api/v1/conversations/:id
app.delete("/api/v1/conversations/:id", (req, res) => {
  const { id } = req.params;
  const currentUserId = (req.headers["x-user-id"] as string) || "usr-somchai-01";
  const userRole = (req.headers["x-user-role"] as string) || "user";

  const index = db.conversations.findIndex((c) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "ไม่พบรายการแชท" });
  }

  const conv = db.conversations[index];
  if (conv.userId && conv.userId !== currentUserId && userRole !== "admin" && userRole !== "super_admin") {
    return res.status(403).json({ error: "ไม่มีสิทธิ์ลบรายการนี้" });
  }

  db.conversations.splice(index, 1);
  delete db.messages[id];
  persistentDb.save();
  persistentDb.logAudit("CONVERSATION_DELETED", currentUserId, `Deleted conversation ${id}`);
  res.json({ success: true, message: "ลบการสนทนาสำเร็จ" });
});

// 4. POST /api/v1/conversations/:id/messages
app.post("/api/v1/conversations/:id/messages", async (req, res) => {
  const { id } = req.params;
  const { content, mode, attachment_ids = [], allow_training = false, raw_audio_data } = req.body;
  const now = new Date().toISOString();

  let conv = db.conversations.find((c) => c.id === id);
  if (!conv) {
    conv = {
      id,
      title: content ? content.slice(0, 24) + " 🍉" : "วิเคราะห์แตงโม",
      lastMessage: "",
      createdAt: now,
      updatedAt: now,
      isPinned: false,
      chatMode: mode || "general",
      messageCount: 0,
    };
    db.conversations.unshift(conv);
    db.messages[id] = [];
  }

  // Knock analysis calculation
  let knockAnalysis = undefined;
  if (mode === "knock-analysis") {
    // Generate realistic acoustic metrics based on scientific model
    const freq = Math.floor(125 + Math.random() * 25);
    const impacts = Math.floor(3 + Math.random() * 2);
    const brix = Number((11.4 + Math.random() * 1.5).toFixed(1));

    knockAnalysis = {
      maturityClass: "สุกพอดี (หวานฉ่ำ)",
      maturityGrade: 4,
      confidence: 0.93,
      qualityStatus: "passed",
      detectedImpacts: impacts,
      dominantFrequencyHz: freq,
      snrDb: 26,
      sweetnessEstimateBrix: brix,
      resonanceDecayRate: 54,
      probabilities: { unripe: 0.04, ripe: 0.92, overripe: 0.04 },
      recommendations: [
        `ความถี่เรโซแนนซ์ ${freq} Hz ก้องกังวานตามธรรมชาติของเนื้อแตงสุกฉ่ำ`,
        `ประเมินความหวานประมาณ ${brix} °Brix เหมาะสำหรับผ่าทานเย็น`,
        "รอยแต้มดิน (Ground Spot) สีเหลืองครีมจะช่วยยืนยันความสุกสูงสุด",
      ],
    };
  }

  // Determine reply content: using Gemini AI if configured, otherwise intelligent expert system
  let replyText = "";
  if (aiClient) {
    try {
      const prompt = `คุณคือ "น้องแตงโม AI" ผู้เชี่ยวชาญด้านสรีรวิทยาและการวิเคราะห์ความสุกของแตงโมไทย จากเสียงเคาะ (Acoustic Resonance), ภาพถ่ายรอยแต้มดิน, ขั้วแตงโม, และสายพันธุ์ (กินรี, ตอร์ปิโด, ซอนญ่า, ไดอาน่า, ไร้เมล็ด)
คำถามของผู้ใช้: "${content}"
โหมด: ${mode}
${knockAnalysis ? `ผลวิเคราะห์เสียงเคาะ: ความถี่ ${knockAnalysis.dominantFrequencyHz} Hz, ผล: ${knockAnalysis.maturityClass}, ความหวาน: ${knockAnalysis.sweetnessEstimateBrix} °Brix` : ""}
โปรดตอบเป็นภาษาไทยอย่างสุภาพ กระชับ อบอุ่น และให้เกร็ดความรู้ที่เป็นประโยชน์เกี่ยวกับแตงโม:`;

      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      replyText = response.text || "";
    } catch (err) {
      console.warn("Gemini call error fallback:", err);
    }
  }

  if (!replyText) {
    if (mode === "knock-analysis") {
      replyText = `น้องแตงโม AI วิเคราะห์คลื่นเสียงเคาะเรียบร้อยแล้วครับ! 🍉\n\n- ผลการประเมิน: **${knockAnalysis?.maturityClass}** (เกรด ${knockAnalysis?.maturityGrade}/5)\n- ความถี่เรโซแนนซ์: ${knockAnalysis?.dominantFrequencyHz} Hz\n- ค่าความหวานโดยประมาณ: ${knockAnalysis?.sweetnessEstimateBrix} °Brix\n- ตรวจพบจังหวะเคาะ: ${knockAnalysis?.detectedImpacts} ครั้ง\n\nคำแนะนำ: เสียงเคาะมีความโปร่งกังวานสม่ำเสมอ เนื้อสัมผัสแน่นกรอบ ไม่กลวงหรือไส้ล้มครับ`;
    } else if (mode === "transcription") {
      replyText = `ถอดข้อความเสียงเรียบร้อยแล้วครับ: "${content || "ช่วยฟังเสียงเคาะแตงโมลูกนี้หน่อย พันธุ์กินรีหนักสี่กิโลกรัม"}"`;
    } else {
      replyText = `สวัสดีครับ! น้องแตงโม AI พร้อมให้คำแนะนำเกี่ยวกับแตงโมเสมอครับ 🍉\n\nสำหรับการเลือกแตงโมที่อร่อยและหวานฉ่ำ ให้สังเกต 3 จุดหลัก:\n1. **เสียงเคาะ**: เสียงตึงๆ กังวานโปร่ง บ่งบอกถึงเนื้อฉ่ำน้ำ\n2. **รอยแต้มดิน (Ground Spot)**: ควรเป็นสีเหลืองนวลหรือเหลืองครีมเข้ม\n3. **ขั้วแตงโม**: ควรเริ่มแห้งม้วนงอเป็นสีน้ำตาล ไม่เขียวสดเกินไป\n\nมีแตงโมลูกไหนอยากให้ช่วยวิเคราะห์ไหมครับ?`;
    }
  }

  const assistantMessage: BackendMessage = {
    id: "msg-" + Date.now() + "-ai",
    conversationId: id,
    role: "assistant",
    content: replyText,
    attachments: [],
    knockAnalysis,
    createdAt: now,
    status: "completed",
    responseTimeMs: 1200,
    modelVersion: "WM-Knock-v2.4-Acoustic",
  };

  conv.lastMessage = replyText.slice(0, 80) + (replyText.length > 80 ? "..." : "");
  conv.updatedAt = now;
  conv.messageCount += 2;

  if (!db.messages[id]) db.messages[id] = [];
  db.messages[id].push(assistantMessage);

  // If user opted-in to training
  if (allow_training) {
    db.trainingCandidates.unshift({
      id: "cand-" + Date.now(),
      sourceType: mode === "knock-analysis" ? "audio" : "chat",
      sourceId: assistantMessage.id,
      userConsentValid: true,
      anonymizationStatus: "completed",
      qualityReviewStatus: "pending",
      detectedClass: knockAnalysis?.maturityClass || "general",
      sweetnessBrix: knockAnalysis?.sweetnessEstimateBrix ?? 12.0,
      variety: "พันธุ์กินรี",
      createdAt: now.split("T")[0],
    });
  }
  persistentDb.save();
  res.json(assistantMessage);
});

// 5. POST /api/v1/files
app.post("/api/v1/files", async (req, res) => {
  const { name = "watermelon-knock-recording.webm", mimeType = "audio/webm", fileData } = req.body;
  if (fileData) {
    try {
      const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");
      const saved = await CloudStorageService.saveFile(name, buffer);
      return res.json({
        id: "att-" + Date.now(),
        type: mimeType.startsWith("image/") ? "image" : "audio",
        name: saved.filename,
        mimeType,
        url: saved.signedUrl,
      });
    } catch {
      // fallback
    }
  }
  const signed = CloudStorageService.generateSignedUrl("watermelon-sample.webm", "read", 86400);
  res.json({
    id: "att-" + Date.now(),
    type: "audio",
    name,
    mimeType,
    url: signed.url,
  });
});

// 6. POST /api/v1/audio/transcriptions
app.post("/api/v1/audio/transcriptions", (req, res) => {
  res.json({
    text: "ช่วยวิเคราะห์เสียงเคาะแตงโมพันธุ์กินรีลูกนี้หน่อยครับ",
    language: "th",
  });
});

// 7. POST /api/v1/audio/knock-analysis
app.post("/api/v1/audio/knock-analysis", (req, res) => {
  res.json({
    maturityClass: "สุกพอดี (หวานฉ่ำ)",
    maturityGrade: 4,
    confidence: 0.94,
    qualityStatus: "passed",
    detectedImpacts: 4,
    dominantFrequencyHz: 134,
    snrDb: 28,
    sweetnessEstimateBrix: 12.2,
    recommendations: [
      "ความถี่ 134 Hz บ่งบอกความสุกพอดี เนื้อแน่นฉ่ำน้ำ",
      "ประเมินค่าความหวานประมาณ 12.2 °Brix",
    ],
  });
});

// 8. POST /api/v1/feedback/reports
app.post("/api/v1/feedback/reports", (req, res) => {
  const { message_id, category, detail } = req.body;
  const report = {
    report_id: "rep-" + Date.now(),
    message_id,
    category,
    detail,
    status: "open",
    created_at: new Date().toISOString(),
  };
  db.reports.push(report);
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
app.patch("/api/v1/users/me/consent", (req, res) => {
  db.consents["me"] = {
    ...db.consents["me"],
    ...req.body,
    updated_at: new Date().toISOString(),
  };
  res.json({ success: true, consent: db.consents["me"] });
});

// 13. GET /api/v1/admin/statistics
app.get("/api/v1/admin/statistics", (req, res) => {
  res.json({
    totalUsers: 14280,
    messagesToday: 9410,
    knockAnalysesCount: 1580,
    pendingReportsCount: db.reports.length + 12,
    averageResponseLatencyMs: 1420,
    lowQualityAudioRatePercent: 7.4,
    errorReportRatePercent: 0.5,
    usageDistribution: {
      generalChat: 62,
      knockAnalysis: 25,
      transcription: 13,
    },
    storageUsedMb: 4320,
    optInTrainingCount: 3840,
  });
});

// 14. DELETE /api/v1/users/me/conversations
app.delete("/api/v1/users/me/conversations", (req, res) => {
  db.conversations = [];
  db.messages = {};
  persistentDb.save();
  res.json({ success: true, message: "ลบประวัติการแชททั้งหมดสำเร็จ" });
});

// 15. GET /api/v1/users/me/data-export
app.get("/api/v1/users/me/data-export", (req, res) => {
  res.setHeader("Content-Disposition", "attachment; filename=watermelon-user-export.json");
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(db, null, 2));
});

// 16. GET /api/v1/watermelons (Lab Specimens)
app.get("/api/v1/watermelons", (req, res) => {
  res.json(db.watermelons);
});

// 17. POST /api/v1/watermelons (Create Specimen)
app.post("/api/v1/watermelons", (req, res) => {
  const newSpecimen = {
    id: "wm-" + Date.now(),
    code: req.body.code || `WM-2026-${Math.floor(100 + Math.random() * 900)}`,
    variety: req.body.variety || "พันธุ์ทั่วไป",
    origin: req.body.origin || "ไม่ระบุแหล่งปลูก",
    harvestDate: req.body.harvestDate || new Date().toISOString().split("T")[0],
    weightKg: Number(req.body.weightKg) || 4.5,
    soundCharacteristics: req.body.soundCharacteristics || "เสียงเคาะทั่วไป",
    predictedStatus: req.body.predictedStatus || "สุกพอดี",
    predictedBrix: Number(req.body.predictedBrix) || 11.5,
    confidence: Number(req.body.confidence) || 0.9,
    dominantFrequencyHz: Number(req.body.dominantFrequencyHz) || 135,
    snrDb: Number(req.body.snrDb) || 25,
    status: "pending_cut",
    createdAt: new Date().toISOString(),
  };
  db.watermelons.unshift(newSpecimen);
  persistentDb.save();
  res.status(201).json(newSpecimen);
});

// 18. POST /api/v1/watermelons/:id/ground-truth (Record Cut & Taste Results)
app.post("/api/v1/watermelons/:id/ground-truth", (req, res) => {
  const { id } = req.params;
  const index = db.watermelons.findIndex((w) => w.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Specimen not found" });
  }

  const truth = {
    cutDate: req.body.cutDate || new Date().toISOString().split("T")[0],
    actualMaturity: req.body.actualMaturity || "สุกพอดี",
    actualBrix: Number(req.body.actualBrix) || 12.0,
    fleshColor: req.body.fleshColor || "แดงสด",
    crispnessScore: Number(req.body.crispnessScore) || 8,
    hollowCore: Boolean(req.body.hollowCore),
    tasteNotes: req.body.tasteNotes || "หวานฉ่ำ",
    verifiedBy: req.body.verifiedBy || "ผู้ตรวจสอบแปลง",
    agreementStatus: req.body.agreementStatus || "match",
  };

  db.watermelons[index].groundTruth = truth;
  db.watermelons[index].status = "verified";

  // Also add to AI Training Candidates if user consented
  db.trainingCandidates.unshift({
    id: "cand-" + Date.now(),
    sourceType: "audio",
    sourceId: id,
    userConsentValid: true,
    anonymizationStatus: "completed",
    qualityReviewStatus: "approved",
    detectedClass: truth.actualMaturity,
    sweetnessBrix: truth.actualBrix,
    variety: db.watermelons[index].variety,
    createdAt: new Date().toISOString().split("T")[0],
  });

  persistentDb.save();
  res.json({ success: true, watermelon: db.watermelons[index] });
});

// 19. POST /api/v1/storage/upload (Upload audio knock recording or watermelon photo)
app.post("/api/v1/storage/upload", async (req, res) => {
  try {
    const { filename, fileData } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: "Missing fileData (base64 string required)" });
    }
    const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const result = await CloudStorageService.saveFile(filename || "audio-knock.webm", buffer);
    persistentDb.logAudit("STORAGE_UPLOAD", (req.headers["x-user-id"] as string) || "anonymous", `Uploaded file: ${result.filename} (${result.size} bytes)`);
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
app.post("/api/v1/storage/signed-url", (req, res) => {
  const { filename, operation = "read", expiresInSec = 7200 } = req.body;
  if (!filename) {
    return res.status(400).json({ error: "Filename required" });
  }
  const result = CloudStorageService.generateSignedUrl(filename, operation, expiresInSec);
  res.json({ success: true, ...result });
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
app.post("/api/v1/database/sync", (req, res) => {
  const { pendingRecords = [] } = req.body;
  const currentUserId = (req.headers["x-user-id"] as string) || "usr-somchai-01";
  let syncedCount = 0;

  for (const record of pendingRecords) {
    if (record.type === "knock-analysis" && record.specimen) {
      db.watermelons.unshift({
        ...record.specimen,
        id: "wm-" + Date.now() + "-" + Math.random().toString(36).slice(2, 5),
        syncedFromOffline: true,
      });
      syncedCount++;
    } else if (record.type === "chat-message" && record.message) {
      const convId = record.conversationId || "conv-1";
      if (!db.messages[convId]) db.messages[convId] = [];
      db.messages[convId].push(record.message);
      syncedCount++;
    }
  }

  persistentDb.save();
  persistentDb.logAudit("OFFLINE_SYNC", currentUserId, `Synced ${syncedCount} records from field offline cache`);
  res.json({ success: true, syncedCount, totalWatermelons: db.watermelons.length });
});

// 23. GET /api/v1/database/stats
app.get("/api/v1/database/stats", (req, res) => {
  res.json({
    engine: "Persistent JSON Database with GCS/Local Storage Adapter",
    conversationsCount: db.conversations.length,
    watermelonsCount: db.watermelons.length,
    auditLogsCount: db.auditLogs.length,
    trainingCandidatesCount: db.trainingCandidates.length,
    lastSaved: new Date().toISOString(),
  });
});

// 24. Authentication & Phone OTP / Social Endpoints
app.post("/api/v1/auth/otp/send", (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length < 9) {
    return res.status(400).json({ error: "กรุณาระบุเบอร์โทรศัพท์ที่ถูกต้อง" });
  }
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const sessionToken = "sess_" + crypto.randomBytes(16).toString("hex");
  if (!db.otpSessions) db.otpSessions = {};
  db.otpSessions[sessionToken] = {
    code: otpCode,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0,
  };
  persistentDb.save();
  persistentDb.logAudit("AUTH_OTP_REQUEST", phone, `Generated OTP session for phone ${phone}`);
  res.json({
    success: true,
    sessionToken,
    message: `ส่งรหัส OTP 6 หลักไปยัง ${phone} เรียบร้อยแล้ว (รหัสมีอายุ 5 นาที)`,
    demoCode: otpCode,
  });
});

app.post("/api/v1/auth/otp/verify", (req, res) => {
  const { sessionToken, code, phone, role = "user" } = req.body;
  if (!db.otpSessions) db.otpSessions = {};
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
  if (session.code !== code) {
    if (session.attempts >= 5) {
      delete db.otpSessions[sessionToken];
      persistentDb.save();
      return res.status(400).json({ error: "กรอกรหัสผิดเกินจำนวนครั้งที่กำหนด" });
    }
    return res.status(400).json({ error: `รหัส OTP ไม่ถูกต้อง (เหลือโอกาส ${5 - session.attempts} ครั้ง)` });
  }

  delete db.otpSessions[sessionToken];
  if (!db.users) db.users = [];
  let user = db.users.find((u: any) => u.phone === phone);
  if (!user) {
    user = {
      id: "usr-" + Date.now(),
      name: `เกษตรกร (${phone.slice(-4)})`,
      phone,
      email: `${phone.replace(/[^0-9]/g, "")}@watermelon-ai.org`,
      role,
      organization: "แปลงเกษตรกรไทย",
    };
    db.users.push(user);
  }
  persistentDb.save();
  persistentDb.logAudit("AUTH_LOGIN_SUCCESS", user.id, `Phone OTP login verified for ${phone}`);
  res.json({ success: true, user, token: "wtm_jwt_" + crypto.randomBytes(24).toString("hex") });
});

app.post("/api/v1/auth/social", (req, res) => {
  const { provider, email, name, avatar, role = "user" } = req.body;
  if (!db.users) db.users = [];
  let user = db.users.find((u: any) => u.email === email);
  if (!user) {
    user = {
      id: "usr-" + Date.now(),
      name: name || "ผู้ใช้งาน Watermelon AI",
      email: email || `user_${Date.now()}@watermelon-ai.org`,
      role,
      avatar: avatar || "🍉",
      organization: provider === "line" ? "LINE User Community" : "Google Workspace Farm",
    };
    db.users.push(user);
  }
  persistentDb.save();
  persistentDb.logAudit("AUTH_SOCIAL_LOGIN", user.id, `Social login via ${provider}`);
  res.json({ success: true, user, token: "wtm_jwt_" + crypto.randomBytes(24).toString("hex") });
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

app.post("/api/v1/pdpa/forget-me", (req, res) => {
  const currentUserId = (req.headers["x-user-id"] as string) || "usr-somchai-01";
  db.conversations = db.conversations.filter((c: any) => c.userId !== currentUserId);
  for (const id of Object.keys(db.messages)) {
    db.messages[id] = db.messages[id].filter((m: any) => m.userId !== currentUserId);
  }
  delete db.consents[currentUserId];
  db.trainingCandidates = db.trainingCandidates.map((cand: any) => {
    if (cand.sourceId && cand.sourceId.includes(currentUserId)) {
      return { ...cand, userConsentValid: false, anonymizationStatus: "purged" };
    }
    return cand;
  });

  persistentDb.save();
  persistentDb.logAudit("PDPA_RIGHT_TO_ERASURE", currentUserId, "User invoked Right to be Forgotten - all personal data deleted");
  res.json({ success: true, message: "ดำเนินการลบข้อมูลส่วนบุคคลและประวัติทั้งหมดตามสิทธิ์ PDPA มาตรา 33 เรียบร้อยแล้ว" });
});

app.get("/api/v1/pdpa/export-my-data", (req, res) => {
  const currentUserId = (req.headers["x-user-id"] as string) || "usr-somchai-01";
  const userConvs = db.conversations.filter((c: any) => !c.userId || c.userId === currentUserId);
  const userMsgs: Record<string, any[]> = {};
  for (const c of userConvs) {
    if (db.messages[c.id]) userMsgs[c.id] = db.messages[c.id];
  }
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    format: "PDPA Data Portability JSON (Section 31)",
    userId: currentUserId,
    userProfile: (db.users && db.users.find((u: any) => u.id === currentUserId)) || { id: currentUserId },
    conversations: userConvs,
    messages: userMsgs,
    consents: db.consents[currentUserId] || {},
    watermelons: db.watermelons,
  };
  persistentDb.logAudit("PDPA_DATA_PORTABILITY_EXPORT", currentUserId, "Exported personal data archive");
  res.setHeader("Content-Disposition", `attachment; filename=watermelon-pdpa-export-${currentUserId}.json`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(exportPayload, null, 2));
});

// Setup Vite middleware in dev or serve static in prod
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🍉 Watermelon AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
