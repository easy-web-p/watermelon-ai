/** Subscription tiers. Prices in THB. */

export type Plan = {
  id: string;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  highlight?: boolean;
  badge?: string;
  features: readonly { label: string; included: boolean }[];
  cta: string;
};

export const PLANS: readonly Plan[] = [
  {
    id: 'free',
    name: 'เริ่มต้น',
    tagline: 'สำหรับผู้บริโภคและเกษตรกรรายย่อยที่เพิ่งเริ่มใช้',
    monthly: 0,
    yearly: 0,
    cta: 'ใช้งานฟรีทันที',
    features: [
      { label: 'สแกนวินิจฉัยโรค 10 ครั้ง/เดือน', included: true },
      { label: 'แชทปรึกษา AI พื้นฐาน', included: true },
      { label: 'เช็กราคาตลาดรายวัน', included: true },
      { label: 'คู่มือปลูก 5 ระยะ', included: true },
      { label: 'จัดการแปลงเพาะปลูก', included: false },
      { label: 'แจ้งเตือนผ่าน LINE', included: false },
      { label: 'รายงานวิเคราะห์เชิงลึก', included: false },
      { label: 'ปรึกษานักวิชาการตัวจริง', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'PRO เกษตรกรดิจิทัล',
    tagline: 'สำหรับเกษตรกรที่ปลูกเชิงพาณิชย์ 1–20 ไร่',
    monthly: 390,
    yearly: 3900,
    highlight: true,
    badge: 'คุ้มที่สุด',
    cta: 'เริ่มทดลองฟรี 14 วัน',
    features: [
      { label: 'สแกนวินิจฉัยโรคไม่จำกัด', included: true },
      { label: 'แชทปรึกษา AI ขั้นสูง + วิเคราะห์ภาพ', included: true },
      { label: 'เช็กราคาตลาด 5 แหล่ง + พยากรณ์ 7 วัน', included: true },
      { label: 'คู่มือปลูก + ตารางงานรายสัปดาห์', included: true },
      { label: 'จัดการแปลงได้สูงสุด 10 แปลง', included: true },
      { label: 'แจ้งเตือนผ่าน LINE แบบเรียลไทม์', included: true },
      { label: 'รายงานวิเคราะห์เชิงลึกรายเดือน', included: true },
      { label: 'ปรึกษานักวิชาการตัวจริง', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'วิสาหกิจชุมชน',
    tagline: 'สำหรับกลุ่มเกษตรกร สหกรณ์ และฟาร์มขนาดใหญ่',
    monthly: 1490,
    yearly: 14900,
    badge: 'สำหรับองค์กร',
    cta: 'ติดต่อฝ่ายขาย',
    features: [
      { label: 'ทุกอย่างในแพ็กเกจ PRO', included: true },
      { label: 'จัดการแปลงไม่จำกัดจำนวน', included: true },
      { label: 'บัญชีผู้ใช้งานในทีมสูงสุด 50 คน', included: true },
      { label: 'แดชบอร์ดรวมผลผลิตทั้งกลุ่ม', included: true },
      { label: 'เชื่อมต่อ API กับระบบสหกรณ์', included: true },
      { label: 'แจ้งเตือนผ่าน LINE OA ของกลุ่ม', included: true },
      { label: 'รายงานวิเคราะห์เชิงลึกรายสัปดาห์', included: true },
      { label: 'ปรึกษานักวิชาการตัวจริง 4 ครั้ง/เดือน', included: true },
    ],
  },
] as const;

export type Invoice = {
  id: string;
  date: string;
  plan: string;
  amount: number;
  status: 'ชำระแล้ว' | 'รอชำระ' | 'คืนเงินแล้ว';
  method: string;
};

export const INVOICES: readonly Invoice[] = [
  { id: 'INV-2026-0412', date: '1 ต.ค. 2569', plan: 'PRO เกษตรกรดิจิทัล (รายปี)', amount: 3900, status: 'ชำระแล้ว', method: 'บัตรเครดิต •••• 4219' },
  { id: 'INV-2025-0389', date: '1 ต.ค. 2568', plan: 'PRO เกษตรกรดิจิทัล (รายปี)', amount: 3900, status: 'ชำระแล้ว', method: 'บัตรเครดิต •••• 4219' },
  { id: 'INV-2025-0221', date: '1 ก.ค. 2568', plan: 'PRO เกษตรกรดิจิทัล (รายเดือน)', amount: 390, status: 'ชำระแล้ว', method: 'พร้อมเพย์ QR' },
  { id: 'INV-2025-0198', date: '1 มิ.ย. 2568', plan: 'PRO เกษตรกรดิจิทัล (รายเดือน)', amount: 390, status: 'ชำระแล้ว', method: 'พร้อมเพย์ QR' },
  { id: 'INV-2025-0156', date: '1 พ.ค. 2568', plan: 'PRO เกษตรกรดิจิทัล (รายเดือน)', amount: 390, status: 'คืนเงินแล้ว', method: 'พร้อมเพย์ QR' },
] as const;

export const FAQS: readonly { q: string; a: string }[] = [
  {
    q: 'ทดลองใช้ฟรี 14 วัน ต้องผูกบัตรเครดิตไหม?',
    a: 'ไม่ต้องครับ สมัครด้วยเบอร์โทรศัพท์หรือ Gmail ก็เริ่มใช้งานแพ็กเกจ PRO ได้ทันที 14 วัน และจะไม่มีการเรียกเก็บเงินอัตโนมัติเมื่อครบกำหนด',
  },
  {
    q: 'ยกเลิกหรือเปลี่ยนแพ็กเกจกลางคันได้หรือไม่?',
    a: 'ยกเลิกได้ตลอดเวลาจากหน้าตั้งค่าบัญชี หากอัปเกรดกลางรอบ ระบบจะคำนวณส่วนต่างตามจำนวนวันที่เหลือให้อัตโนมัติ',
  },
  {
    q: 'รองรับการชำระเงินช่องทางใดบ้าง?',
    a: 'รองรับบัตรเครดิต/เดบิตทุกธนาคาร พร้อมเพย์ QR โอนผ่านบัญชีธนาคาร และหักผ่าน TrueMoney Wallet',
  },
  {
    q: 'ข้อมูลแปลงและภาพถ่ายของผมปลอดภัยแค่ไหน?',
    a: 'ข้อมูลทั้งหมดเข้ารหัส SSL 256-bit จัดเก็บในศูนย์ข้อมูลในประเทศไทย และดำเนินการตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) คุณสามารถขอลบข้อมูลทั้งหมดได้ทุกเมื่อ',
  },
  {
    q: 'ออกใบกำกับภาษีในนามนิติบุคคลได้หรือไม่?',
    a: 'ได้ครับ กรอกข้อมูลผู้เสียภาษีในหน้าชำระเงิน ระบบจะออกใบกำกับภาษีเต็มรูปแบบและส่งเข้าอีเมลภายใน 24 ชั่วโมง',
  },
];
