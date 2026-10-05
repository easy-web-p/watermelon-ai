/** Cultivar reference for the sweetness & variety analyser. */

export type Cultivar = {
  id: string;
  name: string;
  code: string;
  shape: string;
  /** Typical Brix range at harvest. */
  brix: [number, number];
  weight: string;
  days: number;
  rind: string;
  flesh: string;
  market: string;
  strengths: readonly string[];
  /** Share of planted area nationwide, 0–100. */
  share: number;
};

export const CULTIVARS: readonly Cultivar[] = [
  {
    id: 'torpedo',
    name: 'ตอร์ปิโด',
    code: 'Torpedo',
    shape: 'ทรงรียาว',
    brix: [11.5, 13.0],
    weight: '4.5 – 6.5 กก.',
    days: 65,
    rind: 'เขียวเข้มลายทางชัด เปลือกบาง',
    flesh: 'แดงเข้ม เนื้อแน่นกรอบ เมล็ดน้อย',
    market: '22 – 26 ฿/กก.',
    strengths: ['ความหวานสูงสม่ำเสมอ', 'ตลาดส่งออกจีนต้องการสูง', 'ทนการขนส่งทางไกล'],
    share: 34,
  },
  {
    id: 'kinnaree-202',
    name: 'กินรี 202',
    code: 'Kinnaree 202',
    shape: 'ทรงกลมรี',
    brix: [10.5, 12.0],
    weight: '3.0 – 4.5 กก.',
    days: 60,
    rind: 'เขียวอ่อนลายพร้อย เปลือกหนาปานกลาง',
    flesh: 'แดงสด เนื้อฉ่ำน้ำ',
    market: '18 – 21 ฿/กก.',
    strengths: ['ปลูกง่าย ทนโรคราน้ำค้าง', 'อายุเก็บเกี่ยวสั้น', 'เหมาะตลาดในประเทศ'],
    share: 28,
  },
  {
    id: 'chonya-plus',
    name: 'ชอนญ่า พลัส',
    code: 'Chonya Plus',
    shape: 'ทรงกลม',
    brix: [12.0, 13.8],
    weight: '5.0 – 7.0 กก.',
    days: 68,
    rind: 'เขียวดำ ผิวมันวาว',
    flesh: 'แดงเข้มจัด เนื้อละเอียด',
    market: '24 – 30 ฿/กก.',
    strengths: ['ความหวานสูงสุดในกลุ่ม', 'ผลใหญ่ น้ำหนักดี', 'ราคาพรีเมียม'],
    share: 19,
  },
  {
    id: 'yellow-sun',
    name: 'ซันเล่อ (เนื้อเหลือง)',
    code: 'Yellow Sun',
    shape: 'ทรงกลมเล็ก',
    brix: [11.0, 12.5],
    weight: '2.0 – 3.0 กก.',
    days: 55,
    rind: 'เขียวอ่อนลายบาง เปลือกบางมาก',
    flesh: 'เหลืองทอง เนื้อนุ่มหอม',
    market: '28 – 35 ฿/กก.',
    strengths: ['ราคาต่อกิโลสูงสุด', 'เหมาะตลาดโมเดิร์นเทรด', 'อายุสั้นหมุนรอบเร็ว'],
    share: 11,
  },
  {
    id: 'seedless-jade',
    name: 'หยกไร้เมล็ด',
    code: 'Seedless Jade',
    shape: 'ทรงกลมรี',
    brix: [11.8, 13.2],
    weight: '3.5 – 5.0 กก.',
    days: 70,
    rind: 'เขียวสว่างลายทางเด่น',
    flesh: 'แดงอมชมพู ไร้เมล็ดดำ',
    market: '30 – 38 ฿/กก.',
    strengths: ['ไร้เมล็ด ตลาดพรีเมียมต้องการ', 'เก็บรักษาได้นาน', 'เหมาะทำผลไม้ตัดแต่ง'],
    share: 8,
  },
] as const;

/** Ripeness bands used by the knock-sound and image analysers. */
export const RIPENESS_BANDS = [
  { id: 'unripe', label: 'ยังไม่สุก', brix: '< 9.0', tone: 'neutral', note: 'เสียงเคาะแหลมสูง เนื้อยังขาวซีด ควรรออีก 7–10 วัน' },
  { id: 'ripe', label: 'สุกพอดี', brix: '10.5 – 13.0', tone: 'secondary', note: 'เสียงเคาะทุ้มแน่น ขั้วเริ่มแห้ง จุดสัมผัสพื้นเป็นสีครีมเหลือง' },
  { id: 'overripe', label: 'สุกเกิน', brix: '> 13.5', tone: 'error', note: 'เสียงเคาะโปร่งกลวง เนื้อเริ่มเป็นโพรง ควรรีบจำหน่าย' },
] as const;
