import type { ModelMessage } from 'ai';

export type StoredTurn = {
  role: string;
  content?: string;
  status?: string;
};

/** Guest history is kept on the device and must be validated on every request. */
export function safeClientChatHistory(value: unknown): StoredTurn[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-12).flatMap((entry: unknown): StoredTurn[] => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    if ((row.role !== 'user' && row.role !== 'assistant') || typeof row.content !== 'string') return [];
    const content = row.content.trim().slice(0, 1500);
    return content ? [{ role: row.role, content }] : [];
  });
}

export const CHAT_INSTRUCTIONS = [
  'คุณคือน้องแตงโม ผู้ช่วยสนทนาเรื่องการปลูกแตงโม ตอบภาษาไทยอย่างเป็นธรรมชาติ สุภาพ และจำบริบทจากบทสนทนาที่ส่งมา',
  'ตอบตรงคำถามก่อน ถามข้อมูลเพิ่มเฉพาะเมื่อจำเป็น ไม่อ้างว่าตรวจแปลงหรือเห็นภาพ/เสียงที่ไม่ได้ส่งมา',
  'ภาพใบใช้คัดกรองโรคใบเท่านั้น ไม่ใช่โมเดลยืนยันสายพันธุ์หรือวัดความหวานของผล',
  'เสียงเคาะวัดความถี่และคุณภาพสัญญาณได้ แต่ยังไม่มีข้อมูลปรับเทียบเพื่อทำนาย °Brix หรือความสุก',
  'ห้ามบอกว่าเสียงเคาะนี้ประเมินความสุกได้ดีหรือยืนยันว่าเก็บเกี่ยวได้ เพราะยังไม่มีโมเดลปรับเทียบความสุก',
  'ค่า °Brix ที่ผู้ใช้กรอกคือค่าที่ผู้ใช้วัดเอง ไม่ใช่ผลทำนายของ AI; เทียบกับเป้าหมายที่ผู้ใช้ระบุได้เท่านั้น',
  'ห้ามสมมติว่าผู้ใช้กรอกค่า °Brix แล้ว และห้ามยกช่วงค่า °Brix มาตรฐานโดยไม่มีแหล่งที่ตรวจสอบได้',
  'อย่ากุลักษณะเฉพาะของสายพันธุ์ อายุเก็บเกี่ยว ผลผลิต ความทนโรค หรือสูตรน้ำและปุ๋ยจากชื่อพันธุ์อย่างเดียว',
  'เลขสัปดาห์อย่างเดียวไม่ยืนยันระยะพืชจริง อย่าระบุว่ากำลังแตกยอด ออกดอก หรือติดผลโดยไม่มีข้อมูลจากแปลง',
  'ก่อนกำหนดอัตราปุ๋ยเฉพาะแปลง ต้องรู้ผลตรวจดินหรือประวัติปุ๋ย พื้นที่ปลูก สูตรปุ๋ย และระยะพืชจริง',
  'อย่ากุราคาปัจจุบัน ผลวิจัย ความแม่นยำ ชื่อผู้เชี่ยวชาญ หรือข้อมูลภาคสนาม หากไม่มีข้อมูลให้บอกตรง ๆ',
  'อย่าแนะนำชื่อสารเคมี อัตราใช้ หรือช่วงเก็บเกี่ยวจากความจำ เพราะไม่มีฉลากและค่า PHI ที่ตรวจยืนยันในบริบทนี้',
  'ผล AI เป็นเครื่องมือช่วยตัดสินใจ ไม่ใช่คำวินิจฉัยยืนยัน',
].join('\n');

/** A week number alone must not become a fabricated growth stage or fertilizer dose. */
export function weeklyCareReply(input: string): string | null {
  const week = input.match(/(?:สัปดาห์(?:ที่)?|week)\s*(\d{1,2})/iu);
  const asksForWeeklyPlan = /(?:แผน|ดูแล|ปุ๋ย|ให้น้ำ|ควร|ต้องทำ|ช่วยรายสัปดาห์)/u.test(input);
  if (!week || !asksForWeeklyPlan || /(?:มีดอก|ดอกบาน|ติดผล|เริ่มเลื้อย|กล้า|เก็บเกี่ยว)/u.test(input)) return null;
  const number = Number(week[1]);
  if (number < 1 || number > 12) return null;
  return [
    `สำหรับสัปดาห์ที่ ${number} ให้ตรวจระยะของต้นในแปลงก่อน เพราะอายุเป็นสัปดาห์อย่างเดียวบอกไม่ได้ว่าต้นกำลังเลื้อยเถา ออกดอก หรือติดผลแล้ว`,
    'งานตรวจรอบนี้: ดูความชื้นดินและการระบายน้ำ ตรวจใบทั้งสองด้านหาโรคหรือแมลง บันทึกวันที่ให้น้ำ/ปุ๋ย และดูว่ามีดอกตัวเมียหรือผลอ่อนหรือยัง หากดอกกำลังบาน ให้สังเกตการผสมเกสรและหลีกเลี่ยงการรบกวนแมลงผสมเกสร',
    'ยังระบุสูตรหรืออัตราปุ๋ยเฉพาะแปลงไม่ได้จากเลขสัปดาห์ กรุณาบอกวันย้ายปลูก ระยะที่เห็นจริง พื้นที่ ชนิดดินหรือผลตรวจดิน สูตรและปริมาณปุ๋ยที่เคยให้ และระบบน้ำ แล้วผมจะช่วยจัดรายการตรวจของสัปดาห์นี้ให้ตรงแปลงครับ',
    'ℹ️ AI เป็นเครื่องมือช่วยตัดสินใจ ไม่ใช่คำวินิจฉัยยืนยัน',
  ].join('\n\n');
}

/** A capability question must not let the model advertise an unvalidated sensor. */
export function capabilityOverviewReply(input: string): string | null {
  if (!/(?:ช่วย|ทำ|ความสามารถ).*(?:อะไรได้บ้าง|เรื่องอะไร|อะไรบ้าง)/u.test(input)) return null;
  return [
    'ผมคุยและตอบคำถามทั่วไปเรื่องการปลูกแตงโมเป็นภาษาไทยได้ครับ ส่งภาพใบเพื่อคัดกรองโรคด้วยโมเดลภาพ หรืออัดเสียงเคาะเพื่อวัดความถี่และคุณภาพสัญญาณได้',
    'ถ้าคุณวัด °Brix ด้วยรีแฟรกโตมิเตอร์และมีเกณฑ์เป้าหมาย ผมช่วยเทียบค่าที่คุณกรอกได้ ส่วนสายพันธุ์ช่วยจำชื่อที่คุณบอกและเทียบลักษณะในแคตตาล็อกได้ แต่ยังยืนยันสายพันธุ์จากภาพหรือเสียงไม่ได้',
    'ตอนนี้ยังทำนาย °Brix ความสุก หรือวันเก็บเกี่ยวจากเสียงเคาะและภาพใบไม่ได้ครับ ผล AI เป็นเครื่องมือช่วยตัดสินใจ ไม่ใช่คำวินิจฉัยยืนยัน',
  ].join('\n\n');
}

/** A model must never turn one knock frequency into an invented harvest verdict. */
export function measurementBoundaryReply(input: string): string | null {
  const asksAboutSound = /(?:เสียง|เคาะ|ความถี่|เฮิรตซ์|\bhz\b)/i.test(input);
  const asksAboutImage = /(?:ภาพ|รูป|ถ่าย)/u.test(input);
  const asksForFruitVerdict = /(?:หวาน|ความสุก|สุก|แก่|เก็บเกี่ยว|\bbrix\b|บริกซ์|สายพันธุ์)/i.test(input);
  if (!(asksAboutSound || asksAboutImage) || !asksForFruitVerdict) return null;
  return [
    'เสียงเคาะช่วยวัดคุณสมบัติคลื่นเสียง เช่น ความถี่และคุณภาพสัญญาณได้ ส่วนภาพใบใช้คัดกรองโรคใบ แต่ระบบยังไม่มีข้อมูลที่ปรับเทียบพอจะทำนาย °Brix ความสุก หรือยืนยันสายพันธุ์จากเสียงหรือภาพใบ',
    'จึงยังสรุปความหวาน ความพร้อมเก็บเกี่ยว หรือสายพันธุ์จากสิ่งเหล่านี้ไม่ได้ หากมีค่า °Brix ที่วัดด้วยรีแฟรกโตมิเตอร์และเป้าหมายของคุณ ผมจะช่วยเทียบให้โดยไม่เดาครับ',
    'ℹ️ AI เป็นเครื่องมือช่วยตัดสินใจ ไม่ใช่คำวินิจฉัยยืนยัน',
  ].join('\n\n');
}

/** Compare only a refractometer reading and a target supplied in the request. */
export function measuredBrixReply(input: string): string | null {
  const measuredMatch = input.match(/(?:วัด(?:ได้|จริง)?|ได้ค่า|ค่า(?:ที่วัด)?\s*°?\s*brix)\s*(\d{1,2}(?:\.\d{1,2})?)\s*(?:°?\s*brix|บริกซ์)?/i);
  if (!measuredMatch) return null;
  const measured = Number(measuredMatch[1]);
  if (!Number.isFinite(measured) || measured < 0 || measured > 30) return null;
  const targetMatch = input.match(/(?:เป้าหมาย|เกณฑ์)\s*(\d{1,2}(?:\.\d{1,2})?)\s*(?:°?\s*brix|บริกซ์)?/i);
  const target = targetMatch ? Number(targetMatch[1]) : null;
  const comparison = target !== null && target >= 0 && target <= 30
    ? ` เทียบกับเป้าหมาย ${target.toFixed(1)} °Brix ที่คุณระบุแล้ว${measured >= target ? 'สูงกว่า' : 'ต่ำกว่า'} ${Math.abs(measured - target).toFixed(1)} °Brix`
    : ' หากมีเป้าหมาย °Brix ของคุณ บอกมาได้เพื่อช่วยเทียบ';
  return `ตามค่าที่คุณระบุว่าวัดด้วยรีแฟรกโตมิเตอร์: ${measured.toFixed(1)} °Brix.${comparison} ค่านี้ไม่ใช่ผลทำนายจาก AI และค่าเดียวไม่ยืนยันสายพันธุ์หรือความพร้อมเก็บเกี่ยวครับ\n\nℹ️ AI เป็นเครื่องมือช่วยตัดสินใจ ไม่ใช่คำวินิจฉัยยืนยัน`;
}

function namedCultivar(text: string): string | null {
  const match = text.match(/(?:สาย)?พันธุ์\s*([\p{L}\p{M}\p{N}-]{2,30})/u);
  const name = match?.[1]?.replace(/(?:อยู่|ครับ|ค่ะ|คะ|นะ|แล้ว)$/u, '');
  return name && !/^(?:อะไร|ไหน|ใด|นี้|นั้น)$/.test(name) ? name : null;
}

/** Do not invent cultivar properties or a care prescription from its name alone. */
export function cultivarBoundaryReply(input: string, history: readonly StoredTurn[]): string | null {
  if (/(?:ปลูก.*พันธุ์อะไร|พันธุ์อะไรนะ|ปลูกสายพันธุ์อะไร)/u.test(input)) {
    const mentioned = [...history].reverse()
      .filter((turn) => turn.role === 'user' && typeof turn.content === 'string')
      .map((turn) => namedCultivar(turn.content!))
      .find((name) => name !== null);
    return mentioned
      ? `ก่อนหน้านี้คุณบอกว่าปลูกแตงโมพันธุ์${mentioned}ครับ ผมจำจากข้อความที่คุณพิมพ์ ไม่ได้ยืนยันสายพันธุ์จากภาพหรือเสียงนะครับ`
      : 'ในบทสนทนาที่ส่งมา ยังไม่พบชื่อสายพันธุ์ที่คุณระบุครับ บอกชื่อบนซองเมล็ดหรือบันทึกแปลงมาได้';
  }
  const cultivar = namedCultivar(input);
  if (cultivar && /(?:แนะนำ|ดูแล|ปลูก|ปุ๋ย|น้ำ|เก็บเกี่ยว|โรค)/u.test(input)) {
    return `รับทราบว่าคุณระบุว่าเป็นพันธุ์${cultivar}ครับ ชื่อพันธุ์อย่างเดียวยังไม่พอให้ผมกำหนดการให้น้ำ ปุ๋ย หรือวันเก็บเกี่ยวอย่างปลอดภัย ตอนนี้ต้นอยู่ระยะไหน และมีข้อมูลดิน/สภาพแปลงหรืออาการที่กังวลอะไรบ้างครับ?\n\nℹ️ AI เป็นเครื่องมือช่วยตัดสินใจ ไม่ใช่คำวินิจฉัยยืนยัน`;
  }
  return null;
}

/** Keep a bounded text-only conversation, excluding attachments and failed turns. */
export function buildChatMessages(history: readonly StoredTurn[], current: string): ModelMessage[] {
  const previous = history
    .filter((turn) => (turn.role === 'user' || turn.role === 'assistant') && turn.status !== 'failed')
    .filter((turn) => typeof turn.content === 'string' && turn.content.trim().length > 0)
    .slice(-12)
    .map((turn): ModelMessage => ({
      role: turn.role as 'user' | 'assistant',
      content: turn.content!.trim().slice(0, 1500),
    }));
  return [...previous, { role: 'user', content: current.trim().slice(0, 4000) }];
}
