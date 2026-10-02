import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "data");
const UPLOADS_DIR = path.resolve(__dirname, "uploads");
const DB_FILE = path.join(DATA_DIR, "watermelon_db.json");

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const STORAGE_SECRET = process.env.STORAGE_SECRET || "watermelon-secret-key-2026-acoustic-secure";

export interface DatabaseSchema {
  conversations: any[];
  messages: Record<string, any[]>;
  prompts: any[];
  folders: any[];
  knowledge: any[];
  reports: any[];
  trainingCandidates: any[];
  consents: Record<string, any>;
  watermelons: any[];
  auditLogs: any[];
  users: any[];
  otpSessions: Record<string, { code: string; expiresAt: number; attempts: number }>;
}

const defaultSeedData: DatabaseSchema = {
  conversations: [
    {
      id: "conv-1",
      userId: "usr-somchai-01",
      title: "เคาะแตงโมพันธุ์กินรีลูกแรก 🍉",
      lastMessage: "AI ประเมินว่าแตงโมมีแนวโน้มสุกพร้อมรับประทาน (หวาน 12.2 °Bx)",
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      isPinned: true,
      chatMode: "knock-analysis",
      messageCount: 2,
    },
    {
      id: "conv-2",
      userId: "usr-somchai-01",
      title: "วิธีสังเกตขั้วแตงโมและรอยแต้มดิน",
      lastMessage: "ขั้วต้องเริ่มแห้งเป็นสีน้ำตาล รอยแต้มดินต้องเป็นสีเหลืองครีม",
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      isPinned: false,
      chatMode: "general",
      messageCount: 4,
    },
  ],
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
    ],
  },
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
  reports: [],
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
  consents: {},
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
  ],
  auditLogs: [
    {
      id: "log-1",
      action: "SYSTEM_INIT",
      actorId: "system",
      details: "ระบบฐานข้อมูล Persistent Watermelon AI เริ่มต้นทำงาน",
      timestamp: new Date().toISOString(),
    },
  ],
  users: [
    {
      id: "usr-somchai-01",
      name: "คุณสมชาย เกษตรกรแตงโม",
      phone: "081-234-5678",
      email: "somchai@farmsuphan.com",
      role: "user",
      organization: "แปลงปลูกสุพรรณบุรี",
    },
    {
      id: "usr-dr-wichan-02",
      name: "ดร.วิชาญ วิจัยพืชสวน",
      phone: "089-876-5432",
      email: "dr.wichan@horticulture.ac.th",
      role: "researcher",
      organization: "สถาบันวิจัยพืชสวนแตงไทย",
    },
  ],
  otpSessions: {},
};

class PersistentDatabase {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadFromDisk();
  }

  private loadFromDisk(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        return { ...defaultSeedData, ...parsed };
      }
    } catch (err) {
      console.warn("⚠️ Could not load database from disk, using seed data:", err);
    }
    // Save seed initially
    this.saveImmediate(defaultSeedData);
    return defaultSeedData;
  }

  public getDb(): DatabaseSchema {
    return this.data;
  }

  public save(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveImmediate(this.data);
    }, 200);
  }

  private saveImmediate(data: DatabaseSchema): void {
    try {
      const tempPath = DB_FILE + ".tmp";
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error("❌ Failed to persist database to disk:", err);
    }
  }

  public logAudit(action: string, actorId: string, details: string) {
    const entry = {
      id: "log-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      action,
      actorId,
      details,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(entry);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.length = 500;
    }
    this.save();
  }
}

export const persistentDb = new PersistentDatabase();

// -------------------------------------------------------------
// Cloud Object Storage & Pre-signed URL Service
// -------------------------------------------------------------
export class CloudStorageService {
  /**
   * Generates a tamper-proof HMAC signed URL valid for a specific duration
   */
  public static generateSignedUrl(
    filename: string,
    operation: "read" | "write" = "read",
    expiresInSec: number = 7200
  ): { url: string; token: string; expiresAt: number } {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSec;
    const payload = `${operation}:${filename}:${expiresAt}`;
    const token = crypto
      .createHmac("sha256", STORAGE_SECRET)
      .update(payload)
      .digest("hex");

    const url = `/api/v1/storage/files/${token}/${expiresAt}/${encodeURIComponent(filename)}`;
    return { url, token, expiresAt };
  }

  /**
   * Verifies an incoming signed token
   */
  public static verifySignedUrl(
    token: string,
    filename: string,
    expiresAt: number,
    operation: "read" | "write" = "read"
  ): boolean {
    const now = Math.floor(Date.now() / 1000);
    if (now > expiresAt) {
      return false; // Token expired
    }
    const payload = `${operation}:${filename}:${expiresAt}`;
    const expectedToken = crypto
      .createHmac("sha256", STORAGE_SECRET)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(expectedToken)
    );
  }

  /**
   * Saves a file to local persistent storage (or Cloud Storage if configured)
   */
  public static async saveFile(
    filename: string,
    buffer: Buffer
  ): Promise<{ filename: string; path: string; size: number; signedUrl: string }> {
    const safeName = Date.now() + "-" + path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(UPLOADS_DIR, safeName);
    fs.writeFileSync(filePath, buffer);

    const { url } = this.generateSignedUrl(safeName, "read", 86400 * 7); // 7 days
    return {
      filename: safeName,
      path: filePath,
      size: buffer.length,
      signedUrl: url,
    };
  }

  public static getFilePath(filename: string): string | null {
    const safeName = path.basename(filename);
    const fullPath = path.join(UPLOADS_DIR, safeName);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    return null;
  }
}
