import { describe, expect, it } from 'vitest';
import { DISEASES } from '../data/diseases';
import { MODEL_CLASSES } from './diseaseModel';
import {
  DEFAULT_VISION_ENGINE,
  VISION_ENGINE_NAMES,
  claudeCandidates,
  isHealthyClass,
  mappedClasses,
  resolveDiseaseId,
  unmappedLegacyClasses,
} from './visionEngines';

/**
 * ค่าคงที่เหล่านี้ไม่ใช่เรื่องสไตล์ การจับคู่คลาสผิดตัวหมายถึงหน้าจอแสดงอัตราสาร
 * และค่า PHI ของโรคอื่นให้เกษตรกร ซึ่งเป็นความผิดพลาดที่มีผลต่อผลผลิตจริง
 */

describe('vision engine class mapping', () => {
  it('maps every mapped class onto an id that exists in the catalogue', () => {
    for (const engine of VISION_ENGINE_NAMES) {
      for (const cls of mappedClasses(engine)) {
        const id = resolveDiseaseId(engine, cls);

        expect(id, `${engine}/${cls} จับคู่ไม่ได้`).not.toBeNull();
        expect(
          DISEASES.some((d) => d.id === id),
          `${engine}/${cls} ชี้ไปที่รหัส '${id}' ที่ไม่มีในแคตตาล็อก`,
        ).toBe(true);
      }
    }
  });

  it('leaves no legacy4 disease class unmapped', () => {
    // ถ้าพิมพ์ชื่อคลาสผิดในตารางของ visionEngines.ts คลาสนั้นจะหลุดมาที่นี่
    expect(unmappedLegacyClasses()).toEqual([]);
  });

  it('agrees with the legacy model contract in diseaseModel.ts', () => {
    // สองไฟล์เก็บตารางของ legacy4 ไว้คนละชุดโดยเจตนา เทสต์นี้กันไม่ให้ไหลออกจากกัน
    const legacyDiseaseClasses = MODEL_CLASSES.filter((c) => c !== 'Healthy');

    expect(mappedClasses('legacy4').slice().sort()).toEqual(legacyDiseaseClasses.slice().sort());
  });

  it('treats each engine healthy label as no disease', () => {
    expect(resolveDiseaseId('legacy4', 'Healthy')).toBeNull();
    expect(resolveDiseaseId('wide9', 'healthy')).toBeNull();
    expect(isHealthyClass('legacy4', 'Healthy')).toBe(true);
    expect(isHealthyClass('wide9', 'healthy')).toBe(true);
    // ชื่อคลาสของ engine หนึ่งต้องไม่ถูกตีความด้วยตารางของอีก engine
    expect(isHealthyClass('wide9', 'Healthy')).toBe(false);
    expect(isHealthyClass('legacy4', 'healthy')).toBe(false);
  });

  it('refuses a class it does not know instead of guessing', () => {
    expect(resolveDiseaseId('wide9', 'not_a_class')).toBeNull();
    expect(resolveDiseaseId('legacy4', 'Powdery_Mildew')).toBeNull();
    // claude อาจตอบ unknown เมื่อไม่มีรายการใดตรง ต้องไม่ถูกจับคู่กับโรคใด
    expect(resolveDiseaseId('claude', 'unknown')).toBeNull();
  });

  it('passes a claude class id through only when the catalogue has it', () => {
    expect(resolveDiseaseId('claude', 'anthracnose')).toBe('anthracnose');
    expect(resolveDiseaseId('claude', 'blossom-end-rot')).toBe('blossom-end-rot');
    expect(resolveDiseaseId('claude', 'ไม่มีรหัสนี้')).toBeNull();
  });

  it('defaults to the engine that is calibrated and measured on watermelon photos', () => {
    expect(DEFAULT_VISION_ENGINE).toBe('legacy4');
  });
});

describe('รายการสำรองต้องไม่เสนอ engine ที่เสียเงิน', () => {
  it('FALLBACK_ENGINES มีแต่ engine ที่ไม่มีค่าใช้จ่าย', async () => {
    // รายการนี้ถูกใช้ตอนเรียก GET /engines ไม่สำเร็จ ซึ่งเป็นตอนที่เรา "ไม่รู้"
    // ว่าฝั่งเซอร์วิสเปิด engine ที่เสียเงินไว้หรือไม่ การเดาว่าเปิดไว้แล้วเสนอ
    // ให้ผู้ใช้กด ทำให้เกิดค่าใช้จ่ายโดยไม่มีใครตัดสินใจ หรือได้ error เปล่า ๆ
    const { FALLBACK_ENGINES } = await import('../routes/DiseaseScan');

    const paid = FALLBACK_ENGINES.filter((e) => e.costs_money);
    expect(paid.map((e) => e.name), 'รายการสำรองเสนอ engine ที่เสียเงิน').toEqual([]);
    expect(FALLBACK_ENGINES.length).toBeGreaterThan(0);
  });

  it('ทุกตัวในรายการสำรองระบุ costs_money ไว้ชัดเจน', async () => {
    // undefined จะลอดการกรองด้านบนไปได้ เพราะ falsy เหมือน false
    const { FALLBACK_ENGINES } = await import('../routes/DiseaseScan');

    for (const engine of FALLBACK_ENGINES) {
      expect(typeof engine.costs_money, `${engine.name} ไม่ได้ระบุ costs_money`).toBe('boolean');
    }
  });
});

describe('claude candidate list', () => {
  it('covers the whole catalogue', () => {
    expect(claudeCandidates()).toHaveLength(DISEASES.length);
  });

  it('never leaks a chemical rate or pre-harvest interval to the model', () => {
    // system prompt ฝั่งเซอร์วิสห้ามโมเดลเขียนอัตราสารออกมา การไม่ส่งตัวเลขเหล่านั้น
    // ไปให้เห็นตั้งแต่ต้นคือด่านที่สอง ถ้าโมเดลไม่เคยเห็น มันก็ลอกออกมาไม่ได้
    const rateMarkers = ['ต่อน้ำ 20 ลิตร', 'PHI', 'ระยะเก็บเกี่ยวปลอดภัย', 'กรัม ต่อน้ำ', 'มล. ต่อน้ำ'];

    for (const candidate of claudeCandidates()) {
      const blob = `${candidate.name} ${candidate.cues}`;
      for (const marker of rateMarkers) {
        expect(blob, `${candidate.id} ส่งข้อมูลอัตราสารไปให้โมเดล`).not.toContain(marker);
      }
    }
  });

  it('sends exactly three fields — ไม่ให้ฟิลด์ใหม่ติดไปด้วย', () => {
    // การตรวจคำต้องห้ามด้านบนจับได้เฉพาะคำที่เรานึกออก ส่วนการตรึงชุดคีย์จับได้ทุกฟิลด์
    // ที่ถูกเพิ่มเข้ามาในอนาคต รวมถึงฟิลด์ที่ยังไม่มีใครตั้งชื่อ เช่นถ้า diseases.ts
    // เพิ่ม chemicalControl แล้วมีคนส่ง ...d เข้าไป เทสต์นี้จะฟ้องทันที
    for (const candidate of claudeCandidates()) {
      expect(Object.keys(candidate).sort(), `${candidate.id} ส่งฟิลด์เกิน`).toEqual([
        'cues',
        'id',
        'name',
      ]);
    }
  });

  it('keeps each candidate small enough to stay affordable', () => {
    for (const candidate of claudeCandidates()) {
      expect(candidate.cues.length, `${candidate.id} มีข้อความยาวเกินไป`).toBeLessThanOrEqual(220);
      expect(candidate.id.trim()).not.toBe('');
      expect(candidate.name.trim()).not.toBe('');
    }
  });
});
