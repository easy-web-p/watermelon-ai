import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import rawMetrics from '../../fastapi_service/metrics.json';
import { MODEL_CLASSES } from '../lib/diseaseModel';

/**
 * กันไม่ให้หน้าจอตอบชื่อสารเคมีในเส้นทางที่ยังไม่ได้วิเคราะห์ภาพ
 *
 * เทสต์นี้อ่านซอร์สแทนการ render เพราะสิ่งที่ต้องป้องกันคือ "ข้อความที่เขียนฝังไว้
 * ในโค้ด" ไม่ใช่พฤติกรรมตอน runtime ของกรณีใดกรณีหนึ่ง การ render ครอบได้เฉพาะ
 * เส้นทางที่เทสต์เดินผ่าน ส่วนการอ่านซอร์สครอบทุกสาขาในไฟล์
 *
 * ที่มา: `ChatAssistant.tsx` เคยตอบว่า "น้องแตงโม AI ได้รับภาพตัวอย่างแล้วครับ"
 * แล้วแจกชื่อสาร 5 ตัวพร้อมค่า PHI เมื่อ backend เรียกไม่ได้ ทั้งที่ภาพไม่เคยถูก
 * ส่งไปที่โมเดลเลย เป็นความผิดพลาดชนิดเดียวกับที่ `fastapi_service/main.py`
 * อธิบายไว้ว่าเซอร์วิสเวอร์ชันเก่าตอบด้วย `random.choices()` ซึ่ง "ทำให้เกษตรกร
 * พ่นสารที่เลือกมาด้วยเครื่องสุ่มตัวเลข"
 *
 * กฎที่บังคับ: ชื่อสารออกฤทธิ์ปรากฏในหน้าจอได้เฉพาะเมื่อมาจากแคตตาล็อก
 * (`src/data/diseases.ts`) ผ่านผลวิเคราะห์จริง ไม่ใช่เขียนฝังไว้ใน .tsx
 */

const ROOT = join(import.meta.dirname, '..', '..');

/**
 * อ่านซอร์สโดยตัดคอมเมนต์ออก
 *
 * กฎที่เทสต์นี้บังคับเป็นเรื่องของ "ข้อความที่ผู้ใช้เห็น" ไม่ใช่คอมเมนต์
 * คอมเมนต์ที่อธิบายว่าเวอร์ชันก่อนหน้าผิดพลาดอย่างไรมีค่าและต้องเขียนได้
 * ถ้าไม่ตัดออก คอมเมนต์ที่ยกข้อความเก่ามาอ้างจะทำให้เทสต์ฟ้องผิด
 */
function sourceWithoutComments(relative: string): string {
  return readFileSync(join(ROOT, relative), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** ชื่อสามัญของสารออกฤทธิ์ที่ใช้ในแคตตาล็อก ถ้าโผล่ใน .tsx คือถูกเขียนฝังไว้ */
const ACTIVE_INGREDIENTS = [
  'แมนโคเซบ',
  'อะซ็อกซีสโตรบิน',
  'อะซอกซีสโตรบิน',
  'ไดเมโทมอร์ฟ',
  'ไดฟีโนโคนาโซล',
  'คลอโรทาโลนิล',
  'โพรพิเนบ',
  'คาร์เบนดาซิม',
  'เมทาแลกซิล',
  'ไซมอกซานิล',
  'สไปนีโทแรม',
  'ไดโนทีฟูแรน',
  'อิมิดาคลอพริด',
  'อะบาเมกติน',
  'โพรพาร์ไกต์',
  'เฮกซีไทอะซ็อกซ์',
  'สเตรปโตมัยซิน',
  'ฟิโพรนิล',
  'โพรคลอราซ',
];

/** หน้าจอที่รับภาพจากผู้ใช้แล้วตอบผลวิเคราะห์ */
const SCREENS_THAT_ANALYSE_PHOTOS = [
  'src/routes/ChatAssistant.tsx',
  'src/routes/DiseaseScan.tsx',
  'src/routes/Landing.tsx',
  'src/routes/SweetnessScanner.tsx',
];

describe('หน้าจอต้องไม่กุผลวินิจฉัยเมื่อวิเคราะห์ภาพไม่ได้', () => {
  it.each(SCREENS_THAT_ANALYSE_PHOTOS)('%s ไม่มีชื่อสารออกฤทธิ์เขียนฝังไว้', (relative) => {
    const source = sourceWithoutComments(relative);
    const found = ACTIVE_INGREDIENTS.filter((name) => source.includes(name));

    expect(
      found,
      `${relative} มีชื่อสารเขียนฝังไว้ (${found.join(', ')}) — ` +
        'ชื่อสารต้องมาจากแคตตาล็อกผ่านผลวิเคราะห์จริงเท่านั้น ' +
        'การเขียนฝังไว้ทำให้หน้าจอแนะนำสารได้แม้ยังไม่ได้ดูภาพ',
    ).toEqual([]);
  });

  it('ChatAssistant ไม่อ้างว่าได้รับภาพแล้วในเส้นทางที่วิเคราะห์ไม่สำเร็จ', () => {
    const source = sourceWithoutComments('src/routes/ChatAssistant.tsx');

    // ข้อความที่สื่อว่าภาพถูกประมวลผลแล้ว ต้องไม่อยู่ในสาขา offline
    expect(source).not.toContain('ได้รับภาพตัวอย่างแล้ว');
    // คำว่าพรีวิวไม่ควรถูกใช้กลบความจริงว่าระบบวิเคราะห์ไม่ได้
    expect(source).not.toContain('โหมดคลาวด์พรีวิว — สรุปแนวทางตรวจวินิจฉัย');
  });

  it('ไม่ถอยไปใช้เครื่องยนต์อื่นเงียบ ๆ เมื่อผู้ใช้เลือกไว้แล้ว', () => {
    const source = sourceWithoutComments('src/routes/ChatAssistant.tsx');

    // การกลืน error ลง console แล้วเดินต่อ ทำให้ผู้ใช้เข้าใจว่าผลมาจากเครื่องยนต์
    // ที่เลือก ทั้งที่มาจากอีกเส้นทางซึ่งตีความความมั่นใจต่างกัน
    expect(source).not.toContain('falling back to standard');
  });

  it.each(SCREENS_THAT_ANALYSE_PHOTOS)('%s ไม่ใช้ heuristic แทนผล AI เมื่อเรียกไม่สำเร็จ', (relative) => {
    const source = sourceWithoutComments(relative);
    expect(source).not.toContain('runClientDiseaseAnalysis');
  });

  it('เส้นทางวินิจฉัยหลักตรึง legacy4 และปฏิเสธ engine อื่น', () => {
    const server = sourceWithoutComments('server.ts');
    expect(server).toContain('imageBase64, engine: "legacy4"');
    expect(server).toContain('engine !== undefined && engine !== "legacy4"');
  });

  it('แชทไม่ปล่อยคำตอบกฎที่มีตัวเลขหรือราคาฝังไว้แทนโมเดลจริง', () => {
    const server = sourceWithoutComments('server.ts');
    expect(server).not.toContain('replyText = generateWatermelonAIExpertResponse');
    expect(server).toContain('code: "CHAT_MODEL_DISABLED"');
  });

  it('หน้าประเมิน AI ใช้ผลวัดจริงแทนตัวเลขตัวอย่าง', () => {
    const source = sourceWithoutComments('src/routes/AiEvaluation.tsx');
    expect(source).toContain('MODEL_SUMMARY.accuracy');
    expect(source).toContain('MODEL_METRICS[modelClass]');
    for (const fabricated of ['1,200', '94.2%', 'R² = 0.84', 'ECE 0.042', 'Gummy Stem Blight']) {
      expect(source).not.toContain(fabricated);
    }
    expect(rawMetrics.classes).toEqual([...MODEL_CLASSES]);
    expect(rawMetrics.test.confusion_matrix.flat().reduce((sum, count) => sum + count, 0))
      .toBe(rawMetrics.split_counts.test);
  });
});
