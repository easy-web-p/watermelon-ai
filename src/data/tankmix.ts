/**
 * Tank-mix kits for the dosage calculator.
 *
 * `order` follows the standard agronomic sequence (W-A-L-E-S): wettable
 * powders and granules dissolve first, then suspensions, then emulsifiable
 * concentrates, with surfactant last. Mixing out of order makes the chemicals
 * precipitate and clog the nozzle — which is why the order, not just the dose,
 * is shown.
 */

export type Formulation = 'ผงละลายน้ำ (WP/WG/SP)' | 'สารแขวนลอย (SC/SL)' | 'อิมัลชัน (EC)' | 'ชีวภัณฑ์' | 'สารจับใบ';

export type MixComponent = {
  name: string;
  /** Rate per 20 litres of water. */
  ratePer20L: number;
  unit: 'กรัม' | 'มล.';
  formulation: Formulation;
  note?: string;
};

export type TankKit = {
  id: string;
  name: string;
  purpose: string;
  stage: string;
  /** Pre-harvest interval for the whole kit, in days. */
  phi: number;
  sprayWindow: string;
  warning?: string;
  components: readonly MixComponent[];
};

/** Order in which formulation types must enter the tank. */
export const MIX_SEQUENCE: readonly Formulation[] = [
  'ผงละลายน้ำ (WP/WG/SP)',
  'สารแขวนลอย (SC/SL)',
  'อิมัลชัน (EC)',
  'ชีวภัณฑ์',
  'สารจับใบ',
];

export const TANK_PRESETS = [
  { id: 'backpack', label: 'เป้สะพาย 20 ลิตร', litres: 20 },
  { id: 'trailer', label: 'ถัง 200 ลิตร (1 พ่วง)', litres: 200 },
  { id: 'ibc', label: 'ถัง IBC 1,000 ลิตร', litres: 1000 },
] as const;

export const TANK_KITS: readonly TankKit[] = [
  {
    id: 'brix-booster',
    name: 'ชุดระเบิดความหวาน Brix 13+',
    purpose: 'เร่งสะสมน้ำตาลช่วงก่อนเก็บเกี่ยว เนื้อแน่น ไม่ไส้แตก',
    stage: 'ระยะ 15–20 วันก่อนเก็บเกี่ยว',
    phi: 0,
    sprayWindow: '06:00 – 09:00 น. หรือหลัง 16:30 น.',
    components: [
      { name: 'โพแทสเซียมซัลเฟต (0-0-50)', ratePer20L: 60, unit: 'กรัม', formulation: 'ผงละลายน้ำ (WP/WG/SP)' },
      { name: 'แมกนีเซียมซัลเฟต', ratePer20L: 40, unit: 'กรัม', formulation: 'ผงละลายน้ำ (WP/WG/SP)' },
      { name: 'แคลเซียม-โบรอน', ratePer20L: 20, unit: 'มล.', formulation: 'สารแขวนลอย (SC/SL)' },
      { name: 'สารจับใบ', ratePer20L: 5, unit: 'มล.', formulation: 'สารจับใบ', note: 'เติมเป็นลำดับสุดท้ายเสมอ' },
    ],
  },
  {
    id: 'fruit-sizing',
    name: 'ชุดขยายลูกเบ่งผล',
    purpose: 'เพิ่มขนาดและน้ำหนักผลช่วงขยายผล',
    stage: 'ระยะขยายผล (วันที่ 39–55)',
    phi: 0,
    sprayWindow: '06:00 – 09:00 น.',
    components: [
      { name: 'ปุ๋ยเกล็ด 15-15-15', ratePer20L: 50, unit: 'กรัม', formulation: 'ผงละลายน้ำ (WP/WG/SP)' },
      { name: 'ปุ๋ยเกล็ด 13-13-21', ratePer20L: 50, unit: 'กรัม', formulation: 'ผงละลายน้ำ (WP/WG/SP)' },
      { name: 'สาหร่ายสกัด (Seaweed extract)', ratePer20L: 20, unit: 'มล.', formulation: 'สารแขวนลอย (SC/SL)' },
      { name: 'สารจับใบ', ratePer20L: 5, unit: 'มล.', formulation: 'สารจับใบ' },
    ],
  },
  {
    id: 'downy-urgent',
    name: 'ชุดพ่นรักษาราน้ำค้างเร่งด่วน',
    purpose: 'หยุดการลุกลามของราน้ำค้างภายใน 48 ชั่วโมง',
    stage: 'ทุกระยะเมื่อพบอาการ',
    phi: 7,
    sprayWindow: 'เช้าตรู่ที่ไม่มีน้ำค้างเกาะใบ',
    warning: 'ห้ามใช้ซ้ำกลุ่มเดิมเกิน 2 ครั้งติดกัน — สลับกลุ่ม FRAC ทุกรอบ',
    components: [
      { name: 'เมทาแลกซิล + แมนโคเซบ', ratePer20L: 40, unit: 'กรัม', formulation: 'ผงละลายน้ำ (WP/WG/SP)', note: 'FRAC 4 + M3' },
      { name: 'ไดเมโทมอร์ฟ', ratePer20L: 20, unit: 'มล.', formulation: 'สารแขวนลอย (SC/SL)', note: 'FRAC 40' },
      { name: 'สารจับใบ', ratePer20L: 5, unit: 'มล.', formulation: 'สารจับใบ' },
    ],
  },
  {
    id: 'thrips-sweep',
    name: 'ชุดกวาดเพลี้ยไฟ-แมลงหวี่ขาว',
    purpose: 'ควบคุมเพลี้ยไฟ ไรแดง และแมลงหวี่ขาวที่เป็นพาหะไวรัส',
    stage: 'ระยะเลื้อยเถา – ออกดอก',
    phi: 7,
    sprayWindow: 'เย็น หลัง 16:30 น. (ลดผลกระทบต่อผึ้ง)',
    warning: 'งดพ่นช่วงดอกบานเพื่อไม่ทำลายแมลงผสมเกสร',
    components: [
      { name: 'อิมิดาโคลพริด', ratePer20L: 15, unit: 'มล.', formulation: 'สารแขวนลอย (SC/SL)', note: 'IRAC 4A' },
      { name: 'สไปโรมีซิเฟน', ratePer20L: 20, unit: 'มล.', formulation: 'สารแขวนลอย (SC/SL)', note: 'IRAC 23' },
      { name: 'ปิโตรเลียมออยล์', ratePer20L: 40, unit: 'มล.', formulation: 'อิมัลชัน (EC)' },
      { name: 'สารจับใบ', ratePer20L: 5, unit: 'มล.', formulation: 'สารจับใบ' },
    ],
  },
  {
    id: 'bio-root',
    name: 'ชุดชีวภัณฑ์ป้องกันรากเน่าโคนเน่า',
    purpose: 'ป้องกันเชื้อราในดินแบบปลอดสารตกค้าง',
    stage: 'ทุกระยะ — ราดโคนทุก 14 วัน',
    phi: 0,
    sprayWindow: 'เย็น หรือวันที่ไม่มีแดดจัด',
    warning: 'ห้ามผสมกับสารกำจัดเชื้อราเคมีในถังเดียวกัน — เชื้อจะตาย',
    components: [
      { name: 'ไตรโคเดอร์มา ฮาร์เซียนุม', ratePer20L: 100, unit: 'กรัม', formulation: 'ชีวภัณฑ์' },
      { name: 'บาซิลลัส ซับทิลิส', ratePer20L: 50, unit: 'กรัม', formulation: 'ชีวภัณฑ์' },
      { name: 'กากน้ำตาล (อาหารเชื้อ)', ratePer20L: 20, unit: 'มล.', formulation: 'ชีวภัณฑ์' },
    ],
  },
] as const;
