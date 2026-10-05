/** Five-stage grow guide shown on the cultivation screen. */

export type GrowthStage = {
  stage: number;
  range: string;
  title: string;
  summary: string;
  tasks: readonly string[];
  note: { label: string; value: string };
  /** Marks the stage that needs the most attention. */
  critical?: boolean;
};

export const GROWTH_STAGES: readonly GrowthStage[] = [
  {
    stage: 1,
    range: '0 – 10 วัน',
    title: 'เพาะกล้า & เตรียมแปลง',
    summary: 'ยกร่องสูง 30 ซม. คลุมพลาสติกดำ–เงิน เจาะหลุมปลูก',
    tasks: [
      'แช่เมล็ดน้ำอุ่น 45°C นาน 30 นาที ก่อนเพาะ',
      'ใส่ปุ๋ยคอกหรือปุ๋ยหมักรองก้นหลุม 100 กก./ไร่',
      'กล้าพร้อมย้ายเมื่อมีใบจริง 2–3 ใบ',
    ],
    note: { label: 'อุณหภูมิที่เหมาะสม', value: '28 – 32°C (ความชื้น 70%)' },
  },
  {
    stage: 2,
    range: '11 – 25 วัน',
    title: 'ย้ายกล้า & เลื้อยเถา',
    summary: 'จัดเถาเลื้อยทางเดียว ปลิดแขนงข้างเหลือเถาหลัก 2 เถา',
    tasks: [
      'ให้น้ำสม่ำเสมอ 2–3 วัน/ครั้ง ตามสภาพอากาศ',
      'ปลิดแขนงข้างทิ้งให้เหลือเถาหลัก 2 เถาต่อต้น',
      'ใส่ปุ๋ยสูตร 25-7-7 อัตรา 15–20 กก./ไร่',
    ],
    note: { label: 'การให้น้ำ', value: 'วันเว้นวัน ช่วงเช้า 2–3 ลิตร/ต้น' },
  },
  {
    stage: 3,
    range: '26 – 38 วัน',
    title: 'ออกดอก & ผสมเกสร',
    summary: 'ช่วงชี้ขาดผลผลิต ผสมเกสรด้วยมือช่วงเช้าให้ติดผลครบ 100%',
    tasks: [
      'ผสมเกสรด้วยมือช่วง 06:00 – 09:30 น.',
      'เลือกเก็บผลที่ 2 หรือ 3 จากโคนเถา (ข้อ 15–20)',
      'ปล่อยผึ้ง 1 รัง/ไร่ ช่วยเพิ่มอัตราการติดผล',
    ],
    note: { label: 'ข้อควรระวัง', value: 'งดพ่นสารกำจัดแมลงช่วงดอกบาน' },
    critical: true,
  },
  {
    stage: 4,
    range: '39 – 55 วัน',
    title: 'ขยายผล & สะสมแป้ง',
    summary: 'เร่งขนาดผลและสะสมน้ำตาล ป้องกันผลไหม้แดด',
    tasks: [
      'เปลี่ยนปุ๋ยเป็นสูตร 13-13-21 เพื่อเพิ่มความหวาน',
      'พลิกผลทุก 7 วันให้สีสม่ำเสมอ',
      'คลุมฟางหรือใบกันผลไหม้แดด (Sunburn)',
    ],
    note: { label: 'เป้าหมาย', value: 'เพิ่มน้ำหนักผล 0.8 – 1.2 กก./สัปดาห์' },
  },
  {
    stage: 5,
    range: '56 – 65 วัน',
    title: 'เก็บเกี่ยวผลผลิต',
    summary: 'งดน้ำ 5 – 7 วันก่อนตัด เพื่อให้ความหวานเข้มข้นที่สุด',
    tasks: [
      'สังเกตมือเกาะข้อติดผลแห้งเป็นสีน้ำตาล',
      'เคาะผลได้เสียงทุ้มแน่น จุดสัมผัสพื้นเป็นสีครีมเหลือง',
      'ตัดช่วงเช้า 06:00 – 10:00 น. แล้วพักในร่ม',
    ],
    note: { label: 'ช่วงเวลาตัดผล', value: 'เช้าตรู่ 06:00 – 10:00 น.' },
  },
] as const;

export type WeeklyTask = { id: string; label: string; detail: string; done: boolean; urgent?: boolean };

export const WEEKLY_TASKS: readonly WeeklyTask[] = [
  {
    id: 'pollinate',
    label: 'ตรวจนับดอกตัวเมียและผสมเกสรด้วยมือ',
    detail: 'ปฏิบัติเวลา 06:30 – 09:00 น. ก่อนแดดจัด',
    done: true,
    urgent: true,
  },
  {
    id: 'potassium',
    label: 'ให้ปุ๋ยเกล็ดโพแทสเซียม 15-0-0 ผ่านระบบน้ำหยด',
    detail: 'อัตรา 2 กก./1,000 ลิตร สลับกับแคลเซียมโบรอน',
    done: true,
    urgent: true,
  },
  {
    id: 'moisture',
    label: 'ตรวจสอบความชื้นดินด้วยเซนเซอร์ TDR (เป้าหมาย 65%)',
    detail: 'หากต่ำกว่า 55% ให้เพิ่มรอบน้ำอีก 1 รอบ',
    done: false,
  },
  {
    id: 'prune',
    label: 'ปลิดแขนงข้างให้เหลือเถาหลัก 2 เถา',
    detail: 'เลือกไว้ผลที่ตำแหน่งข้อ 15 – 20 จากโคนเถา',
    done: false,
  },
] as const;

/** Area-and-yield calculator defaults. */
export const PLANTING_DEFAULTS = {
  rai: 5,
  ngan: 2,
  wa: 0,
  spacing: '0.5 x 2.5 เมตร',
  system: 'ยกร่องคลุมพลาสติก',
};
