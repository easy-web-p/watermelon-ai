import {
  ChatAttachment,
  ChatMessage,
  ChatMode,
  Conversation,
  FolderItem,
  KnowledgeDocument,
  PromptTemplate,
  KnockAnalysis,
} from "@/types/chat";
import {
  AuditLogItem,
  ModelVersionInfo,
  TrainingCandidate,
  UserConsentState,
} from "@/types/consent";
import { analyzeWatermelonKnockAudio } from "./audio-analyzer";

const API_BASE_URL =
  (typeof window !== "undefined" && (window as unknown as { ENV?: { NEXT_PUBLIC_API_URL?: string } }).ENV?.NEXT_PUBLIC_API_URL) ||
  "";

// In-memory + LocalStorage cache for high reliability
const STORAGE_PREFIX = "watermelon_ai_";

function loadStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveStorage<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

// Initial seed data
const initialConversations: Conversation[] = [
  {
    id: "conv-1",
    title: "เคาะแตงโมพันธุ์กินรีลูกแรก 🍉",
    lastMessage: "AI ประเมินว่าแตงโมมีแนวโน้มสุกพร้อมรับประทาน (หวาน 12.2 °Bx)",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    isPinned: true,
    chatMode: "knock-analysis",
    messageCount: 3,
  },
  {
    id: "conv-2",
    title: "วิธีสังเกตขั้วแตงโมและรอยแต้มดิน",
    lastMessage: "ขั้วต้องเริ่มแห้งเป็นสีน้ำตาล รอยแต้มดินต้องเป็นสีเหลืองครีม",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    isPinned: false,
    chatMode: "general",
    messageCount: 4,
  },
  {
    id: "conv-3",
    title: "บันทึกเสียงแปลงแตงโมสวนสุพรรณ",
    lastMessage: "ถอดเสียงพูด: 'วันนี้เคาะไปสิบลูก เสียงกังวานดีมาก'",
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    isPinned: false,
    chatMode: "transcription",
    messageCount: 2,
  },
];

const initialMessages: Record<string, ChatMessage[]> = {
  "conv-1": [
    {
      id: "msg-1-1",
      conversationId: "conv-1",
      role: "user",
      content: "ช่วยวิเคราะห์เสียงเคาะแตงโมลูกนี้หน่อย พันธุ์กินรี น้ำหนักประมาณ 4 กิโลกรัม",
      attachments: [
        {
          id: "att-demo-1",
          type: "audio",
          name: "knock-kinnaree-01.webm",
          mimeType: "audio/webm",
          url: "https://actions.google.com/sounds/v1/foley/knocking_on_wood.ogg",
          durationSeconds: 3,
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 2 + 1000).toISOString(),
      status: "completed",
    },
    {
      id: "msg-1-2",
      conversationId: "conv-1",
      role: "assistant",
      content:
        "ได้รับไฟล์เสียงเคาะแล้วครับ จากการวิเคราะห์คลื่นเสียง (Acoustic Resonance Analysis) น้องแตงโม AI ขอสรุปผลให้ดังนี้ครับ:",
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
        resonanceDecayRate: 58,
        probabilities: {
          unripe: 0.04,
          ripe: 0.92,
          overripe: 0.04,
        },
        recommendations: [
          "ความถี่เรโซแนนซ์ 134 Hz บ่งบอกว่าความหนาแน่นเนื้อสัมผัสสุกสมบูรณ์ ไม่กลวง",
          "ประเมินค่าความหวานเฉลี่ย 12.2 °Brix เหมาะสำหรับผ่าทานเย็นสดชื่น",
          "รอยเคาะ 4 ครั้งมีความชัดเจน ไม่มีเสียงแตกพร่า (Passed Quality Check)",
        ],
      },
      createdAt: new Date(Date.now() - 3600000 * 2 + 2500).toISOString(),
      status: "completed",
      responseTimeMs: 1450,
      modelVersion: "WM-Knock-v2.4-Acoustic",
    },
  ],
};

const initialPrompts: PromptTemplate[] = [
  {
    id: "p-1",
    title: "วิเคราะห์เสียงเคาะ 3–5 จังหวะ",
    content: "ช่วยวิเคราะห์เสียงเคาะแตงโมลูกนี้ ตรวจดูระดับความถี่ และประเมินว่าเนื้อในยังแน่นหรือเริ่มกลวง",
    category: "วิเคราะห์เสียง",
    usageCount: 428,
    isShared: true,
  },
  {
    id: "p-2",
    title: "ตรวจสอบความสุกจากภาพถ่ายรอยแต้มดิน",
    content: "ตรวจสอบภาพแตงโมลูกนี้ ดูสีของรอยแต้มดิน (Ground spot) และสภาพขั้วว่าพร้อมเก็บเกี่ยวหรือยัง",
    category: "ดูลักษณะภายนอก",
    usageCount: 312,
    isShared: true,
  },
  {
    id: "p-3",
    title: "แนะนำแตงโมพันธุ์กินรี vs ตอร์ปิโด",
    content: "เปรียบเทียบลักษณะทางกายภาพ รสสัมผัส และค่าความหวาน Brix ของแตงโมกินรีกับตอร์ปิโด",
    category: "พันธุ์แตงโม",
    usageCount: 185,
    isShared: false,
  },
  {
    id: "p-4",
    title: "เทคนิคการเก็บรักษาหลังผ่าตรวจ",
    content: "แตงโมที่ผ่าแล้วควรเก็บรักษาที่อุณหภูมิกี่องศาเซลเซียส และอยู่ได้นานกี่วันโดยไม่สูญเสียความกรอบ",
    category: "การเก็บเกี่ยวและรักษา",
    usageCount: 96,
    isShared: true,
  },
];

const initialFolders: FolderItem[] = [
  { id: "f-1", name: "แปลงวิจัยสุพรรณบุรี", color: "#16A34A", conversationCount: 5, createdAt: "2026-03-01" },
  { id: "f-2", name: "ทดสอบแตงโมไร้เมล็ด", color: "#E11D48", conversationCount: 3, createdAt: "2026-03-10" },
  { id: "f-3", name: "คัดเกรดส่งออกห้าง", color: "#D97706", conversationCount: 8, createdAt: "2026-03-18" },
];

const initialKnowledge: KnowledgeDocument[] = [
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
  {
    id: "doc-2",
    title: "เกณฑ์การวัดความหวาน °Brix และความแน่นเนื้อแตงโมส่งออก",
    description: "ข้อกำหนดค่า Brix ขั้นต่ำ 10.5–12.0 สำหรับเกรดพรีเมียม และการตรวจสอบรอยแต้มดิน",
    category: "มาตรฐานสินค้า",
    chunkCount: 16,
    updatedAt: "2026-03-15",
    scope: "public",
    fileSize: "1.1 MB",
  },
  {
    id: "doc-3",
    title: "แนวปฏิบัติ PDPA สำหรับชุดข้อมูลเกษตรอัจฉริยะและการฝึก AI",
    description: "ขั้นตอน Opt-in การตัดทอนข้อมูลส่วนบุคคล (Anonymization) ก่อนบันทึกลง Training Candidates",
    category: "ความเป็นส่วนตัว",
    chunkCount: 12,
    updatedAt: "2026-03-25",
    scope: "team",
    fileSize: "840 KB",
  },
];

// In-memory dynamic stores
let conversationsList: Conversation[] = loadStorage("conversations", initialConversations);
let messagesStore: Record<string, ChatMessage[]> = loadStorage("messages", initialMessages);
let promptsList: PromptTemplate[] = loadStorage("prompts", initialPrompts);
let foldersList: FolderItem[] = loadStorage("folders", initialFolders);
let knowledgeList: KnowledgeDocument[] = loadStorage("knowledge", initialKnowledge);

// Helper for saving
function syncConversations() {
  saveStorage("conversations", conversationsList);
}
function syncMessages() {
  saveStorage("messages", messagesStore);
}

// 1. Get conversations
export async function getConversations(search = ""): Promise<Conversation[]> {
  const q = search.trim().toLowerCase();
  if (!q) return [...conversationsList];
  return conversationsList.filter(
    (c) => c.title.toLowerCase().includes(q) || (c.lastMessage && c.lastMessage.toLowerCase().includes(q)),
  );
}

// 2. Create conversation
export async function createConversation(title = "แชทแตงโมใหม่ 🍉", mode: ChatMode = "general"): Promise<Conversation> {
  const newConv: Conversation = {
    id: "conv-" + Date.now(),
    title,
    lastMessage: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPinned: false,
    chatMode: mode,
    messageCount: 0,
  };
  conversationsList = [newConv, ...conversationsList];
  messagesStore[newConv.id] = [];
  syncConversations();
  syncMessages();
  return newConv;
}

// 3. Get messages
export async function getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  return messagesStore[conversationId] || [];
}

// 4. Upload file
export async function uploadFile(
  file: File,
  purpose: "chat" | "knock-analysis" | "transcription" | "general" = "chat",
): Promise<ChatAttachment> {
  const isImage = file.type.startsWith("image/");
  const isAudio = file.type.startsWith("audio/");
  const url = URL.createObjectURL(file);

  return {
    id: "att-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    type: isImage ? "image" : isAudio ? "audio" : "document",
    name: file.name,
    mimeType: file.type || (isImage ? "image/jpeg" : "audio/webm"),
    url,
    sizeBytes: file.size,
  };
}

// 5. Send message
export interface SendMessagePayload {
  conversationId: string;
  content: string;
  mode: ChatMode;
  attachmentIds?: string[];
  attachments?: ChatAttachment[];
  rawFiles?: File[];
  allowTraining?: boolean;
}

export async function sendMessage(payload: SendMessagePayload): Promise<ChatMessage> {
  const { conversationId, content, mode, attachments = [], rawFiles = [], allowTraining } = payload;

  const conv = conversationsList.find((c) => c.id === conversationId);
  const now = new Date().toISOString();

  // If conversation doesn't exist, create it
  if (!conv) {
    const fresh = await createConversation(
      content.slice(0, 28) || (mode === "knock-analysis" ? "วิเคราะห์เสียงเคาะแตงโม" : "การสนทนาใหม่"),
      mode,
    );
    conversationsList = [fresh, ...conversationsList.filter((c) => c.id !== fresh.id)];
  }

  // Determine if there is an audio file to analyze
  let knockResult: KnockAnalysis | undefined;
  const audioFile = rawFiles.find((f) => f.type.startsWith("audio/"));

  if (mode === "knock-analysis") {
    if (audioFile) {
      knockResult = await analyzeWatermelonKnockAudio(audioFile);
    } else {
      // Analyze based on provided text description or simulate realistic acoustic check
      const detected = Math.floor(Math.random() * 3) + 3;
      knockResult = {
        maturityClass: "สุกพอดี (หวานฉ่ำ)",
        maturityGrade: 4,
        confidence: 0.92,
        qualityStatus: "passed",
        detectedImpacts: detected,
        dominantFrequencyHz: 135,
        snrDb: 26,
        sweetnessEstimateBrix: 12.1,
        resonanceDecayRate: 54,
        probabilities: { unripe: 0.05, ripe: 0.90, overripe: 0.05 },
        recommendations: [
          "วิเคราะห์จากข้อมูลเสียงเคาะพบว่าคลื่นเสียงมีความโปร่งกังวาน ไม่ทึบอับ",
          "ประเมินระดับความสุกเกรด 4/5 เนื้อสัมผัสแน่น กรอบฉ่ำน้ำ ไส้ไม่ล้ม",
          "เหมาะสำหรับเปิดรับประทานทันที หรือแช่เย็น 10–12°C เพื่อรสชาติที่ดีที่สุด",
        ],
      };
    }
  }

  // Generate intelligent watermelon response
  let replyText = "";
  if (mode === "knock-analysis") {
    replyText = `น้องแตงโม AI วิเคราะห์เสียงเคาะเรียบร้อยแล้วครับ! 🍉\n\nผลการประเมิน: **${knockResult?.maturityClass}** (ระดับ ${knockResult?.maturityGrade}/5)\nตรวจพบจังหวะเคาะ ${knockResult?.detectedImpacts} ครั้ง พร้อมคลื่นความถี่เรโซแนนซ์ ${knockResult?.dominantFrequencyHz} Hz ค่าความหวานประมาณ ${knockResult?.sweetnessEstimateBrix} °Brix\n\nคำแนะนำ: คุณสามารถสังเกต 'ขั้วแตงโม' ว่ามีลักษณะคดงอแห้ง และรอยแต้มดินสีครีมเข้มเพื่อยืนยันร่วมด้วยได้ครับ`;
  } else if (mode === "transcription") {
    replyText = `ถอดข้อความเสียงเรียบร้อยแล้วครับ: "${content || "เคาะแตงโมฟังดูเสียงก้องแน่นดีมาก อยากให้ AI ช่วยดูความหวานให้หน่อย"}"`;
  } else {
    // General chat
    replyText = generateWatermelonAIResponse(content, attachments);
  }

  const assistantMessage: ChatMessage = {
    id: "msg-" + Date.now() + "-ai",
    conversationId,
    role: "assistant",
    content: replyText,
    attachments: [],
    knockAnalysis: knockResult,
    createdAt: now,
    status: "completed",
    responseTimeMs: Math.floor(800 + Math.random() * 600),
    modelVersion: "WM-Knock-v2.4-Acoustic",
  };

  // Update conversation last message
  const targetConv = conversationsList.find((c) => c.id === conversationId);
  if (targetConv) {
    targetConv.lastMessage = replyText.slice(0, 70) + (replyText.length > 70 ? "..." : "");
    targetConv.updatedAt = now;
    targetConv.messageCount = (targetConv.messageCount || 0) + 2;
    if (targetConv.title === "แชทแตงโมใหม่ 🍉" && content.trim()) {
      targetConv.title = content.trim().slice(0, 24) + " 🍉";
    }
    syncConversations();
  }

  // Update messages in store
  const currentList = messagesStore[conversationId] || [];
  messagesStore[conversationId] = [...currentList, assistantMessage];
  syncMessages();

  // If user opted-in to training, record to candidate list
  if (allowTraining) {
    recordTrainingCandidate({
      sourceType: mode === "knock-analysis" ? "audio" : "chat",
      sourceId: assistantMessage.id,
      detectedClass: knockResult?.maturityClass || "general_inquiry",
      sweetnessBrix: knockResult?.sweetnessEstimateBrix,
    });
  }

  return assistantMessage;
}

function generateWatermelonAIResponse(userText: string, attachments: ChatAttachment[]): string {
  const text = userText.toLowerCase();

  if (attachments.some((a) => a.type === "image")) {
    return `สวัสดีครับ! น้องแตงโม AI ได้ตรวจสอบรูปภาพที่แนบมาแล้วครับ 🍉\n\n1. **ดูลายและผิวเปลือก**: เปลือกมีลายเส้นสีเขียวเข้มสลับชัดเจน มีความมันเงาลดลงเล็กน้อย (ผิวเริ่มนวล) ซึ่งเป็นสัญญาณที่ดีของแตงแก่จัด\n2. **รอยแต้มดิน (Ground Spot)**: หากรอยแต้มดินใต้ลูกเปลี่ยนจากสีขาวซีดเป็น 'สีเหลืองครีมหรือเหลืองนวล' แสดงว่าสุกคาต้นอย่างสมบูรณ์\n3. **ขั้วแตงโม**: หากขั้วแห้งเกลียว แสดงว่าเก็บเกี่ยวในระยะสุกพอดีครับ`;
  }

  if (text.includes("เคาะ") || text.includes("เสียง") || text.includes("ฟัง")) {
    return `วิธีเคาะแตงโมเพื่อฟังเสียงอย่างแม่นยำ:\n\n1. **เสียงตึงๆ กังวาน (โบ๊ะๆ)**: เนื้อแน่นฉ่ำน้ำ น้ำตาลสะสมเต็มที่ กำลังสุกหวานพอดี\n2. **เสียงเป๊กๆ / แปะๆ (สูงและแข็ง)**: แตงยังอ่อน เนื้อแน่นดิบ รสชาติยังจืด\n3. **เสียงตุบๆ / ปึกๆ (ทึบอับ)**: สุกเกินไป เนื้อเริ่มนิ่มยวบ หรืออาจมีโพรงอากาศภายใน (ไส้ล้ม)\n\nกดเลือกโหมด **🍉 วิเคราะห์เสียงเคาะ** แล้วกดปุ่มไมโครโฟนเพื่อเคาะให้ AI ฟังได้ทันทีครับ!`;
  }

  if (text.includes("พันธุ์") || text.includes("กินรี") || text.includes("ตอร์ปิโด") || text.includes("ซอนญ่า")) {
    return `พันธุ์แตงโมยอดนิยมในประเทศไทย:\n\n- **พันธุ์กินรี (Kinnaree)**: ทรงกลมรี ลายเส้นคมชัด เนื้อสีแดงสด ละเอียด กรอบ หวาน 11–13 °Brix\n- **พันธุ์ตอร์ปิโด (Torpedo)**: ทรงยาวรี เปลือกเหนียวทนทาน ขนส่งง่าย เนื้อแน่นกรอบมาก หวาน 11–12 °Brix\n- **พันธุ์ซอนญ่า (Sonya)**: ทรงกลม เปลือกดำเข้ม เนื้อแดงเข้ม รสหวานจัด เนื้อทราย\n- **พันธุ์ไดอาน่า (Diana / เนื้อเหลือง)**: เนื้อสีเหลืองทอง หอมละมุน ชื่นใจ หวาน 10.5–12 °Brix\n- **พันธุ์ไร้เมล็ด (Seedless)**: เคี้ยวง่าย สะดวก เหมาะกับเด็กและผู้สูงอายุ`;
  }

  if (text.includes("หวาน") || text.includes("บริกซ์") || text.includes("brix")) {
    return `เกณฑ์ค่าความหวานของแตงโม (°Brix):\n\n- ต่ำกว่า 10.0 °Bx: หวานน้อยหรือยังอ่อน\n- 10.5 – 11.5 °Bx: หวานปานกลาง มาตรฐานตลาดทั่วไป\n- 12.0 – 13.0 °Bx: หวานฉ่ำ ชื่นใจ เกรดพรีเมียม\n- มากกว่า 13.0 °Bx: หวานจัดพิเศษ (มักพบในแตงตัดสดสุกคาต้น)`;
  }

  return `ยินดีต้อนรับสู่ น้องแตงโม AI ครับ! 🍉\n\nผมพร้อมช่วยคุณวิเคราะห์ความสุกแตงโมจาก:\n• **เสียงเคาะ**: ใช้ไมโครโฟนอัดเสียงเคาะ 3–5 ครั้ง\n• **รูปภาพ**: แนบรูปดูลายผิว รอยแต้มดิน และขั้วแตง\n• **ข้อสอบถามทั่วไป**: แนะนำสายพันธุ์ การเพาะปลูก และการเก็บรักษา\n\nมีอะไรให้ช่วยตรวจสอบแตงโมวันนี้ไหมครับ?`;
}

// 6. Transcribe audio
export async function transcribeAudio(file: File): Promise<{ text: string; language: string }> {
  // Simulating speech to text / returning realistic Thai transcription
  await new Promise((r) => setTimeout(r, 900));
  const samples = [
    "ช่วยวิเคราะห์แตงโมลูกนี้หน่อย เคาะแล้วเสียงกังวานดีมาก",
    "แตงโมพันธุ์กินรีลูกนี้สุกพอดีไหม น้ำหนักประมาณสี่กิโลกรัม",
    "ช่วยดูรอยแต้มดินกับขั้วแตงโมให้หน่อยว่าพร้อมตัดหรือยัง",
    "เสียงเคาะแปะแปะแบบนี้แสดงว่ายังอ่อนอยู่ใช่ไหม",
  ];
  const text = samples[Math.floor(Math.random() * samples.length)];
  return { text, language: "th" };
}

// 7. Report message
export async function reportMessage(data: {
  messageId: string;
  category: string;
  detail: string;
  expectedAnswer?: string;
}): Promise<{ success: boolean; reportId: string }> {
  await new Promise((r) => setTimeout(r, 400));
  return {
    success: true,
    reportId: "rep-" + Date.now(),
  };
}

// 8. Saved Prompts
export async function getPrompts(): Promise<PromptTemplate[]> {
  return [...promptsList];
}

export async function createPrompt(prompt: Omit<PromptTemplate, "id" | "usageCount">): Promise<PromptTemplate> {
  const newP: PromptTemplate = {
    ...prompt,
    id: "p-" + Date.now(),
    usageCount: 0,
  };
  promptsList = [newP, ...promptsList];
  saveStorage("prompts", promptsList);
  return newP;
}

// 9. Folders
export async function getFolders(): Promise<FolderItem[]> {
  return [...foldersList];
}

export async function createFolder(name: string, color = "#16A34A"): Promise<FolderItem> {
  const newF: FolderItem = {
    id: "f-" + Date.now(),
    name,
    color,
    conversationCount: 0,
    createdAt: new Date().toISOString().split("T")[0],
  };
  foldersList = [newF, ...foldersList];
  saveStorage("folders", foldersList);
  return newF;
}

// 10. Knowledge Documents
export async function getKnowledge(): Promise<KnowledgeDocument[]> {
  return [...knowledgeList];
}

export async function createKnowledge(doc: Omit<KnowledgeDocument, "id" | "updatedAt">): Promise<KnowledgeDocument> {
  const newDoc: KnowledgeDocument = {
    ...doc,
    id: "doc-" + Date.now(),
    updatedAt: new Date().toISOString().split("T")[0],
  };
  knowledgeList = [newDoc, ...knowledgeList];
  saveStorage("knowledge", knowledgeList);
  return newDoc;
}

// 11. Consent management
export async function updateConsentApi(data: Partial<UserConsentState>): Promise<{ success: boolean }> {
  return { success: true };
}

// 12. Admin Statistics & AI Training Data
export interface AdminStatistics {
  totalUsers: number;
  messagesToday: number;
  knockAnalysesCount: number;
  pendingReportsCount: number;
  averageResponseLatencyMs: number;
  lowQualityAudioRatePercent: number;
  errorReportRatePercent: number;
  usageDistribution: {
    generalChat: number;
    knockAnalysis: number;
    transcription: number;
  };
  storageUsedMb: number;
  optInTrainingCount: number;
}

export async function getAdminStatistics(): Promise<AdminStatistics> {
  return {
    totalUsers: 14280,
    messagesToday: 9410,
    knockAnalysesCount: 1580,
    pendingReportsCount: 12,
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
  };
}

let trainingCandidates: TrainingCandidate[] = loadStorage("training_candidates", [
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
  {
    id: "cand-2",
    sourceType: "audio",
    sourceId: "rec-8402",
    userConsentValid: true,
    anonymizationStatus: "completed",
    qualityReviewStatus: "pending",
    detectedClass: "อ่อนเกินไป",
    sweetnessBrix: 9.4,
    variety: "พันธุ์ตอร์ปิโด",
    createdAt: "2026-03-28",
  },
  {
    id: "cand-3",
    sourceType: "chat",
    sourceId: "msg-9921",
    userConsentValid: true,
    anonymizationStatus: "pending",
    qualityReviewStatus: "pending",
    detectedClass: "สุกเกิน/ไส้ล้ม",
    sweetnessBrix: 12.8,
    variety: "พันธุ์ซอนญ่า",
    createdAt: "2026-03-27",
  },
]);

function recordTrainingCandidate(data: Partial<TrainingCandidate>) {
  const newCand: TrainingCandidate = {
    id: "cand-" + Date.now(),
    sourceType: data.sourceType || "audio",
    sourceId: data.sourceId || "sys-" + Date.now(),
    userConsentValid: true,
    anonymizationStatus: "completed",
    qualityReviewStatus: "pending",
    detectedClass: data.detectedClass || "สุกพอดี",
    sweetnessBrix: data.sweetnessBrix || 12.0,
    variety: data.variety || "พันธุ์กินรี",
    createdAt: new Date().toISOString().split("T")[0],
  };
  trainingCandidates = [newCand, ...trainingCandidates];
  saveStorage("training_candidates", trainingCandidates);
}

export async function getTrainingCandidates(): Promise<TrainingCandidate[]> {
  return [...trainingCandidates];
}

export async function updateCandidateStatus(id: string, status: "approved" | "rejected"): Promise<void> {
  trainingCandidates = trainingCandidates.map((c) =>
    c.id === id ? { ...c, qualityReviewStatus: status } : c,
  );
  saveStorage("training_candidates", trainingCandidates);
}

export async function getModelVersions(): Promise<ModelVersionInfo[]> {
  return [
    {
      versionId: "mod-1",
      name: "Watermelon-Acoustic-Resonance-V2",
      version: "v2.4.1",
      taskType: "knock-acoustic-classifier",
      datasetVersion: "WM-DS-2026.03-Cleaned",
      accuracy: 94.6,
      f1Score: 0.941,
      status: "active",
      deployedAt: "2026-03-15",
    },
    {
      versionId: "mod-2",
      name: "Watermelon-Vision-Ripeness-Check",
      version: "v1.8.0",
      taskType: "image-ripeness-detector",
      datasetVersion: "WM-IMG-2026.02",
      accuracy: 91.2,
      f1Score: 0.908,
      status: "active",
      deployedAt: "2026-03-01",
    },
    {
      versionId: "mod-3",
      name: "Thai-Melon-Agriculture-LLM",
      version: "v3.0.0",
      taskType: "thai-watermelon-llm",
      datasetVersion: "WM-TEXT-2026.03",
      accuracy: 96.2,
      f1Score: 0.958,
      status: "candidate",
      deployedAt: "2026-03-25",
    },
  ];
}

export async function getAuditLogs(): Promise<AuditLogItem[]> {
  return [
    {
      id: "log-1",
      actor: "user_a19283",
      action: "analyze_audio",
      resourceType: "knock_recordings",
      ipHash: "e3b0c44...a9",
      result: "success",
      timestamp: "2026-03-29 21:14:02",
    },
    {
      id: "log-2",
      actor: "user_b88231",
      action: "update_consent",
      resourceType: "user_consents",
      ipHash: "f1a2389...c4",
      result: "success",
      timestamp: "2026-03-29 20:45:11",
    },
    {
      id: "log-3",
      actor: "admin_somchai",
      action: "model_deploy",
      resourceType: "model_versions",
      ipHash: "a9310bc...77",
      result: "success",
      timestamp: "2026-03-29 19:30:00",
    },
    {
      id: "log-4",
      actor: "user_c49102",
      action: "export_data",
      resourceType: "user_data",
      ipHash: "7b4a112...fe",
      result: "success",
      timestamp: "2026-03-29 18:12:44",
    },
  ];
}

// 13. Delete chat history
export async function deleteUserConversations(): Promise<void> {
  conversationsList = [];
  messagesStore = {};
  syncConversations();
  syncMessages();
}

// 14. Data export (PDPA right of access)
export async function exportUserData(): Promise<Blob> {
  const exportData = {
    exportedAt: new Date().toISOString(),
    conversations: conversationsList,
    prompts: promptsList,
    folders: foldersList,
    note: "ไฟล์สำเนาข้อมูลส่วนบุคคลตามสิทธิ PDPA พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562",
  };
  return new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
}

// 15. Watermelon Specimens & Ground Truths
import { WatermelonSpecimen, GroundTruth, AudioSamplePreset } from "@/types/chat";

const initialSpecimens: WatermelonSpecimen[] = [
  {
    watermelonId: "wm-001",
    watermelonCode: "WM-2026-SP01",
    varietyName: "พันธุ์กินรี (Kinnaree)",
    weightKg: 4.2,
    harvestDate: "2026-03-26",
    daysAfterHarvest: 3,
    farmLocation: "แปลงเกษตรอินทรีย์ ดอนเจดีย์ สุพรรณบุรี",
    shape: "ยาวรี",
    skinPattern: "เปลือกเขียวสว่าง ลายริ้วเข้มสม่ำเสมอ ผิวนวล",
    groundSpotColor: "เหลืองนวลอมครีม",
    stemCondition: "เริ่มคดงอแห้ง",
    predictedAnalysis: {
      maturityClass: "สุกพอดี (หวานฉ่ำ)",
      maturityGrade: 4,
      confidence: 0.94,
      qualityStatus: "passed",
      detectedImpacts: 4,
      dominantFrequencyHz: 134,
      snrDb: 28,
      sweetnessEstimateBrix: 12.2,
      recommendations: ["เสียงเรโซแนนซ์ 134 Hz เนื้อแน่นฉ่ำน้ำ"],
    },
    groundTruth: {
      groundTruthId: "gt-001",
      watermelonId: "wm-001",
      assessedAt: "2026-03-29 14:30",
      ripenessGrade: 4,
      ripenessClass: "สุกพอดี (หวานฉ่ำ)",
      sweetnessBrix: 12.4,
      fleshFirmnessKgCm2: 1.15,
      fleshColor: "แดงสด",
      hollownessStatus: false,
      crispnessScore: 5,
      juiceScore: 5,
      defectStatus: "ปกติ",
      assessorName: "ดร.วิชาญ วิจัยแตงโม",
      notes: "สีเนื้อแดงสม่ำเสมอ เมล็ดดำสนิท รสหวานกรอบฉ่ำ ตรงกับการทำนายของ AI 100%",
    },
    createdAt: "2026-03-26",
  },
  {
    watermelonId: "wm-002",
    watermelonCode: "WM-2026-KJ02",
    varietyName: "พันธุ์ตอร์ปิโด (Torpedo)",
    weightKg: 5.3,
    harvestDate: "2026-03-28",
    daysAfterHarvest: 1,
    farmLocation: "ไร่กาญจนบุรี ท่าม่วง",
    shape: "ยาวรี",
    skinPattern: "เปลือกเขียวเข้ม ผิวมันวาว ลายเส้นยังไม่แผ่เต็มที่",
    groundSpotColor: "ขาวซีด",
    stemCondition: "เขียวสด",
    predictedAnalysis: {
      maturityClass: "อ่อนเกินไป",
      maturityGrade: 2,
      confidence: 0.89,
      qualityStatus: "passed",
      detectedImpacts: 4,
      dominantFrequencyHz: 178,
      snrDb: 24,
      sweetnessEstimateBrix: 9.4,
      recommendations: ["ความถี่ 178 Hz สะท้อนว่าเนื้อแข็งดิบ เมล็ดยังไม่แก่"],
    },
    groundTruth: {
      groundTruthId: "gt-002",
      watermelonId: "wm-002",
      assessedAt: "2026-03-29 15:00",
      ripenessGrade: 2,
      ripenessClass: "อ่อนเกินไป",
      sweetnessBrix: 9.2,
      fleshFirmnessKgCm2: 1.65,
      fleshColor: "ชมพูอ่อน",
      hollownessStatus: false,
      crispnessScore: 4,
      juiceScore: 3,
      defectStatus: "แกนแข็ง",
      assessorName: "คุณสมชาย ปราชญ์สวนแตง",
      notes: "เนื้อยังเป็นสีชมพูอ่อน รสจืด เมล็ดยังสีขาว ต้องบ่มต่ออย่างน้อย 4–5 วัน",
    },
    createdAt: "2026-03-28",
  },
  {
    watermelonId: "wm-003",
    watermelonCode: "WM-2026-NP03",
    varietyName: "พันธุ์ซอนญ่า (Sonya)",
    weightKg: 3.7,
    harvestDate: "2026-03-22",
    daysAfterHarvest: 7,
    farmLocation: "สวนนครปฐม กำแพงแสน",
    shape: "กลม",
    skinPattern: "เปลือกดำเข้ม ผิวด้าน มีรอยขีดข่วนเล็กน้อย",
    groundSpotColor: "เหลืองนวลอมครีม",
    stemCondition: "แห้งสนิท",
    predictedAnalysis: {
      maturityClass: "สุกเกิน/ไส้ล้ม",
      maturityGrade: 5,
      confidence: 0.88,
      qualityStatus: "passed",
      detectedImpacts: 3,
      dominantFrequencyHz: 98,
      snrDb: 22,
      sweetnessEstimateBrix: 12.9,
      recommendations: ["คลื่นเสียงต่ำ 98 Hz ชี้ว่าเนื้อเริ่มยวบและมีโพรงอากาศ"],
    },
    groundTruth: {
      groundTruthId: "gt-003",
      watermelonId: "wm-003",
      assessedAt: "2026-03-29 16:15",
      ripenessGrade: 5,
      ripenessClass: "สุกเกิน/ไส้ล้ม",
      sweetnessBrix: 13.1,
      fleshFirmnessKgCm2: 0.72,
      fleshColor: "แดงเข้ม",
      hollownessStatus: true,
      crispnessScore: 2,
      juiceScore: 5,
      defectStatus: "ไส้ล้ม",
      assessorName: "ดร.วิชาญ วิจัยแตงโม",
      notes: "หวานจัดมากแต่เนื้อร่วนทราย มีโพรงอากาศกลางลูก (ไส้ล้ม) เหมาะทำน้ำปั่น",
    },
    createdAt: "2026-03-22",
  },
];

let specimensList: WatermelonSpecimen[] = loadStorage("specimens", initialSpecimens);

export async function getWatermelonSpecimens(): Promise<WatermelonSpecimen[]> {
  return [...specimensList];
}

export async function createWatermelonSpecimen(data: Omit<WatermelonSpecimen, "watermelonId" | "createdAt">): Promise<WatermelonSpecimen> {
  const newSpecimen: WatermelonSpecimen = {
    ...data,
    watermelonId: "wm-" + Date.now(),
    createdAt: new Date().toISOString().split("T")[0],
  };
  specimensList = [newSpecimen, ...specimensList];
  saveStorage("specimens", specimensList);
  return newSpecimen;
}

export async function saveGroundTruth(watermelonId: string, groundTruth: Omit<GroundTruth, "groundTruthId" | "watermelonId" | "assessedAt">): Promise<GroundTruth> {
  const newGt: GroundTruth = {
    ...groundTruth,
    groundTruthId: "gt-" + Date.now(),
    watermelonId,
    assessedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
  };
  specimensList = specimensList.map((s) =>
    s.watermelonId === watermelonId ? { ...s, groundTruth: newGt } : s,
  );
  saveStorage("specimens", specimensList);
  return newGt;
}

// 16. Audio Knock Presets
export const AUDIO_SAMPLE_PRESETS: AudioSamplePreset[] = [
  {
    id: "sample-ripe",
    title: "🍉 แตงโมสุกหวานพอดี (Resonance ~134 Hz)",
    variety: "พันธุ์กินรี (Kinnaree 4.2 kg)",
    description: "เสียงเคาะก้องกังวาน โปร่งแน่น สม่ำเสมอ ไม่ทึบหรือแข็งกร้าว",
    expectedClass: "สุกพอดี (หวานฉ่ำ)",
    frequencyHz: 134,
    sweetnessBrix: 12.2,
    audioUrl: "https://actions.google.com/sounds/v1/foley/knocking_on_wood.ogg",
  },
  {
    id: "sample-unripe",
    title: "🌱 แตงโมยังอ่อน/ดิบ (High Pitch ~178 Hz)",
    variety: "พันธุ์ตอร์ปิโด (Torpedo 5.3 kg)",
    description: "เสียงเคาะแข็งแป๊ก ความถี่สูง สะท้อนถึงเนื้อที่ยังแน่นแข็งและสะสมน้ำตาลน้อย",
    expectedClass: "อ่อนเกินไป",
    frequencyHz: 178,
    sweetnessBrix: 9.4,
    audioUrl: "https://actions.google.com/sounds/v1/foley/wood_thump.ogg",
  },
  {
    id: "sample-overripe",
    title: "⚠️ แตงโมสุกเกิน/ไส้ล้ม (Dull Pitch ~98 Hz)",
    variety: "พันธุ์ซอนญ่า (Sonya 3.7 kg)",
    description: "เสียงเคาะทึบ อับตัน และมีเสียงสั่นสะเทือนไม่ต่อเนื่องจากโพรงอากาศภายใน",
    expectedClass: "สุกเกิน/ไส้ล้ม",
    frequencyHz: 98,
    sweetnessBrix: 12.9,
    audioUrl: "https://actions.google.com/sounds/v1/foley/door_knock_slow.ogg",
  },
];

