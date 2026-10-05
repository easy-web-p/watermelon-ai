/**
 * Every HTTP state the app surfaces as a full page. Keyed by status code so a
 * single screen can render all of them from the route `/status/:code`.
 */

export type StatusTone = 'success' | 'info' | 'warning' | 'error';

export type StatusPageData = {
  code: number;
  label: string;
  tone: StatusTone;
  icon: string;
  title: string;
  body: string;
  /** What the farmer can actually do about it, in plain language. */
  hints: readonly string[];
  primary: { label: string; to: string; icon: string };
  secondary?: { label: string; to: string; icon: string };
  /** Shown when the user most likely cannot fix it themselves. */
  showSupport?: boolean;
};

export const STATUS_PAGES: Record<string, StatusPageData> = {
  '200': {
    code: 200,
    label: 'OK',
    tone: 'success',
    icon: 'check_circle',
    title: 'ระบบทำงานปกติทุกส่วน',
    body: 'บริการวินิจฉัยโรค ระบบราคาตลาด และการแจ้งเตือนทั้งหมดพร้อมใช้งานตามปกติ',
    // No uptime monitoring feeds this page, so it states no figures. It used
    // to claim 99.97% availability over 30 days and a 2.8 s average response
    // time — numbers with nothing behind them, on the page a farmer checks
    // when they suspect the service is down.
    hints: [
      'ตรวจสถานะจริงของ API ได้ที่ /api/v1/health',
      'ตรวจสถานะระบบวิเคราะห์ภาพใบได้ที่ /api/v1/watermelon/disease-model',
      'ระบบวิเคราะห์เสียงเคาะยังไม่พร้อมใช้งานในเวอร์ชันนี้',
    ],
    primary: { label: 'กลับไปหน้าแชท AI', to: '/chat', icon: 'forum' },
    secondary: { label: 'ดูหน้าแรก', to: '/', icon: 'home' },
  },
  '201': {
    code: 201,
    label: 'Created',
    tone: 'success',
    icon: 'add_task',
    title: 'สร้างรายการใหม่สำเร็จแล้ว',
    body: 'ข้อมูลของคุณถูกบันทึกเข้าระบบเรียบร้อย และพร้อมใช้งานได้ทันที',
    hints: [
      'ข้อมูลถูกซิงก์ไปยังทุกอุปกรณ์ที่คุณเข้าสู่ระบบอยู่',
      'คุณสามารถแก้ไขหรือลบรายการนี้ได้ตลอดเวลา',
    ],
    primary: { label: 'ดูรายการที่สร้าง', to: '/plots', icon: 'map' },
    secondary: { label: 'กลับไปหน้าแชท', to: '/chat', icon: 'forum' },
  },
  '204': {
    code: 204,
    label: 'No Content',
    tone: 'info',
    icon: 'inbox',
    title: 'ยังไม่มีข้อมูลในส่วนนี้',
    body: 'เรายังไม่พบรายการที่จะแสดง อาจเพราะคุณยังไม่ได้เพิ่มข้อมูล หรือตัวกรองที่เลือกแคบเกินไป',
    hints: [
      'ลองล้างตัวกรองหรือขยายช่วงวันที่ที่เลือก',
      'หากเพิ่งสมัครใช้งาน ให้เริ่มจากการเพิ่มแปลงเพาะปลูกแปลงแรก',
    ],
    primary: { label: 'เพิ่มแปลงเพาะปลูก', to: '/plots', icon: 'add_circle' },
    secondary: { label: 'กลับไปหน้าแชท', to: '/chat', icon: 'forum' },
  },
  '400': {
    code: 400,
    label: 'Bad Request',
    tone: 'warning',
    icon: 'rule',
    title: 'คำขอไม่ถูกต้อง',
    body: 'ระบบไม่สามารถประมวลผลคำขอนี้ได้ เพราะข้อมูลที่ส่งมาไม่อยู่ในรูปแบบที่ถูกต้อง',
    hints: [
      'ตรวจสอบว่ากรอกข้อมูลครบทุกช่องที่มีเครื่องหมาย *',
      'หากอัปโหลดภาพ ให้ใช้ไฟล์ JPG, PNG หรือ WEBP ขนาดไม่เกิน 10 MB',
      'ลองรีเฟรชหน้าแล้วทำรายการใหม่อีกครั้ง',
    ],
    primary: { label: 'ลองใหม่อีกครั้ง', to: '/chat', icon: 'refresh' },
    secondary: { label: 'กลับไปหน้าแรก', to: '/', icon: 'home' },
  },
  '401': {
    code: 401,
    label: 'Unauthorized',
    tone: 'warning',
    icon: 'lock',
    title: 'กรุณาเข้าสู่ระบบก่อนใช้งาน',
    body: 'เซสชันของคุณหมดอายุแล้ว หรือคุณยังไม่ได้เข้าสู่ระบบ กรุณายืนยันตัวตนอีกครั้งเพื่อเข้าถึงข้อมูลแปลงของคุณ',
    hints: [
      'เซสชันจะหมดอายุอัตโนมัติหลังไม่มีการใช้งาน 30 วัน',
      'หากจำรหัสผ่านไม่ได้ สามารถกู้คืนบัญชีผ่าน SMS หรือ Gmail',
    ],
    primary: { label: 'เข้าสู่ระบบ', to: '/signin', icon: 'login' },
    secondary: { label: 'กู้คืนบัญชี', to: '/recover', icon: 'lock_reset' },
  },
  '403': {
    code: 403,
    label: 'Forbidden',
    tone: 'warning',
    icon: 'block',
    title: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้',
    body: 'บัญชีของคุณไม่ได้รับอนุญาตให้เข้าถึงหน้านี้ อาจเพราะเป็นฟีเจอร์ของแพ็กเกจที่สูงกว่า หรือเป็นข้อมูลของแปลงอื่น',
    hints: [
      'ฟีเจอร์จัดการแปลงและรายงานเชิงลึกต้องใช้แพ็กเกจ PRO ขึ้นไป',
      'หากเป็นสมาชิกกลุ่มวิสาหกิจ ให้ติดต่อผู้ดูแลกลุ่มเพื่อขอสิทธิ์เพิ่ม',
    ],
    primary: { label: 'ดูแพ็กเกจและราคา', to: '/pricing', icon: 'workspace_premium' },
    secondary: { label: 'กลับไปหน้าแชท', to: '/chat', icon: 'forum' },
    showSupport: true,
  },
  '404': {
    code: 404,
    label: 'Not Found',
    tone: 'info',
    icon: 'search_off',
    title: 'ไม่พบหน้าที่คุณกำลังมองหา',
    body: 'หน้านี้อาจถูกย้าย เปลี่ยนชื่อ หรือลิงก์ที่คุณใช้อาจพิมพ์ผิด ลองเริ่มจากหน้าหลักหรือค้นหาสิ่งที่ต้องการได้เลย',
    hints: [
      'ตรวจสอบว่าลิงก์ที่คัดลอกมาครบถ้วนหรือไม่',
      'ใช้ช่องค้นหาด้านบนเพื่อหาโรคพืช สายพันธุ์ หรือคู่มือที่ต้องการ',
    ],
    primary: { label: 'กลับไปหน้าแรก', to: '/', icon: 'home' },
    secondary: { label: 'ถาม AI แทน', to: '/chat', icon: 'forum' },
  },
  '409': {
    code: 409,
    label: 'Conflict',
    tone: 'warning',
    icon: 'merge_type',
    title: 'ข้อมูลขัดแย้งกับรายการที่มีอยู่',
    body: 'มีรายการที่ใช้ข้อมูลนี้อยู่แล้วในระบบ เช่น ชื่อแปลงซ้ำ หรือเบอร์โทรศัพท์ที่ลงทะเบียนไว้แล้ว',
    hints: [
      'ลองเปลี่ยนชื่อแปลงให้ไม่ซ้ำกับแปลงเดิม',
      'หากเบอร์โทรนี้เคยลงทะเบียนแล้ว ให้ใช้การกู้คืนบัญชีแทนการสมัครใหม่',
    ],
    primary: { label: 'กู้คืนบัญชีเดิม', to: '/recover', icon: 'lock_reset' },
    secondary: { label: 'แก้ไขข้อมูลใหม่', to: '/settings', icon: 'edit' },
  },
  '422': {
    code: 422,
    label: 'Unprocessable Entity',
    tone: 'warning',
    icon: 'image_not_supported',
    title: 'ไม่สามารถประมวลผลข้อมูลนี้ได้',
    body: 'รูปแบบข้อมูลถูกต้อง แต่เนื้อหาไม่ผ่านเกณฑ์ที่ระบบต้องการ เช่น ภาพไม่ชัดพอให้ AI วิเคราะห์ได้',
    hints: [
      'ถ่ายภาพใบในระยะ 20–30 ซม. ให้เห็นรอยโรคชัดเจน',
      'ถ่ายในแสงธรรมชาติช่วงเช้า หลีกเลี่ยงแสงย้อนและเงาทับ',
      'หลีกเลี่ยงภาพเบลอ ภาพมืด หรือภาพที่มีวัตถุอื่นบังใบ',
    ],
    primary: { label: 'ถ่ายภาพใหม่', to: '/chat', icon: 'photo_camera' },
    secondary: { label: 'ดูคู่มือการถ่ายภาพ', to: '/diseases', icon: 'menu_book' },
  },
  '429': {
    code: 429,
    label: 'Too Many Requests',
    tone: 'warning',
    icon: 'hourglass_top',
    title: 'คุณใช้งานถี่เกินกำหนด',
    body: 'ระบบจำกัดจำนวนคำขอเพื่อรักษาความเร็วให้ผู้ใช้งานทุกคน กรุณารอสักครู่แล้วลองใหม่อีกครั้ง',
    hints: [
      'แพ็กเกจเริ่มต้นจำกัดการสแกน 10 ครั้งต่อเดือน',
      'อัปเกรดเป็น PRO เพื่อสแกนวินิจฉัยโรคได้ไม่จำกัด',
      'โควตาจะรีเซ็ตอัตโนมัติในอีก 14 นาที',
    ],
    primary: { label: 'อัปเกรดเป็น PRO', to: '/pricing', icon: 'workspace_premium' },
    secondary: { label: 'กลับไปหน้าแชท', to: '/chat', icon: 'forum' },
  },
  '500': {
    code: 500,
    label: 'Internal Server Error',
    tone: 'error',
    icon: 'error',
    title: 'ระบบขัดข้องชั่วคราว',
    body: 'เกิดข้อผิดพลาดภายในระบบของเรา ไม่ใช่ความผิดของคุณ ทีมงานได้รับแจ้งอัตโนมัติและกำลังเร่งแก้ไขแล้ว',
    hints: [
      'ข้อมูลและภาพถ่ายของคุณยังคงปลอดภัย ไม่สูญหาย',
      'ลองรีเฟรชหน้าอีกครั้งในอีก 1–2 นาที',
    ],
    primary: { label: 'ลองใหม่อีกครั้ง', to: '/chat', icon: 'refresh' },
    secondary: { label: 'ดูสถานะระบบ', to: '/status/200', icon: 'monitor_heart' },
    showSupport: true,
  },
  '502': {
    code: 502,
    label: 'Bad Gateway',
    tone: 'error',
    icon: 'cloud_off',
    title: 'การเชื่อมต่อกับเซิร์ฟเวอร์ AI ขัดข้อง',
    body: 'ระบบวิเคราะห์ภาพไม่ตอบสนองชั่วคราว ส่วนอื่นของแอป เช่น ราคาตลาดและคู่มือปลูก ยังใช้งานได้ตามปกติ',
    hints: [
      'ฟีเจอร์วินิจฉัยโรคด้วย AI จะกลับมาใช้งานได้ภายในไม่กี่นาที',
      'ระหว่างนี้สามารถค้นหาโรคจากคลังความรู้ได้',
    ],
    primary: { label: 'ดูคลังความรู้โรคแตงโม', to: '/diseases', icon: 'menu_book' },
    secondary: { label: 'ลองใหม่อีกครั้ง', to: '/chat', icon: 'refresh' },
    showSupport: true,
  },
  '503': {
    code: 503,
    label: 'Service Unavailable',
    tone: 'error',
    icon: 'engineering',
    title: 'ระบบกำลังปรับปรุงชั่วคราว',
    body: 'เรากำลังอัปเดตโมเดลวินิจฉัยโรคให้แม่นยำยิ่งขึ้น ระบบจะกลับมาใช้งานได้ตามปกติในไม่ช้า',
    hints: [
      'กำหนดการปรับปรุง: วันนี้ 02:00 – 04:00 น.',
      'ข้อมูลแปลงและประวัติการวิเคราะห์ของคุณยังอยู่ครบถ้วน',
      'เราจะแจ้งผ่าน LINE ทันทีเมื่อระบบกลับมาใช้งานได้',
    ],
    primary: { label: 'ดูสถานะระบบ', to: '/status/200', icon: 'monitor_heart' },
    secondary: { label: 'กลับไปหน้าแรก', to: '/', icon: 'home' },
    showSupport: true,
  },
};

export const STATUS_CODES = Object.keys(STATUS_PAGES);
