/**
 * การเลือกเครื่องยนต์วิเคราะห์ภาพ และการจับคู่คลาสของแต่ละตัวกับรหัสโรคในแคตตาล็อก
 *
 * ทำไมต้องแยกไฟล์จาก `diseaseModel.ts`:
 * `diseaseModel.ts` เป็นสัญญาของโมเดลตัวเดิม (`MODEL_CLASSES` 4 คลาส) ซึ่งคอมโพเนนต์
 * และเทสต์หลายที่พึ่งพาอยู่ ถ้าขยายไฟล์นั้นให้รองรับหลาย engine จะต้องแก้ของเดิม
 * ไฟล์นี้จึงเพิ่มเข้ามาแบบไม่แตะสัญญาเก่า
 *
 * ทำไมต้องมีหลาย engine:
 * ไม่มีตัวใดดีกว่าอีกตัวในทุกงาน `legacy4` ปรับเทียบความน่าจะเป็นแล้วและวัดผลบน
 * ภาพใบแตงโมจริง แต่ตรวจได้ 4 คลาส ภาพราแป้งจึงถูกบังคับให้ตอบคลาสที่ใกล้ที่สุด
 * ส่วน `wide9` ครอบคลุม 9 คลาสและตรวจราแป้งได้ แต่ยังไม่ปรับเทียบ และบางคลาส
 * เทรนจากภาพโรคของพืชอื่น ส่วน `claude` อ่านอาการนอกรายการคลาสได้และอธิบายเหตุผลได้
 * แต่ไม่มีตัวเลขความแม่นยำบนชุดทดสอบให้อ้างอิง
 *
 * กฎที่ไฟล์นี้ต้องรักษา: ชื่อคลาสที่ engine คืนมาเป็นป้ายของโมเดลตามที่เทรนมา
 * ส่วนข้อมูลเชิงเกษตร (ชื่อไทย อัตราสาร ค่า PHI) มาจากแคตตาล็อกที่เดียวเท่านั้น
 * ฝั่ง Python ไม่รู้จักข้อมูลเหล่านั้นเลย
 */

import { DISEASES } from '../data/diseases';
import { MODEL_CLASSES, type ModelClass } from './diseaseModel';

export const VISION_ENGINE_NAMES = ['legacy4', 'wide9', 'claude'] as const;
export type VisionEngineName = (typeof VISION_ENGINE_NAMES)[number];

/** ค่าเริ่มต้นตรงกับฝั่งเซอร์วิส: ตัวที่ปรับเทียบแล้วและวัดผลบนภาพแตงโมจริง */
export const DEFAULT_VISION_ENGINE: VisionEngineName = 'legacy4';

/** ข้อมูล engine หนึ่งตัวตามที่ `GET /engines` ของเซอร์วิสคืนมา */
export type VisionEngineInfo = {
  name: string;
  title_th: string;
  classes: readonly string[];
  class_count: number;
  image_size: number;
  model_version: string;
  description_th: string;
  good_for_th: readonly string[];
  limits_th: readonly string[];
  calibrated: boolean;
  needs_candidates: boolean;
  class_provenance: Record<string, { tier: string; note_th: string }>;
  metrics: Record<string, unknown>;
};

export type VisionEngineList = {
  default: string;
  engines: readonly VisionEngineInfo[];
  note: string;
};

/**
 * คลาสของ `legacy4` → รหัสโรคในแคตตาล็อก
 *
 * ซ้ำกับ `CLASS_TO_DISEASE_ID` ใน `diseaseModel.ts` โดยเจตนา เพราะที่นั่นเป็น
 * สัญญาของโมเดลเดิมที่ห้ามเปลี่ยน ที่นี่เป็นตารางรวมของทุก engine
 * เทสต์ `visionEngines.test.ts` บังคับให้สองตารางนี้ตรงกันเสมอ
 */
const LEGACY4_TO_DISEASE_ID: Record<string, string> = {
  Anthracnose: 'anthracnose',
  Downy_Mildew: 'downy-mildew',
  Mosaic_Virus: 'watermelon-mosaic-virus',
};

/**
 * คลาสของ `wide9` → รหัสโรคในแคตตาล็อก
 *
 * ป้ายของโมเดลเป็น snake_case ตามโฟลเดอร์ที่เทรน ส่วนแคตตาล็อกใช้ kebab-case
 * `healthy` ไม่จับคู่กับโรคใด เหมือน `Healthy` ของ legacy4
 */
const WIDE9_TO_DISEASE_ID: Record<string, string> = {
  alternaria_blight: 'alternaria-blight',
  angular_leaf_spot: 'angular-leaf-spot',
  cercospora_leaf_spot: 'cercospora-leaf-spot',
  downy_mildew: 'downy-mildew',
  leaf_curl_virus: 'leaf-curl-virus',
  phytophthora_blight: 'phytophthora-blight',
  powdery_mildew: 'powdery-mildew',
  watermelon_mosaic_virus: 'watermelon-mosaic-virus',
};

/** คลาสที่หมายถึง "ไม่พบโรค" ของแต่ละ engine */
const HEALTHY_CLASS: Record<VisionEngineName, string | null> = {
  legacy4: 'Healthy',
  wide9: 'healthy',
  claude: null,
};

export function isHealthyClass(engine: VisionEngineName, classId: string): boolean {
  return HEALTHY_CLASS[engine] === classId;
}

/**
 * แปลงคลาสที่ engine คืนมาให้เป็นรหัสโรคในแคตตาล็อก
 *
 * คืน `null` เมื่อเป็นคลาสใบปกติ หรือเมื่อ engine ตอบคลาสที่ยังไม่มีในแคตตาล็อก
 * **ต้องไม่เดา** การจับคู่ผิดตัวหมายถึงแสดงอัตราสารของโรคอื่นให้เกษตรกร
 */
export function resolveDiseaseId(engine: VisionEngineName, classId: string): string | null {
  if (isHealthyClass(engine, classId)) return null;

  // claude เลือกจากรายการรหัสที่เราส่งไปให้ จึงคืนรหัสแคตตาล็อกมาตรง ๆ อยู่แล้ว
  // แต่ยังต้องตรวจว่ามีอยู่จริง เพราะโมเดลอาจตอบ 'unknown' หรือรหัสที่พิมพ์เพี้ยน
  const candidate =
    engine === 'claude'
      ? classId
      : engine === 'wide9'
        ? WIDE9_TO_DISEASE_ID[classId]
        : LEGACY4_TO_DISEASE_ID[classId];

  if (!candidate) return null;
  return DISEASES.some((d) => d.id === candidate) ? candidate : null;
}

/** คลาสทั้งหมดของ engine ที่จับคู่กับแคตตาล็อกได้ ใช้ในเทสต์และหน้าขอบเขตการตรวจ */
export function mappedClasses(engine: VisionEngineName): readonly string[] {
  if (engine === 'legacy4') return Object.keys(LEGACY4_TO_DISEASE_ID);
  if (engine === 'wide9') return Object.keys(WIDE9_TO_DISEASE_ID);
  return [];
}

/**
 * รายการโรคที่ส่งให้ engine `claude` เลือก
 *
 * ส่งเฉพาะรหัสและชื่อ ไม่ส่งอัตราสารหรือค่า PHI เพราะโมเดลไม่ต้องใช้
 * และการให้โมเดลเห็นตัวเลขเหล่านั้นเปิดช่องให้มันเขียนตัวเลขออกมาเอง
 * ซึ่งเป็นสิ่งที่ system prompt ฝั่งเซอร์วิสห้ามไว้
 */
export function claudeCandidates(): readonly { id: string; name: string; cues: string }[] {
  return DISEASES.map((d) => ({
    id: d.id,
    name: d.name,
    // อาการย่อ ๆ ช่วยให้โมเดลแยกโรคที่ชื่อใกล้กันได้ แต่ไม่ยาวจนกินโทเคน
    cues: d.symptoms.slice(0, 2).join(' / ').slice(0, 220),
  }));
}

/** คลาสของ legacy4 ที่ยังไม่ได้จับคู่ ใช้กันการพิมพ์ชื่อคลาสผิดในตารางด้านบน */
export function unmappedLegacyClasses(): readonly ModelClass[] {
  return MODEL_CLASSES.filter(
    (c) => c !== 'Healthy' && !LEGACY4_TO_DISEASE_ID[c],
  );
}
