/** Stateless chat policy and reviewed evidence. User turns are sent with each request. */
import { capabilityOverviewReply, CHAT_INSTRUCTIONS, cultivarBoundaryReply, measurementBoundaryReply, measuredBrixReply, safeClientChatHistory, weeklyCareReply } from '../../server-chat-context';
import { isAgronomyQuestion, knowledgeInstructions, knowledgeSources, retrieveKnowledge } from '../../server-knowledge';
import { buildDetection, diagnosisToChatReply, type DiseaseDetection } from './diseaseModel';
import { predictLegacy4 } from './browserVisionEngine';
import { composeLocalAnswer, localEvidencePrompt, localSources, phiComplete, phiFooter, retrieveLocal, type LocalEvidence } from './localKnowledge';
import { askLocalLlm, localLlmStatus } from './localLlm';

const DISCLAIMER = 'ℹ️ AI เป็นเครื่องมือช่วยตัดสินใจ ไม่ใช่คำวินิจฉัยยืนยัน';
const CHEMICAL_HINTS = ['พ่นสาร', 'ฉีดพ่น', 'สารเคมี', 'ยาฆ่า', 'สารกำจัด', 'โพรพิเนบ', 'อะซ็อกซีสโตรบิน', 'เมทาแลกซิล', 'แมนโคเซบ', 'ไซมอกซานิล', 'ไดเมโทมอร์ฟ', 'ไดฟีโนโคนาโซล', 'เบโนมิล', 'ซัลเฟอร์', 'ไมโคลบิวทานิล', 'คอปเปอร์ไฮดรอกไซด์', 'สไปนีโทแรม', 'ฟิโพรนิล', 'อะบาเมกติน', 'ไทอะมีทอกแซม', 'ไดโนทีฟูแรน', 'โพรพาร์ไกต์', 'คลอร์ไพริฟอส', 'อิมิดาคลอพริด', 'อิมิดาโคลพริด', 'คาร์เบนดาซิม'];
export function ensurePhiDisclosure(reply: string, verifiedPhiDays?: number | null): string {
  if (!CHEMICAL_HINTS.some((term) => reply.includes(term))) return reply;
  // A diagnosis is assembled only from the reviewed catalogue; its PHI is
  // carried as a typed field. A language model's own PHI number is never trusted.
  if (verifiedPhiDays && verifiedPhiDays > 0 && reply.includes(String(verifiedPhiDays))) return reply;
  return `คำตอบนี้มีคำแนะนำสารเคมีที่ยังตรวจสอบค่า PHI จากฉลากไม่ได้ ระบบจึงไม่แสดงคำแนะนำนั้น กรุณาดูข้อมูลที่ตรวจทานแล้วในคลังโรคหรือปรึกษาเจ้าหน้าที่เกษตรก่อนใช้สารครับ\n\n${DISCLAIMER}`;
}
function safeReply(reply: string, verifiedPhiDays?: number | null): string {
  const checked = ensurePhiDisclosure(reply, verifiedPhiDays);
  return checked.includes('AI เป็นเครื่องมือช่วยตัดสินใจ') ? checked : `${checked}\n\n${DISCLAIMER}`;
}
/**
 * คำตอบที่ประกอบจากแคตตาล็อกเอง — ค่า PHI ถูกใส่มาพร้อมทุกชิ้นที่เอ่ยถึงสารเคมี
 *
 * ด่าน `ensurePhiDisclosure` มีไว้จับสิ่งที่ **โมเดลภาษาเขียนเอง** ซึ่งเชื่อตัวเลข
 * ไม่ได้ ถ้านำมาใช้กับข้อความที่เราประกอบจากฟิลด์ `phi` ชุดเดียวกับการ์ดวินิจฉัย
 * มันจะลบคำตอบที่ถูกต้องทิ้งทั้งก้อน ที่นี่จึงตรวจความครบของ PHI ตามโครงสร้างแทน
 * และถ้าตรวจไม่ผ่าน จะตกกลับไปใช้ด่านเดิมทันที
 */
function safeCatalogueReply(reply: string, evidence: readonly LocalEvidence[]): string {
  if (!phiComplete(evidence, reply)) return safeReply(reply);
  return reply.includes('AI เป็นเครื่องมือช่วยตัดสินใจ') ? reply : `${reply}\n\n${DISCLAIMER}`;
}

/**
 * คำตอบจากโมเดลภาษา — ตรวจว่าตัวเลขวันที่มันเขียนมาตรงกับแคตตาล็อกจริง
 *
 * ปล่อยผ่านไม่ได้ เพราะโมเดลแต่งตัวเลขเองได้ และ "PHI 3 วัน" ที่ควรเป็น 7 วัน
 * หมายถึงสารตกค้างเกินมาตรฐานในผลที่ขายจริง แต่การลบทุกคำตอบที่เอ่ยชื่อสาร
 * ก็ทำให้เส้นทางนี้ตอบคำถามเรื่องโรคไม่ได้เลยสักข้อ
 *
 * จึงตรวจตรงจุดที่อันตราย: ถ้าคำตอบเอ่ยถึงสารเคมี ทุกจำนวน "N วัน" ที่มันเขียน
 * ต้องเป็นค่าที่มีอยู่จริงในหลักฐานที่เราส่งไปให้ ถ้ามีตัวเลขที่ไม่ตรงแม้ตัวเดียว
 * แปลว่าโมเดลแต่งขึ้น จึงตกไปใช้ด่านเดิมที่ลบคำแนะนำนั้นทิ้ง
 */
export function verifyLlmDays(reply: string, evidence: readonly LocalEvidence[]): boolean {
  if (!CHEMICAL_HINTS.some((term) => reply.includes(term))) return true;
  const allowed = new Set(evidence.map((item) => item.phi).filter((days): days is number => typeof days === 'number'));
  const claimed = [...reply.matchAll(/(\d+)\s*วัน/gu)].map((match) => Number(match[1]));
  if (!claimed.length) return false;
  return claimed.every((days) => allowed.has(days));
}
function safeLlmReply(reply: string, evidence: readonly LocalEvidence[]): string {
  if (!verifyLlmDays(reply, evidence)) return safeReply(reply);
  return reply.includes('AI เป็นเครื่องมือช่วยตัดสินใจ') ? reply : `${reply}\n\n${DISCLAIMER}`;
}
export function configuredGeminiKey(): string | null {
  // A personal key can be set locally. A VITE_ key is bundled into public JS;
  // deployments should leave it unset and use the reviewed knowledge fallback.
  try { const local = window.localStorage.getItem('watermelon.gemini.apiKey')?.trim(); if (local) return local; } catch { /* Storage may be disabled. */ }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') return null;
  return import.meta.env.VITE_GEMINI_API_KEY?.trim() || null;
}
export function setGeminiApiKey(key: string): void {
  window.localStorage.setItem('watermelon.gemini.apiKey', key.trim());
}
export function clearGeminiApiKey(): void {
  try { window.localStorage.removeItem('watermelon.gemini.apiKey'); } catch { /* Storage may be disabled. */ }
}
async function geminiReply(key: string, content: string, history: ReturnType<typeof safeClientChatHistory>, evidence: ReturnType<typeof retrieveKnowledge>): Promise<string> {
  const contents = [...history.map((turn) => ({ role: turn.role === 'assistant' ? 'model' : 'user', parts: [{ text: turn.content }] })), { role: 'user', parts: [{ text: content.slice(0, 4000) }] }];
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: `${CHAT_INSTRUCTIONS}\n\n${knowledgeInstructions(evidence)}` }] }, contents, generationConfig: { maxOutputTokens: 1000, temperature: .4 } }),
  });
  const payload = await response.json() as { error?: { message?: string }; candidates?: { content?: { parts?: { text?: string }[] } }[] };
  if (!response.ok) throw new Error(`Gemini API: ${payload.error?.message || `HTTP ${response.status}`}`);
  const reply = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!reply) throw new Error('Gemini ไม่ส่งคำตอบกลับมา');
  return reply;
}
export async function reply(body: { content: string; imageBase64?: string; history?: { role: 'user' | 'assistant'; content: string }[] }): Promise<{ content: string; diseaseDetection?: DiseaseDetection; modelVersion: string }> {
  if (body.imageBase64) {
    const prediction = await predictLegacy4(body.imageBase64);
    const diseaseDetection = buildDetection(prediction);
    return { content: safeReply(diagnosisToChatReply(diseaseDetection), diseaseDetection.phi_days), diseaseDetection, modelVersion: prediction.model_version };
  }
  const content = body.content.trim();
  if (!content) throw new Error('กรุณาพิมพ์คำถาม');
  const history = safeClientChatHistory(body.history);
  const safety = capabilityOverviewReply(content) ?? measurementBoundaryReply(content) ?? measuredBrixReply(content) ?? cultivarBoundaryReply(content, history) ?? weeklyCareReply(content);
  if (safety) return { content: safeReply(safety), modelVersion: 'measurement-safety-rule' };
  const evidence = retrieveKnowledge(content);
  // คลังในแอป (โรค 47 รายการ ผลิตภัณฑ์ พันธุ์ ระยะปลูก ลำดับผสมสาร) กว้างกว่า
  // `KNOWLEDGE_CARDS` มาก จึงค้นที่นี่ด้วยเสมอ ไม่ว่าจะมีผู้ให้บริการภายนอกหรือไม่
  const local = retrieveLocal(content);
  const composed = composeLocalAnswer(content, local);

  // 1) โมเดลในเครื่อง — ไม่มีคีย์ ไม่มีค่าใช้จ่าย ข้อความไม่ออกจากเครื่อง
  const localModel = await localLlmStatus();
  if (localModel.available && localModel.model) {
    try {
      const answer = await askLocalLlm({
        model: localModel.model,
        system: `${CHAT_INSTRUCTIONS}\n\n${localEvidencePrompt(local)}`,
        history: history.map((turn) => ({ role: turn.role, content: turn.content ?? '' })),
        question: content,
      });
      // ต่อท้ายค่า PHI จากแคตตาล็อกเสมอ โมเดลเขียนคำอธิบายได้ดีแต่คำตอบยาวอาจถูกตัด
      // ก่อนถึงบรรทัดระยะปลอดภัยพอดี ซึ่งเป็นบรรทัดที่ขาดไม่ได้ที่สุด
      const withPhi = `${answer}${phiFooter(local)}${localSources(local)}`;
      return { content: safeLlmReply(withPhi, local), modelVersion: `local:${localModel.model}` };
    } catch {
      // โมเดลในเครื่องล้มระหว่างตอบ ไม่ใช่เหตุให้เงียบ — ตกไปใช้คำตอบจากคลังต่อ
    }
  }

  // 2) คีย์ส่วนตัวของผู้ใช้ ถ้าตั้งไว้
  const key = configuredGeminiKey();
  if (key) {
    const answer = await geminiReply(key, content, history, evidence);
    return { content: safeReply(`${answer}${knowledgeSources(evidence)}`), modelVersion: 'gemini-3.8-flash' };
  }

  // 3) คลังที่ตรวจทานแล้ว — เส้นทางที่ใช้ได้เสมอ ไม่ต้องมีคีย์และไม่ต้องมีเซิร์ฟเวอร์
  if (composed) return { content: safeCatalogueReply(`${composed}${localSources(local)}`, local), modelVersion: 'reviewed-knowledge' };
  if (evidence.length) {
    const facts = evidence.map((card) => `${card.title}: ${card.facts}\nขอบเขต: ${card.scope}`).join('\n\n');
    return { content: safeReply(`${facts}${knowledgeSources(evidence)}`), modelVersion: 'reviewed-knowledge' };
  }
  // ไม่มีหลักฐานเลย: บอกตรง ๆ ว่าไม่มี แล้วบอกวิธีทำให้ตอบได้กว้างขึ้น
  // ห้ามเดาคำแนะนำเฉพาะแปลง ไม่ว่าคำถามจะเข้าข่ายเกษตรหรือไม่
  const hint = localModel.available
    ? ''
    : `\n\n(ถ้าต้องการให้ตอบเป็นภาษาธรรมชาติได้กว้างขึ้นโดยไม่ต้องใช้คีย์ใด ๆ ให้เปิดโมเดลในเครื่องด้วย \`npm run ai:start\` แล้วเปิดแอปจาก localhost — สถานะตอนนี้: ${localModel.reason})`;
  return {
    content: safeReply(
      (isAgronomyQuestion(content)
        ? 'ยังไม่มีข้อมูลอ้างอิงที่ตรวจทานสำหรับคำถามนี้ จึงไม่ควรเดาคำแนะนำเฉพาะแปลงครับ บอกชนิดพืช อาการหรือระยะที่เห็นจริง ประวัติน้ำ/ปุ๋ย และส่งภาพที่ชัดได้ แล้วผมจะช่วยแยกสิ่งที่ควรตรวจต่อ'
        : 'คำถามนี้อยู่นอกคลังข้อมูลที่ตรวจทานแล้วของระบบครับ ระบบนี้ตอบเรื่องแตงโม โรคและศัตรูพืช ปุ๋ยและสารในแคตตาล็อก พันธุ์ ระยะปลูก และการวัดผลเท่านั้น') + hint,
    ),
    modelVersion: 'knowledge-boundary-rule',
  };
}
