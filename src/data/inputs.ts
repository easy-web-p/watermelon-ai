/** Fertiliser and crop-protection directory. */

export type ProductKind = 'ปุ๋ย' | 'สารกำจัดโรคพืช' | 'สารกำจัดแมลง' | 'ชีวภัณฑ์' | 'ธาตุอาหารเสริม';

export type Product = {
  id: string;
  name: string;
  active: string;
  kind: ProductKind;
  /** FRAC / IRAC mode-of-action group; biologicals have none. */
  group?: string;
  rate: string;
  targets: readonly string[];
  stage: string;
  /** Pre-harvest interval, in days. */
  phi: number;
  price: string;
  /** Flagged when rotation matters to avoid resistance. */
  rotate?: boolean;
  organic?: boolean;
};

export const PRODUCTS: readonly Product[] = [
  {
    id: 'antracol',
    name: 'แอนทราโคล (Antracol)',
    active: 'โพรพิเนบ 70% WP',
    kind: 'สารกำจัดโรคพืช',
    group: 'FRAC M3',
    rate: '20 – 30 ก. / น้ำ 20 ล.',
    targets: ['แอนแทรคโนส', 'ใบจุด', 'ราน้ำค้าง'],
    stage: 'ระยะเลื้อยเถา – ขยายผล',
    phi: 7,
    price: '฿320 / 1 กก.',
    rotate: true,
  },
  {
    id: 'amistar',
    name: 'อามิสตาร์ (Amistar)',
    active: 'อะซ็อกซีสโตรบิน 25% SC',
    kind: 'สารกำจัดโรคพืช',
    group: 'FRAC 11',
    rate: '10 – 15 มล. / น้ำ 20 ล.',
    targets: ['แอนแทรคโนส', 'ราแป้ง', 'ใบไหม้'],
    stage: 'ระยะออกดอก – ขยายผล',
    phi: 7,
    price: '฿890 / 250 มล.',
    rotate: true,
  },
  {
    id: 'metalaxyl',
    name: 'เมทาแลกซิล + แมนโคเซบ',
    active: 'Metalaxyl 8% + Mancozeb 64% WP',
    kind: 'สารกำจัดโรคพืช',
    group: 'FRAC 4 + M3',
    rate: '40 ก. / น้ำ 20 ล.',
    targets: ['ราน้ำค้าง', 'โรคเน่าคอดิน'],
    stage: 'ระยะกล้า – เลื้อยเถา',
    phi: 7,
    price: '฿260 / 1 กก.',
    rotate: true,
  },
  {
    id: 'trichoderma',
    name: 'ไตรโคเดอร์มา ฮาร์เซียนุม',
    active: 'Trichoderma harzianum 10⁸ CFU/g',
    kind: 'ชีวภัณฑ์',
    rate: '100 ก. / น้ำ 20 ล.',
    targets: ['เน่าคอดิน', 'เหี่ยวฟิวซาเรียม', 'ยางไหล'],
    stage: 'ทุกระยะ (เน้นรองก้นหลุม)',
    phi: 0,
    price: '฿150 / 1 กก.',
    organic: true,
  },
  {
    id: 'bacillus',
    name: 'บาซิลลัส ซับทิลิส',
    active: 'Bacillus subtilis 10⁹ CFU/g',
    kind: 'ชีวภัณฑ์',
    rate: '50 ก. / น้ำ 20 ล.',
    targets: ['ราน้ำค้าง', 'ราแป้ง', 'ผลเน่าแบคทีเรีย'],
    stage: 'ระยะเลื้อยเถา – เก็บเกี่ยว',
    phi: 0,
    price: '฿180 / 500 ก.',
    organic: true,
  },
  {
    id: 'beauveria',
    name: 'เชื้อราบิวเวอเรีย',
    active: 'Beauveria bassiana 10⁸ CFU/g',
    kind: 'ชีวภัณฑ์',
    rate: '100 ก. / น้ำ 20 ล.',
    targets: ['เพลี้ยไฟ', 'ไรแดง', 'แมลงหวี่ขาว'],
    stage: 'ทุกระยะ (พ่นช่วงเย็น)',
    phi: 0,
    price: '฿165 / 1 กก.',
    organic: true,
  },
  {
    id: 'spinetoram',
    name: 'สไปนีโทแรม',
    active: 'Spinetoram 12% SC',
    kind: 'สารกำจัดแมลง',
    group: 'IRAC 5',
    rate: '10 มล. / น้ำ 20 ล.',
    targets: ['เพลี้ยไฟ', 'หนอนชอนใบ'],
    stage: 'ระยะเลื้อยเถา – ออกดอก',
    phi: 7,
    price: '฿1,250 / 250 มล.',
    rotate: true,
  },
  {
    id: 'abamectin',
    name: 'อะบาเมกติน',
    active: 'Abamectin 1.8% EC',
    kind: 'สารกำจัดแมลง',
    group: 'IRAC 6',
    rate: '20 – 30 มล. / น้ำ 20 ล.',
    targets: ['ไรแดง', 'เพลี้ยไฟ', 'หนอนชอนใบ'],
    stage: 'ระยะเลื้อยเถา – ขยายผล',
    phi: 7,
    price: '฿420 / 1 ล.',
    rotate: true,
  },
  {
    id: 'npk-25-7-7',
    name: 'ปุ๋ยสูตร 25-7-7',
    active: 'N 25% – P 7% – K 7%',
    kind: 'ปุ๋ย',
    rate: '15 – 20 กก. / ไร่',
    targets: ['เร่งการเจริญเติบโตทางใบและเถา'],
    stage: 'ระยะย้ายกล้า – เลื้อยเถา',
    phi: 0,
    price: '฿780 / 50 กก.',
  },
  {
    id: 'npk-13-13-21',
    name: 'ปุ๋ยสูตร 13-13-21',
    active: 'N 13% – P 13% – K 21%',
    kind: 'ปุ๋ย',
    rate: '25 – 30 กก. / ไร่',
    targets: ['เพิ่มน้ำหนักผลและความหวาน'],
    stage: 'ระยะขยายผล – สะสมแป้ง',
    phi: 0,
    price: '฿850 / 50 กก.',
  },
  {
    id: 'calcium-boron',
    name: 'แคลเซียม-โบรอน',
    active: 'Ca 10% + B 0.5% (ฉีดพ่นทางใบ)',
    kind: 'ธาตุอาหารเสริม',
    rate: '20 มล. / น้ำ 20 ล.',
    targets: ['ป้องกันผลแตก', 'เพิ่มอัตราการติดผล'],
    stage: 'ระยะออกดอก – ขยายผล',
    phi: 0,
    price: '฿290 / 1 ล.',
  },
  {
    id: 'potassium-sulfate',
    name: 'โพแทสเซียมซัลเฟต (0-0-50)',
    active: 'K₂O 50% + S 18%',
    kind: 'ธาตุอาหารเสริม',
    rate: '2 กก. / 1,000 ล. ผ่านระบบน้ำหยด',
    targets: ['เพิ่มค่าความหวาน Brix', 'สีเนื้อเข้มขึ้น'],
    stage: 'ระยะ 15 วันก่อนเก็บเกี่ยว',
    phi: 0,
    price: '฿1,150 / 25 กก.',
  },
] as const;

export const PRODUCT_KINDS: readonly ProductKind[] = [
  'ปุ๋ย',
  'สารกำจัดโรคพืช',
  'สารกำจัดแมลง',
  'ชีวภัณฑ์',
  'ธาตุอาหารเสริม',
];
