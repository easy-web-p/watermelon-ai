/**
 * Watermelon disease reference used by the diagnostics catalogue, the chat
 * analysis card and the landing-page demo. Treatment data follows the Thai
 * Department of Agriculture FRAC grouping conventions.
 */

export type Severity = 'critical' | 'high' | 'moderate';

export type Disease = {
  id: string;
  name: string;
  latin: string;
  pathogen: string;
  category: 'เชื้อรา' | 'ไวรัส' | 'แบคทีเรีย' | 'แมลงศัตรูพืช' | 'สรีรวิทยา';
  severity: Severity;
  /** Share of yield typically lost when untreated. */
  yieldLoss: string;
  symptoms: readonly string[];
  conditions: string;
  chemical: string;
  biological: string;
  cultural: string;
  /**
   * Pre-harvest interval, in days.
   *
   * `0` means there is no post-symptom chemical treatment for this entry,
   * and the catalogue UI prints it as "ไม่ใช้สารเคมีรักษา". So a `chemical`
   * field on a `phi: 0` entry must not read as an actionable product
   * recommendation — it would appear next to that label with no interval,
   * which is the one thing the safety rules forbid.
   */
  phi: number;
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'รุนแรงมาก',
  high: 'รุนแรง',
  moderate: 'ปานกลาง',
};

export const SEVERITY_TONE: Record<Severity, 'error' | 'primary' | 'neutral'> = {
  critical: 'error',
  high: 'primary',
  moderate: 'neutral',
};

export const DISEASES: readonly Disease[] = [
  {
    id: 'anthracnose',
    name: 'โรคแอนแทรคโนส',
    latin: 'Anthracnose',
    pathogen: 'Colletotrichum gloeosporioides',
    category: 'เชื้อรา',
    severity: 'critical',
    yieldLoss: '60–80%',
    symptoms: [
      'แผลจุดฉ่ำน้ำสีน้ำตาลเข้ม ขอบแผลมีวงซ้อน กระจายทั่วผิวใบ',
      'ขอบใบแห้งกรอบม้วนขึ้น ใบล่างแห้งร่วงก่อนกำหนด',
      'แผลก้านแตกลาย มีเมือกหรือหยดน้ำยางสีน้ำตาลอมแดงซึม',
    ],
    conditions: 'ความชื้นสัมพัทธ์เกิน 85% ฝนตกชุกต่อเนื่อง อุณหภูมิ 24–30°C',
    chemical: 'โพรพิเนบ (Antracol) หรือ อะซ็อกซีสโตรบิน (Amistar) 20–30 ก./น้ำ 20 ล. สลับกลุ่มกลไกฤทธิ์ทุก 5–7 วัน',
    biological: 'ไตรโคเดอร์มา ฮาร์เซียนุม 100 ก./น้ำ 20 ล. ฉีดพ่นช่วงเย็นทุก 7 วัน',
    cultural: 'ตัดแต่งใบและเถาที่เป็นโรคใส่ถุงมิดชิดนำไปเผาทำลาย งดให้น้ำสปริงเกอร์ทางใบช่วงเย็น เปลี่ยนเป็นน้ำหยดใต้โคน',
    phi: 7,
  },
  {
    id: 'downy-mildew',
    name: 'โรคราน้ำค้าง',
    latin: 'Downy Mildew',
    pathogen: 'Pseudoperonospora cubensis',
    category: 'เชื้อรา',
    severity: 'critical',
    yieldLoss: '40–50%',
    symptoms: [
      'แผลเหลี่ยมสีเหลืองถูกจำกัดด้วยเส้นใบ มองเห็นชัดจากด้านบนใบ',
      'ใต้ใบมีขุยราสีเทาอมม่วงในตอนเช้าที่มีน้ำค้าง',
      'ใบแก่ด้านล่างแห้งไหม้ลามขึ้นสู่ยอด เถาโกร๋น',
    ],
    conditions: 'อุณหภูมิ 15–22°C ช่วงเช้ามีน้ำค้างจัด ความชื้นใบเปียกนานเกิน 6 ชม.',
    chemical: 'เมทาแลกซิล + แมนโคเซบ 40 ก./น้ำ 20 ล. หรือ ไซมอกซานิล สลับกลุ่ม 4 กับกลุ่ม 40',
    biological: 'บาซิลลัส ซับทิลิส 50 ก./น้ำ 20 ล. พ่นป้องกันทุก 5 วันช่วงหน้าหนาว',
    cultural: 'ยกร่องให้ระบายน้ำดี เว้นระยะปลูกให้ลมผ่าน เก็บใบล่างที่แห้งออกจากแปลง',
    phi: 7,
  },
  {
    id: 'gummy-stem-blight',
    name: 'โรคยางไหล',
    latin: 'Gummy Stem Blight',
    pathogen: 'Didymella bryoniae',
    category: 'เชื้อรา',
    severity: 'high',
    yieldLoss: '30–50%',
    symptoms: [
      'แผลก้านและข้อเถาแตกลาย มีเมือกยางสีน้ำตาลแดงไหลเยิ้ม',
      'โคนเถาเน่าแห้ง ต้นเหี่ยวทั้งต้นในระยะติดผล',
      'ผลมีแผลฉ่ำน้ำบริเวณขั้ว ลุกลามเป็นเนื้อเน่า',
    ],
    conditions: 'แปลงที่ปลูกซ้ำที่เดิม ดินแฉะ มีบาดแผลจากการตัดแต่งเถา',
    chemical: 'ไดฟีโนโคนาโซล หรือ เบโนมิล ราดโคนและพ่นแผล 15–20 ก./น้ำ 20 ล.',
    biological: 'ไตรโคเดอร์มาคลุกเมล็ดก่อนปลูก และราดโคนทุก 14 วัน',
    cultural: 'ตัดแต่งเถาเฉพาะช่วงแดดจัด ทาปูนแดงที่รอยตัด ปลูกหมุนเวียนพืชต่างตระกูล',
    phi: 10,
  },
  {
    id: 'fusarium-wilt',
    name: 'โรคเหี่ยวฟิวซาเรียม',
    latin: 'Fusarium Wilt',
    pathogen: 'Fusarium oxysporum f. sp. niveum',
    category: 'เชื้อรา',
    severity: 'critical',
    yieldLoss: '50–100%',
    symptoms: [
      'ต้นเหี่ยวเฉพาะด้านใดด้านหนึ่งในช่วงแดดจัด ฟื้นตัวตอนเย็น',
      'ผ่าโคนต้นพบท่อน้ำท่ออาหารเป็นสีน้ำตาลเข้ม',
      'ใบล่างเหลืองลามขึ้นบน สุดท้ายต้นแห้งตายทั้งต้น',
    ],
    conditions: 'ดินเป็นกรด pH ต่ำกว่า 6.0 อุณหภูมิดินสูง ปลูกซ้ำที่เดิมหลายฤดู',
    // Named a specific product (คาร์เบนดาซิม) as a soil drench while `phi`
    // is 0, so the card showed "ไม่ใช้สารเคมีรักษา" directly above a
    // fungicide with no pre-harvest interval beside it. A sourced PHI for
    // the drench has to come from the Department of Agriculture before a
    // product is named here again.
    chemical:
      'ไม่มีสารเคมีรักษาหลังแสดงอาการ หากจะป้องกันด้วยการราดโคนก่อนระบาด ' +
      'ต้องเลือกสารตามคำแนะนำเจ้าหน้าที่เกษตรในพื้นที่ และอ่านค่าระยะปลอดภัยก่อนเก็บเกี่ยว (PHI) ' +
      'บนฉลากของสารนั้นก่อนใช้ทุกครั้ง',
    biological: 'ไตรโคเดอร์มาผสมปุ๋ยหมักรองก้นหลุม 1 กก./ไร่ ร่วมกับเชื้อบีเอส',
    cultural: 'ใช้ต้นตอน้ำเต้าหรือฟักทองที่ต้านทานโรค ปรับ pH ดินเป็น 6.5–7.0 ด้วยโดโลไมต์',
    phi: 0,
  },
  {
    id: 'powdery-mildew',
    name: 'โรคราแป้ง',
    latin: 'Powdery Mildew',
    pathogen: 'Podosphaera xanthii',
    category: 'เชื้อรา',
    severity: 'moderate',
    yieldLoss: '20–35%',
    symptoms: [
      'ผงสีขาวคล้ายแป้งเกาะบนผิวใบด้านบนและก้านใบ',
      'ใบที่เป็นมากจะเหลืองแห้งกรอบ ผลเล็กและความหวานลดลง',
      'ระบาดเร็วในช่วงอากาศแห้งสลับชื้น',
    ],
    conditions: 'อากาศแห้ง อุณหภูมิ 20–27°C แปลงที่ร่มและอากาศถ่ายเทไม่ดี',
    chemical: 'ซัลเฟอร์ 60–80 ก./น้ำ 20 ล. หรือ ไมโคลบิวทานิล สลับกับกลุ่ม 3',
    biological: 'น้ำหมักสมุนไพรกำมะถันผสมบาซิลลัส ฉีดพ่นเช้าตรู่ทุก 5 วัน',
    cultural: 'ตัดแต่งใบล่างให้โปร่ง เพิ่มโพแทสเซียมช่วงติดผล ลดการใส่ไนโตรเจนเกินขนาด',
    phi: 3,
  },
  {
    id: 'watermelon-mosaic-virus',
    name: 'โรคใบด่างยอดหงิก',
    latin: 'Watermelon Mosaic Virus',
    pathogen: 'WMV-2 / ZYMV (พาหะคือเพลี้ยอ่อน)',
    category: 'ไวรัส',
    severity: 'critical',
    yieldLoss: '60–90%',
    symptoms: [
      'ยอดอ่อนหงิกงอ ใบด่างเขียวเข้มสลับเขียวอ่อนเป็นลายโมเสก',
      'ข้อปล้องสั้น ต้นแคระแกร็น ไม่ติดผลหรือผลบิดเบี้ยว',
      'ผลมีลายด่างและเนื้อแข็งกระด้าง ความหวานต่ำ',
    ],
    conditions: 'ฤดูที่เพลี้ยอ่อนและแมลงหวี่ขาวระบาด แปลงใกล้พืชตระกูลแตงอื่น',
    chemical: 'ไม่มีสารรักษาไวรัส ต้องควบคุมพาหะด้วย อิมิดาโคลพริด หรือ ไทอะมีทอกแซม',
    biological: 'ปล่อยแตนเบียนและด้วงเต่าลาย ร่วมกับน้ำมันปิโตรเลียมออยล์กำจัดเพลี้ย',
    cultural: 'ถอนต้นเป็นโรคเผาทำลายทันที คลุมแปลงด้วยพลาสติกเงินไล่เพลี้ย ใช้เมล็ดพันธุ์ปลอดเชื้อ',
    phi: 7,
  },
  {
    id: 'bacterial-fruit-blotch',
    name: 'โรคผลเน่าแบคทีเรีย',
    latin: 'Bacterial Fruit Blotch',
    pathogen: 'Acidovorax citrulli',
    category: 'แบคทีเรีย',
    severity: 'high',
    yieldLoss: '40–70%',
    symptoms: [
      'ผิวผลมีรอยฉ่ำน้ำสีเขียวเข้มลามเป็นแผลแตกสีน้ำตาล',
      'ใบเลี้ยงและใบจริงมีแผลฉ่ำน้ำตามเส้นใบ',
      'ผลเน่าเละภายใน 7–10 วันหลังแสดงอาการ',
    ],
    conditions: 'ความชื้นสูง อุณหภูมิ 28–32°C เมล็ดพันธุ์ปนเปื้อนเชื้อ',
    chemical: 'คอปเปอร์ไฮดรอกไซด์ 40 ก./น้ำ 20 ล. พ่นคลุมผลทุก 7 วันช่วงติดผลอ่อน',
    biological: 'บาซิลลัส อะไมโลลิควิแฟเชียนส์ ร่วมกับการแช่เมล็ดน้ำอุ่น 50°C นาน 25 นาที',
    cultural: 'ใช้เมล็ดพันธุ์ผ่านการรับรองปลอดเชื้อ เก็บผลที่เป็นโรคออกนอกแปลงทันที',
    phi: 5,
  },
  {
    id: 'thrips-mites',
    name: 'เพลี้ยไฟและไรแดง',
    latin: 'Thrips & Red Spider Mites',
    pathogen: 'Thrips palmi / Tetranychus spp.',
    category: 'แมลงศัตรูพืช',
    severity: 'high',
    yieldLoss: '25–45%',
    symptoms: [
      'ยอดอ่อนหงิกงอ ใบมีรอยขูดขีดสีเงินและจุดดำของมูลเพลี้ย',
      'ใต้ใบมีใยบางและจุดแดงเล็กเคลื่อนไหว (ไรแดง)',
      'ดอกร่วง ผลผิวกร้านเป็นขี้กลาก ราคาตกเกรด',
    ],
    conditions: 'อากาศร้อนแห้งแล้ง ฝนทิ้งช่วง อุณหภูมิเกิน 33°C',
    chemical: 'สไปนีโทแรม หรือ ฟิโพรนิล สลับกับ อะบาเมกติน ป้องกันการดื้อยา',
    biological: 'เชื้อราบิวเวอเรีย 100 ก./น้ำ 20 ล. พ่นช่วงเย็นทุก 5 วัน ร่วมกับไรตัวห้ำ',
    cultural: 'ให้น้ำเพิ่มความชื้นในแปลง ติดกับดักกาวเหนียวสีน้ำเงิน 10 จุด/ไร่',
    phi: 7,
  },
] as const;
