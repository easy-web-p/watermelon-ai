/** Small reviewed evidence set for local chat. Facts are paraphrases, not scraped pages. */
export type KnowledgeCard = {
  id: string;
  title: string;
  url: string;
  scope: string;
  facts: string;
  terms: readonly string[];
};

export const KNOWLEDGE_CARDS: readonly KnowledgeCard[] = [
  {
    id: 'watermelon-nutrition',
    title: 'UF/IFAS: Nutrient Management Recommendations for Watermelon',
    url: 'https://edis.ifas.ufl.edu/publication/SS735/pdf',
    scope: 'แตงโมในดินแร่ของรัฐฟลอริดา; หลักการใช้ได้ทั่วไป แต่อัตราใช้ปุ๋ยต้องปรับตามผลดินและพื้นที่',
    facts: 'วางแผนธาตุอาหารจากผลตรวจดิน ร่วมกับชนิด/อัตรา/เวลา/ตำแหน่งใส่ปุ๋ยและการให้น้ำ นับธาตุอาหารจากปุ๋ยอินทรีย์ที่เคยใส่ด้วย การใส่ปุ๋ยมากเกินอาจลดคุณภาพผลแตงโม',
    terms: ['ปุ๋ย', 'ธาตุอาหาร', 'สูตรปุ๋ย', 'ใส่ปุ๋ย', 'fertilizer'],
  },
  {
    id: 'soil-test-npk',
    title: 'University of Minnesota Extension: Interpreting Soil Tests for Fruit and Vegetable Crops',
    url: 'https://extension.umn.edu/agriculture/specialty-crops/interpreting-soil-tests-for-fruit-and-vegetable-crops',
    scope: 'หลักการอ่านผลดินและฉลากปุ๋ย; ไม่ใช่อัตราแนะนำเฉพาะแปลงในไทย',
    facts: 'ตัวเลข N-P-K บนฉลากคือร้อยละของไนโตรเจน ฟอสเฟต (P₂O₅) และโพแทช (K₂O) ตามลำดับ ก่อนคำนวณปุ๋ยควรดูผลตรวจดินและหักธาตุอาหารที่ได้รับจากแหล่งอื่น',
    terms: ['npk', 'ตัวเลขปุ๋ย', 'ฉลากปุ๋ย', 'ปุ๋ย', 'ผลตรวจดิน', 'ไนโตรเจน', 'โพแทสเซียม'],
  },
  {
    id: 'cucurbit-downy-mildew',
    title: 'กรมวิชาการเกษตร: เตือนภัยโรคราน้ำค้างในพืชตระกูลแตง',
    url: 'https://www.doa.go.th/rc/suratthani/wp-content/uploads/2026/01/393january2026.pdf',
    scope: 'พืชตระกูลแตงรวมแตงโม; เอกสารเตือนภัย ม.ค. 2569 ไม่ใช่การยืนยันโรคของแปลงผู้ใช้',
    facts: 'ราน้ำค้างมักเริ่มจากใบล่าง แผลฉ่ำน้ำขยายเป็นเหลี่ยมตามเส้นใบแล้วเหลือง ในตอนเช้าชื้นอาจเห็นขุยขาวเทาใต้ใบ การเว้นระยะให้ลมผ่านและตรวจแปลงสม่ำเสมอช่วยลดความเสี่ยง เอกสารมีชื่อสารเคมี แต่อย่านำอัตรามาใช้โดยไม่มีฉลากปัจจุบันและ PHI',
    terms: ['ราน้ำค้าง', 'แผลเหลี่ยม', 'ขุยใต้ใบ', 'downy mildew'],
  },
  {
    id: 'cucurbit-powdery-mildew',
    title: 'กรมวิชาการเกษตร: เตือนภัยโรคราแป้งในพืชตระกูลแตง',
    url: 'https://www.doa.go.th/rc/suratthani/wp-content/uploads/2026/01/393january2026.pdf',
    scope: 'พืชตระกูลแตงรวมแตงโม; เอกสารเตือนภัย ม.ค. 2569 ไม่ใช่การยืนยันโรคของแปลงผู้ใช้',
    facts: 'ราแป้งอาจเห็นหย่อมผงสีขาวบนใบ โดยมักเริ่มที่ใบล่าง ก่อนลุกลามขึ้นใบส่วนบนและใบซีดเหลือง ควรถ่ายภาพด้านบนและใต้ใบเพื่อแยกจากสาเหตุอื่น; การระบุสารเคมีต้องตรวจฉลากและ PHI ก่อน',
    terms: ['ราแป้ง', 'ผงขาว', 'ฝุ่นขาว', 'powdery mildew'],
  },
  {
    id: 'plant-problem-patterns',
    title: 'Penn State Extension: Diagnosing a Plant Problem 101',
    url: 'https://extension.psu.edu/diagnosing-a-plant-problem-101',
    scope: 'หลักการสังเกตอาการพืชทั่วไป ไม่ใช่ผลตรวจยืนยันเชื้อหรือการขาดธาตุ',
    facts: 'อาการพืชอาจมาจากเชื้อ/แมลง หรือปัจจัยที่ไม่ใช่สิ่งมีชีวิต เช่น น้ำ ดิน อากาศ และปุ๋ย บันทึกเวลาเริ่มอาการ การลาม ตำแหน่งต้นที่ป่วย รูปแบบการกระจายในแปลง และประวัติให้น้ำ/ปุ๋ย เพื่อช่วยแยกสาเหตุ',
    terms: ['ใบเหลือง', 'ใบไหม้', 'เหี่ยว', 'โรคพืช', 'วินิจฉัย', 'อาการ', 'ขาดธาตุ', 'แมลง'],
  },
  {
    id: 'watermelon-water',
    title: 'Penn State Extension: Watermelon Production',
    url: 'https://extension.psu.edu/watermelon-production',
    scope: 'หลักการจัดการน้ำแตงโมจากรัฐเพนซิลเวเนีย; ไม่ใช่ปริมาณน้ำรายวันของแปลงในไทย',
    facts: 'แตงโมต้องการความชื้นสม่ำเสมอระหว่างเติบโต แต่น้ำมากเกินโดยเฉพาะเมื่อผลใกล้แก่เพิ่มความเสี่ยงผลแตก ควรพิจารณาความชื้นดินและการระบายน้ำ ไม่กำหนดลิตรต่อต้นจากอายุเป็นสัปดาห์อย่างเดียว',
    terms: ['ให้น้ำ', 'น้ำหยด', 'น้ำมาก', 'ขาดน้ำ', 'ความชื้นดิน', 'ผลแตก', 'irrigation'],
  },
  {
    id: 'plant-soil-basics',
    title: 'Penn State Extension: Managing Soils',
    url: 'https://extension.psu.edu/managing-soils',
    scope: 'หลักการดินและรากพืชทั่วไป ไม่ใช่คำแนะนำเฉพาะแปลง',
    facts: 'ดินที่จัดการดีช่วยให้รากได้รับน้ำ ธาตุอาหาร และออกซิเจน รวมทั้งพยุงต้น อินทรียวัตถุและสิ่งมีชีวิตในดินช่วยโครงสร้างดิน แต่การจัดการต้องดูสภาพดินจริง',
    terms: ['ดิน', 'ราก', 'โลกของพืช', 'พืช', 'ออกซิเจน', 'อินทรียวัตถุ'],
  },
] as const;

const DOMAIN_TERMS = /ปุ๋ย|ธาตุอาหาร|ดิน|ราก|โรค|ใบเหลือง|ใบไหม้|ใบจุด|เหี่ยว|ราน้ำค้าง|ราแป้ง|แมลง|เพลี้ย|หนอน|ไรแดง|การปลูก|ให้น้ำ|พืช|fertili[sz]er|soil|disease|plant/iu;

export function isAgronomyQuestion(question: string): boolean {
  return DOMAIN_TERMS.test(question);
}

/** Conservative literal retrieval: no embeddings or invented similarity scores. */
export function retrieveKnowledge(question: string, limit = 3): KnowledgeCard[] {
  const normalized = question.toLocaleLowerCase('th-TH');
  return KNOWLEDGE_CARDS
    .map((card) => ({
      card,
      score: card.terms.reduce((sum, term) => sum + (normalized.includes(term.toLocaleLowerCase('th-TH')) ? (term.length >= 4 ? 2 : 1) : 0), 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id))
    .slice(0, Math.max(0, Math.min(limit, 5)))
    .map(({ card }) => card);
}

export function knowledgeInstructions(cards: readonly KnowledgeCard[]): string {
  if (!cards.length) return '';
  return [
    'ข้อมูลอ้างอิงต่อไปนี้ผ่านการตรวจทานเฉพาะข้อเท็จจริงที่สรุปไว้ ใช้เป็นฐานของคำตอบด้านการเกษตรเท่านั้น',
    'ห้ามอ้างว่าข้อมูลครอบคลุมทุกพืชหรือทุกพื้นที่ ห้ามยกอัตราปุ๋ยหรือสารเคมีจากแหล่งต่างประเทศมาใช้กับแปลงไทย',
    'ถ้าหลักฐานไม่พอให้บอกสิ่งที่ยังไม่รู้และถามข้อมูลแปลงที่จำเป็น อย่ากุข้อเท็จจริงเพิ่มจากความจำโมเดล',
    ...cards.map((card, index) => `[K${index + 1}] ${card.title}\nขอบเขต: ${card.scope}\nข้อเท็จจริง: ${card.facts}\nURL: ${card.url}`),
  ].join('\n\n');
}

export function knowledgeSources(cards: readonly KnowledgeCard[]): string {
  return cards.length
    ? `\n\nแหล่งอ้างอิง: ${cards.map((card) => `${card.title} (${card.url})`).join(' · ')}`
    : '';
}
