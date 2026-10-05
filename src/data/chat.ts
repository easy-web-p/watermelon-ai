/** Seed conversation and prompt library for the AI consultation screen. */

export type DiagnosisBlock = {
  kind: 'diagnosis';
  title: string;
  confidence: number;
  intro: string;
  sections: readonly { icon: string; title: string; body?: string; bullets?: readonly string[] }[];
  differentials: readonly { name: string; match: number; loss: string; trait: string }[];
};

export type ChatMessage =
  | { id: string; role: 'user'; text: string; time: string }
  | {
      id: string;
      role: 'assistant';
      time: string;
      text?: string;
      block?: DiagnosisBlock;
      followUps?: readonly { icon: string; label: string }[];
    };

export const QUICK_PROMPTS = [
  { emoji: '🍂', label: 'ใบไหม้จุดดำเกิดจากอะไร?' },
  { emoji: '🐛', label: 'วิธีแก้เพลี้ยไฟและไรแดงระบาด' },
  { emoji: '🦠', label: 'ยอดหงิกเหลือง ไวรัสหรือขาดสารอาหาร?' },
  { emoji: '💧', label: 'ราแป้งและราน้ำค้างแก้อย่างไร?' },
  { emoji: '🧪', label: 'ตารางสลับกลุ่มยาฆ่าเชื้อรา' },
  { emoji: '📈', label: 'ราคาแตงโมสัปดาห์นี้เป็นอย่างไร?' },
] as const;

export const QUICK_TOOLS = [
  { icon: 'photo_camera', label: 'วินิจฉัยโรคจากใบ/ต้น', tone: 'tonal' as const },
  { icon: 'coronavirus', label: 'สแกนโรคพืช & ไวรัส', tone: 'neutral' as const },
  { icon: 'medication', label: 'ตารางสารเคมี & ชีวภัณฑ์', tone: 'neutral' as const },
] as const;

export const SEED_CONVERSATION: readonly ChatMessage[] = [
  {
    id: 'm1',
    role: 'user',
    time: '10:42 น.',
    text: 'ช่วยตรวจดูหน่อยครับ แตงโมใบเริ่มมีจุดสีน้ำตาลไหม้ ขอบใบม้วนแห้ง และก้านมีเมือกเยิ้ม เป็นโรคอะไร มีวิธีรักษาและยาที่ควรใช้ไหมครับ?',
  },
  {
    id: 'm2',
    role: 'assistant',
    time: '10:42 น.',
    block: {
      kind: 'diagnosis',
      title: 'ผลวิเคราะห์อาการโรค: สันนิษฐาน "โรคแอนแทรคโนส" ร่วมกับราน้ำค้าง',
      confidence: 94.8,
      intro:
        'สวัสดีครับคุณสมศักดิ์ จากลักษณะอาการจุดสีน้ำตาลไหม้ ขอบใบม้วนแห้ง และก้านมีรอยแผลพร้อมน้ำยางเยิ้ม AI ประเมินเบื้องต้นว่าเป็นโรคแอนแทรคโนส (เชื้อรา Colletotrichum gloeosporioides) โดยมีภาวะเสี่ยงต่อโรคยางไหลร่วมด้วย',
      sections: [
        {
          icon: 'search',
          title: '1. อาการบ่งชี้หลัก',
          bullets: [
            'แผลจุดฉ่ำน้ำสีน้ำตาลเข้ม ขอบแผลมีวงซ้อน กระจายทั่วผิวใบ',
            'ขอบใบแห้งกรอบม้วนขึ้น ใบล่างเริ่มแห้งร่วงก่อนกำหนด',
            'แผลก้านแตกลาย มีเมือกหรือหยดน้ำยางสีน้ำตาลอมแดงซึม',
          ],
        },
        {
          icon: 'warning',
          title: '2. ระดับความรุนแรง (Level 3)',
          body: 'เฝ้าระวังแพร่ระบาดช่วงฝนตกชุกหรือความชื้นสัมพัทธ์เกิน 85% ความเสี่ยงระบาดสูง 82% ระยะฟักตัวสปอร์ 3–5 วัน',
        },
        {
          icon: 'medication',
          title: '3. แผนการรักษาเร่งด่วน',
          body: 'พ่นสารกลุ่มโพรพิเนบ (Antracol) หรืออะซ็อกซีสโตรบิน (Amistar) อัตรา 20–30 กรัม/น้ำ 20 ลิตร สลับกลุ่มกลไกฤทธิ์ยาเพื่อป้องกันการดื้อยา ฉีดพ่นซ้ำทุก 5–7 วัน',
        },
        {
          icon: 'shield',
          title: '4. มาตรการตัดวงจรโรค',
          body: 'ตัดแต่งใบและเถาที่เป็นโรคใส่ถุงมิดชิดนำไปเผาทำลาย งดการให้น้ำด้วยสปริงเกอร์แบบโดนใบช่วงเย็น และปรับใช้ระบบน้ำหยดใต้โคนแทน',
        },
      ],
      differentials: [
        { name: 'แอนแทรคโนส (Anthracnose)', match: 94, loss: 'เสียหาย 60–80%', trait: 'แผลจุดกลมสีน้ำตาลบุ๋ม มีวงซ้อน' },
        { name: 'ราน้ำค้าง (Downy Mildew)', match: 65, loss: 'เสียหาย 40–50%', trait: 'แผลเหลี่ยมสีเหลือง ใต้ใบมีขุยรา' },
        { name: 'ยางไหล (Gummy Stem)', match: 58, loss: 'เสียหาย 30–50%', trait: 'แผลก้านแตกลาย มีเมือกยางไหล' },
      ],
    },
    followUps: [
      { icon: 'science', label: 'แนะนำสูตรยาชีวภัณฑ์ไตรโคเดอร์มาผสมน้ำฉีดพ่น' },
      { icon: 'cloud', label: 'วิธีป้องกันโรคระบาดช่วงหน้าฝนและความชื้นสูง' },
      { icon: 'history_toggle_off', label: 'ระยะปลอดภัยก่อนเก็บเกี่ยว (PHI) ของสารเคมีแต่ละตัว' },
    ],
  },
];

/** Canned replies so the demo chat answers plausibly without a backend. */
export const FALLBACK_REPLIES: readonly string[] = [
  'รับทราบครับ ผมกำลังประมวลผลจากฐานข้อมูลโรคแตงโม 8 กลุ่มหลักและสภาพอากาศแปลงของคุณ หากมีภาพใบหรือลำต้นประกอบ จะช่วยให้ความแม่นยำสูงขึ้นประมาณ 12% ครับ',
  'จากข้อมูลที่ให้มา ผมแนะนำให้ตรวจสอบความชื้นในแปลงและช่วงเวลาการให้น้ำก่อนเป็นอันดับแรก เพราะเป็นปัจจัยกระตุ้นที่พบบ่อยที่สุดในแปลงแตงโมภาคกลางครับ',
  'ขอแนะนำให้ถ่ายภาพใบที่แสดงอาการในระยะใกล้ (ห่างประมาณ 20–30 ซม.) พร้อมแสงธรรมชาติช่วงเช้า เพื่อให้ระบบ Vision วิเคราะห์ลักษณะแผลได้ชัดเจนครับ',
];
