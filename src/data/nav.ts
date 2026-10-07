/** Routes, grouped the way the sidebar and the marketing nav present them. */

export type NavItem = {
  path: string;
  label: string;
  icon: string;
  /** Icon tint — mirrors the three-tone accent rhythm in the sidebar. */
  tone: 'primary' | 'secondary' | 'tertiary';
};

export const PRIMARY_NAV: readonly NavItem[] = [
  { path: '/chat', label: 'แชทปรึกษา AI', icon: 'forum', tone: 'primary' },
  { path: '/disease-scan', label: 'ตรวจโรคใบด้วย AI', icon: 'biotech', tone: 'secondary' },
  { path: '/scanner', label: 'ตรวจวัดความหวาน & วิเคราะห์สายพันธุ์', icon: 'document_scanner', tone: 'tertiary' },
  { path: '/cultivation', label: 'คู่มือปลูก & ดูแลรักษา', icon: 'potted_plant', tone: 'primary' },
  { path: '/market', label: 'เช็กราคาตลาดแตงโมวันนี้', icon: 'trending_up', tone: 'secondary' },
  { path: '/fertilizer', label: 'ปุ๋ย & สารอารักขาพืช', icon: 'science', tone: 'tertiary' },
  { path: '/recipes', label: 'สูตรเครื่องดื่ม & ขนมแตงโม', icon: 'local_bar', tone: 'primary' },
  { path: '/settings', label: 'การตั้งค่าระบบ & บัญชี', icon: 'settings', tone: 'secondary' },
] as const;

export const SECONDARY_NAV: readonly NavItem[] = [
  { path: '/diseases', label: 'โรคแตงโมที่รองรับ', icon: 'coronavirus', tone: 'secondary' },
  { path: '/evaluation', label: 'ผลการวัดผลโมเดล AI', icon: 'insights', tone: 'primary' },
  { path: '/plots', label: 'จัดการแปลงเพาะปลูก', icon: 'map', tone: 'tertiary' },
  { path: '/alerts', label: 'แจ้งเตือนผ่าน LINE', icon: 'notifications_active', tone: 'secondary' },
] as const;

export type ChatHistoryItem = { id: string; title: string };

export const RECENT_CHATS: readonly ChatHistoryItem[] = [
  { id: 'tapping-sound', title: 'วิธีเลือกแตงโมเคาะแล้วเสียงแน่น' },
  { id: 'torpedo-vs-kinnaree', title: 'แตงโมตอร์ปิโด vs กินรี แตกต่างกันอย่างไร' },
  { id: 'rain-cracked-fruit', title: 'แก้ปัญหาแตงโมไส้แตกช่วงฝนตก' },
  { id: 'royal-dried-fish', title: 'สูตรแตงโมปลาแห้งชาววัง' },
] as const;

/** Links in the marketing header and footer. */
export const MARKETING_NAV: readonly { path: string; label: string }[] = [
  { path: '/', label: 'หน้าแรก' },
  { path: '/chat', label: 'แชท' },
  { path: '/settings', label: 'ตั้งค่า' },
  { path: '/evaluation', label: 'การวัดผล AI' },
  { path: '/diseases', label: 'โรคแตงโมที่รองรับ' },
  { path: '/about', label: 'ข้อมูลเกี่ยวกับเรา' },
  { path: '/pricing', label: 'ราคา' },
] as const;

