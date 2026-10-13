import { describe, expect, it } from 'vitest';
import {
  isAgronomyQuestion,
  knowledgeInstructions,
  knowledgeSources,
  KNOWLEDGE_CARDS,
  retrieveKnowledge,
} from '../../server-knowledge';

describe('reviewed knowledge for local chat', () => {
  it('routes fertilizer questions to soil testing and nutrient evidence', () => {
    const cards = retrieveKnowledge('ปุ๋ยสูตร 15-15-15 ใส่แตงโมเท่าไรถ้ายังไม่ตรวจดิน');
    expect(cards.map((card) => card.id)).toContain('watermelon-nutrition');
    expect(cards.map((card) => card.id)).toContain('soil-test-npk');
    expect(knowledgeInstructions(cards)).toContain('ห้ามยกอัตราปุ๋ยหรือสารเคมีจากแหล่งต่างประเทศ');
    expect(knowledgeSources(cards)).toContain('https://edis.ifas.ufl.edu/publication/SS735/pdf');
  });

  it('distinguishes the two mildews and does not fabricate a hit for unknown pests', () => {
    expect(retrieveKnowledge('ใบมีผงขาว อาจเป็นราแป้งไหม')[0]?.id).toBe('cucurbit-powdery-mildew');
    expect(retrieveKnowledge('ราน้ำค้างมีแผลเหลี่ยมและขุยใต้ใบ')[0]?.id).toBe('cucurbit-downy-mildew');
    expect(retrieveKnowledge('เพลี้ยไฟควรใช้สารอะไร')).toEqual([]);
    expect(isAgronomyQuestion('เพลี้ยไฟควรใช้สารอะไร')).toBe(true);
  });

  it('keeps only official evidence without application doses or product names', () => {
    expect(KNOWLEDGE_CARDS.every((card) => card.url.startsWith('https://'))).toBe(true);
    expect(KNOWLEDGE_CARDS.map((card) => card.facts).join(' ')).not.toMatch(/ก\.\s*\/\s*น้ำ|มล\.\s*\/\s*น้ำ/);
    expect(retrieveKnowledge('สวัสดีครับ')).toEqual([]);
    expect(knowledgeSources([])).toBe('');
  });
});
