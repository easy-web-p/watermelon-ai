/** Stateless chat policy and reviewed evidence. User turns are sent with each request. */
import { capabilityOverviewReply, CHAT_INSTRUCTIONS, cultivarBoundaryReply, measurementBoundaryReply, measuredBrixReply, safeClientChatHistory, weeklyCareReply } from '../../server-chat-context';
import { isAgronomyQuestion, knowledgeInstructions, knowledgeSources, retrieveKnowledge } from '../../server-knowledge';
import { buildDetection, diagnosisToChatReply, type DiseaseDetection } from './diseaseModel';
import { predictLegacy4 } from './browserVisionEngine';

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
export function configuredGeminiKey(): string | null {
  // A personal key can be set locally. A VITE_ key is bundled into public JS;
  // deployments should leave it unset and use the reviewed knowledge fallback.
  try { const local = window.localStorage.getItem('watermelon.gemini.apiKey')?.trim(); if (local) return local; } catch { /* Storage may be disabled. */ }
  return import.meta.env.VITE_GEMINI_API_KEY?.trim() || null;
}
export function setGeminiApiKey(key: string): void {
  window.localStorage.setItem('watermelon.gemini.apiKey', key.trim());
}
async function geminiReply(key: string, content: string, history: ReturnType<typeof safeClientChatHistory>, evidence: ReturnType<typeof retrieveKnowledge>): Promise<string> {
  const contents = [...history.map((turn) => ({ role: turn.role === 'assistant' ? 'model' : 'user', parts: [{ text: turn.content }] })), { role: 'user', parts: [{ text: content.slice(0, 4000) }] }];
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
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
  if (isAgronomyQuestion(content) && evidence.length === 0) return { content: safeReply('ยังไม่มีข้อมูลอ้างอิงที่ตรวจทานสำหรับคำถามนี้ จึงไม่ควรเดาคำแนะนำเฉพาะแปลงครับ บอกชนิดพืช อาการหรือระยะที่เห็นจริง ประวัติน้ำ/ปุ๋ย และส่งภาพที่ชัดได้ แล้วผมจะช่วยแยกสิ่งที่ควรตรวจต่อ'), modelVersion: 'knowledge-boundary-rule' };
  const key = configuredGeminiKey();
  if (!key) {
    if (!evidence.length) return { content: safeReply('ยังไม่ได้ตั้งค่า Gemini API Key ในเบราว์เซอร์ และคลังความรู้ที่ตรวจทานยังไม่มีข้อมูลสำหรับคำถามนี้ คุณสามารถตั้งคีย์ส่วนตัวจาก Google AI Studio เพื่อใช้แชทแบบไร้เซิร์ฟเวอร์ได้'), modelVersion: 'no-key-boundary-rule' };
    const facts = evidence.map((card) => `${card.title}: ${card.facts}\nขอบเขต: ${card.scope}`).join('\n\n');
    return { content: safeReply(`${facts}${knowledgeSources(evidence)}`), modelVersion: 'reviewed-knowledge' };
  }
  const answer = await geminiReply(key, content, history, evidence);
  return { content: safeReply(`${answer}${knowledgeSources(evidence)}`), modelVersion: 'gemini-2.5-flash' };
}
