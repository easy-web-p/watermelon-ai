export type MessageRole = "user" | "assistant" | "system";

export type AttachmentType = "image" | "audio" | "document";

export type ChatMode = "general" | "knock-analysis" | "transcription";

export interface ChatAttachment {
  id: string;
  type: AttachmentType;
  name: string;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  sizeBytes?: number;
}

export interface KnockAnalysis {
  maturityClass: "อ่อนเกินไป" | "สุกพอดี (หวานฉ่ำ)" | "สุกเกิน/ไส้ล้ม" | "ไม่แน่ชัด";
  maturityGrade: number; // 1 to 5
  confidence: number; // 0.0 to 1.0
  qualityStatus: "passed" | "uncertain" | "rejected";
  detectedImpacts: number; // e.g. 3 to 5
  snrDb?: number;
  dominantFrequencyHz?: number;
  resonanceDecayRate?: number;
  sweetnessEstimateBrix?: number; // e.g. 11.5 °Bx
  probabilities?: {
    unripe: number;
    ripe: number;
    overripe: number;
  };
  recommendations: string[];
  variety?: string;
  warnings?: string[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  attachments: ChatAttachment[];
  knockAnalysis?: KnockAnalysis;
  createdAt: string;
  status?: "sending" | "completed" | "failed";
  responseTimeMs?: number;
  modelVersion?: string;
}

export interface Conversation {
  id: string;
  title: string;
  folderId?: string;
  lastMessage?: string;
  updatedAt: string;
  createdAt: string;
  isPinned: boolean;
  chatMode?: ChatMode;
  messageCount?: number;
}

export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  category: "วิเคราะห์เสียง" | "ดูลักษณะภายนอก" | "พันธุ์แตงโม" | "การเก็บเกี่ยวและรักษา";
  usageCount: number;
  isShared: boolean;
}

export interface FolderItem {
  id: string;
  name: string;
  color: string;
  conversationCount: number;
  createdAt: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  chunkCount: number;
  updatedAt: string;
  scope: "private" | "team" | "public";
  fileSize: string;
}

export interface LocalAttachment {
  id: string;
  file: File;
  type: AttachmentType;
  previewUrl?: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: "ระบบผิดพลาด" | "วิเคราะห์ไม่แม่นยำ" | "ความเป็นส่วนตัว" | "ข้อเสนอแนะ";
  description: string;
  status: "open" | "investigating" | "resolved";
  createdAt: string;
}

export interface GroundTruth {
  groundTruthId: string;
  watermelonId: string;
  assessedAt: string;
  ripenessGrade: number; // 1 - 5
  ripenessClass: "อ่อนเกินไป" | "สุกพอดี (หวานฉ่ำ)" | "สุกเกิน/ไส้ล้ม";
  sweetnessBrix: number; // e.g. 12.3
  fleshFirmnessKgCm2: number; // e.g. 1.2 kg/cm2
  fleshColor: "แดงสด" | "แดงเข้ม" | "ชมพูอ่อน" | "เหลืองทอง";
  hollownessStatus: boolean; // กลวงหรือไม่
  crispnessScore: number; // 1 - 5
  juiceScore: number; // 1 - 5
  defectStatus: "ปกติ" | "ไส้ล้ม" | "เนื้อช้ำ" | "แกนแข็ง";
  assessorName: string;
  notes?: string;
}

export interface WatermelonSpecimen {
  watermelonId: string;
  watermelonCode: string;
  varietyName: string;
  weightKg: number;
  harvestDate: string;
  daysAfterHarvest: number;
  farmLocation: string;
  shape: "กลม" | "ยาวรี" | "รี";
  skinPattern: string;
  groundSpotColor: "ขาวซีด" | "เหลืองอ่อน" | "เหลืองนวลอมครีม";
  stemCondition: "เขียวสด" | "เริ่มคดงอแห้ง" | "แห้งสนิท";
  predictedAnalysis?: KnockAnalysis;
  groundTruth?: GroundTruth;
  createdAt: string;
}

export interface AudioSamplePreset {
  id: string;
  title: string;
  variety: string;
  description: string;
  expectedClass: "สุกพอดี (หวานฉ่ำ)" | "อ่อนเกินไป" | "สุกเกิน/ไส้ล้ม";
  frequencyHz: number;
  sweetnessBrix: number;
  audioUrl: string;
}

