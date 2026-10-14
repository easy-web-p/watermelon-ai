import { describe, expect, it, vi } from 'vitest';
import { analysePixels, regionTissueFraction } from '../lib/browserLeafcheck';
import { AcousticUnmeasurable, analyse as analyseKnock } from '../lib/browserAcousticEngine';
import { aggregateRegions } from '../lib/browserVisionEngine';
import { ensurePhiDisclosure, reply } from '../lib/statelessChatEngine';
import { DISEASE_HISTORY_STORAGE_KEY, getLocalDiseaseHistory } from '../lib/chatHistory';
import type { ModelClass } from '../lib/diseaseModel';

function pixels(width: number, height: number, color: (x: number, y: number) => [number, number, number]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const [r, g, b] = color(x, y), offset = (y * width + x) * 4;
    data.set([r, g, b, 255], offset);
  }
  return { data, width, height, colorSpace: 'srgb' } as ImageData;
}

describe('browser leaf quality', () => {
  it('accepts a sharp green leaf and measures tissue', () => {
    const image = pixels(256, 256, (x, y) => (x + y) % 2 ? [44, 150, 40] : [65, 185, 50]);
    const { quality, lesions } = analysePixels(image);
    expect(quality.verdict).toBe('usable');
    expect(lesions.measured).toBe(true);
    expect(lesions.healthy_fraction).toBe(1);
    expect(regionTissueFraction(image)).toBe(1);
  });
  it('rejects an underexposed frame without inventing a lesion share', () => {
    const { quality, lesions } = analysePixels(pixels(256, 256, () => [15, 20, 14]));
    expect(quality.verdict).toBe('unusable');
    expect(quality.reasons[0]).toContain('ภาพมืดเกินไป');
    expect(lesions.measured).toBe(false);
  });
  it('marks a small leaf within a clear frame marginal', () => {
    const { quality } = analysePixels(pixels(256, 256, (x, y) => x < 52 ? ((x + y) % 2 ? [44, 150, 40] : [65, 185, 50]) : [95, 95, 95]));
    expect(quality.verdict).toBe('marginal');
    expect(quality.leaf_fraction).toBeGreaterThan(.12);
    expect(quality.leaf_fraction).toBeLessThan(.28);
  });
});

function knock(frequency: number, rate = 16000) {
  const samples = new Float32Array(rate * 2);
  for (const start of [.3, .9, 1.5]) for (let i = 0; i < rate * .11; i++) {
    const elapsed = i / rate;
    samples[Math.floor(start * rate) + i] += .7 * Math.exp(-elapsed * 38) * Math.sin(2 * Math.PI * frequency * elapsed);
  }
  return samples;
}
describe('browser acoustic measurements', () => {
  it('refuses a short and a clipped recording', () => {
    expect(() => analyseKnock({ samples: new Float32Array(100), sampleRate: 16000 })).toThrow(AcousticUnmeasurable);
    expect(() => analyseKnock({ samples: new Float32Array(16000).fill(1), sampleRate: 16000 })).toThrow('สัญญาณล้น');
  });
  it('measures resonance and computes stiffness only from supplied mass', () => {
    const result = analyseKnock({ samples: knock(250), sampleRate: 16000, massKg: 4 });
    expect(result.reading.dominant_frequency_hz).toBeCloseTo(250, -1);
    expect(result.reading.stiffness_index).toBeCloseTo(result.reading.dominant_frequency_hz ** 2 * 4 ** (2 / 3), -3);
    expect(result.reading.brix_estimate).toBeNull();
    expect(result.reading.maturity_grade).toBeNull();
  });
  it('rejects a high-frequency knock outside the resonance band', () => {
    expect(() => analyseKnock({ samples: knock(1600), sampleRate: 16000 })).toThrow(AcousticUnmeasurable);
  });
});

const scores = (winner: ModelClass, value: number) => ({ Anthracnose: 0, Downy_Mildew: 0, Healthy: 0, Mosaic_Virus: 0, [winner]: value });
const region = (name: string, class_id: ModelClass, confidence: number, tissue_fraction = 1) => ({ name, class_id, confidence, tissue_fraction, box: [0, 0, 1, 1] as [number, number, number, number], scores: scores(class_id, confidence), views: 1 });
describe('vision aggregation', () => {
  it('escalates healthy only for a disease crop with enough tissue', () => {
    const result = aggregateRegions([region('full', 'Healthy', .91), region('q-tl', 'Downy_Mildew', .85, .6)]);
    expect(result.verdict.class_id).toBe('Downy_Mildew');
    expect(result.aggregation.escalated_from_healthy).toBe(true);
  });
  it('never downgrades a full-frame disease, and suppresses low-tissue crops', () => {
    expect(aggregateRegions([region('full', 'Anthracnose', .75), region('q-tl', 'Healthy', .99)]).verdict.class_id).toBe('Anthracnose');
    expect(aggregateRegions([region('full', 'Healthy', .91), region('q-tl', 'Downy_Mildew', .9, .1)]).verdict.class_id).toBe('Healthy');
  });
  it('refuses missing model metadata rewritten as HTML', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>app</html>', { status: 200, headers: { 'content-type': 'text/html' } })));
    await expect(import('../lib/browserVisionEngine').then((engine) => engine.modelStatus())).rejects.toThrow('โหลด /models/model.onnx.json ไม่สำเร็จ');
    vi.unstubAllGlobals();
  });
});

describe('stateless chat safety', () => {
  it('suppresses unverified chemical advice and retains the AI disclaimer', () => {
    expect(ensurePhiDisclosure('ฉีดพ่นแมนโคเซบพรุ่งนี้')).toContain('PHI');
    expect(ensurePhiDisclosure('ฉีดพ่นแมนโคเซบพรุ่งนี้')).not.toContain('พรุ่งนี้');
  });
  it('answers a measurement boundary without a key or backend session', async () => {
    const answer = await reply({ content: 'เสียงเคาะบอก Brix ได้ไหม', history: [] });
    expect(answer.content).toContain('Brix');
    expect(answer.content).toContain('AI เป็นเครื่องมือช่วยตัดสินใจ');
  });
  it('falls back to reviewed knowledge without hallucinating when no key is set', async () => {
    const answer = await reply({ content: 'อาการโรคพืชในแปลงแยกแยะอย่างไร', history: [] });
    expect(answer.content).toContain('Penn State Extension');
    expect(answer.content).toContain('AI เป็นเครื่องมือช่วยตัดสินใจ');
    expect(answer.modelVersion).toBe('reviewed-knowledge');
  });
});

describe('strict local history reads', () => {
  it('reports corrupt scan history instead of claiming it is empty', () => {
    localStorage.setItem(DISEASE_HISTORY_STORAGE_KEY, '{broken');
    expect(() => getLocalDiseaseHistory(true)).toThrow('อ่านประวัติผลสแกน');
    localStorage.removeItem(DISEASE_HISTORY_STORAGE_KEY);
  });
});

describe('browser leafcheck edge cases', () => {
  it('rejects an overexposed/clipped frame', () => {
    const { quality } = analysePixels(pixels(256, 256, () => [255, 255, 255]));
    expect(quality.verdict).toBe('unusable');
    expect(quality.reasons[0]).toContain('ภาพสว่างจัดเกินไป');
  });

  it('rejects an image with no leaf tissue in frame', () => {
    const { quality } = analysePixels(pixels(256, 256, () => [80, 80, 80]));
    expect(quality.verdict).toBe('unusable');
    expect(quality.reasons[0]).toContain('ไม่พบเนื้อใบในภาพ');
  });

  it('rejects an all-brown frame with no living green tissue', () => {
    // Brown color (soil or bench): hue in necrotic range, saturation > 40, value > 28, but 0 green
    const { quality } = analysePixels(pixels(256, 256, () => [120, 50, 20]));
    expect(quality.verdict).toBe('unusable');
    expect(quality.reasons[0]).toContain('ไม่มีเนื้อใบสีเขียวเลย');
  });

  it('rejects a blurry frame with focus below threshold', () => {
    // Uniform green without high-frequency contrast (smooth gradient or flat color)
    const { quality } = analysePixels(pixels(256, 256, () => [60, 160, 50]));
    expect(quality.focus_score).toBeLessThan(18);
    expect(quality.verdict).toBe('unusable');
    expect(quality.reasons[0]).toContain('ภาพเบลอเกินกว่าจะอ่านแผลได้');
  });

  it('warns about low resolution image under 224px', () => {
    const { quality } = analysePixels(pixels(120, 120, (x, y) => (x + y) % 2 ? [44, 150, 40] : [65, 185, 50]), 120, 120);
    expect(quality.reasons.some((r) => r.includes('รายละเอียดน้อยกว่าที่โมเดลต้องการ'))).toBe(true);
  });
});

describe('browser acoustic validation and edge cases', () => {
  it('rejects sample rate below 8000 Hz', () => {
    expect(() => analyseKnock({ samples: new Float32Array(2000), sampleRate: 4000 })).toThrow('อัตราสุ่ม 4000 Hz ต่ำเกินไป');
  });

  it('rejects unaligned PCM bytes or invalid base64', () => {
    expect(() => analyseKnock({ pcmBase64: '%%%not-valid-base64', sampleRate: 16000 })).toThrow('ถอดรหัส base64');
    // Base64 encoding of 3 bytes (not divisible by 4 bytes per float32)
    expect(() => analyseKnock({ pcmBase64: btoa('abc'), sampleRate: 16000 })).toThrow('ความยาวข้อมูลไม่ลงตัวกับ float32');
  });

  it('rejects PCM with NaN or Infinity', () => {
    const samples = new Float32Array(4000);
    samples[10] = NaN;
    expect(() => analyseKnock({ samples, sampleRate: 16000 })).toThrow('NaN หรือ Infinity');
  });

  it('rejects flat silence with no knock impulses', () => {
    expect(() => analyseKnock({ samples: new Float32Array(16000), sampleRate: 16000 })).toThrow('ไม่พบจังหวะเคาะ');
  });

  it('rejects watermelon mass outside reasonable range', () => {
    expect(() => analyseKnock({ samples: knock(250), sampleRate: 16000, massKg: -2 })).toThrow('อยู่นอกช่วงที่เป็นไปได้');
    expect(() => analyseKnock({ samples: knock(250), sampleRate: 16000, massKg: 35 })).toThrow('อยู่นอกช่วงที่เป็นไปได้');
  });

  it('reports brix and maturity as null with informative Thai explanation', () => {
    const result = analyseKnock({ samples: knock(250), sampleRate: 16000 });
    expect(result.reading.brix_estimate).toBeNull();
    expect(result.reading.brix_unavailable_reason_th).toContain('ยังไม่มีชุดข้อมูลปรับเทียบ');
    expect(result.reading.maturity_grade).toBeNull();
    expect(result.reading.maturity_unavailable_reason_th).toContain('การตัดสินว่าสุกหรือยังต้องเทียบกับเกณฑ์');
  });
});

describe('vision engines and wide9 lazy loading', () => {
  it('visionEngines uses HEAD request and does not download wide9.onnx weights', async () => {
    const fetchCalls: { url: string; method?: string }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      fetchCalls.push({ url, method: init?.method ?? 'GET' });
      if (url === '/models/model.onnx.json') {
        return new Response(JSON.stringify({ classes: ['Anthracnose', 'Downy_Mildew', 'Healthy', 'Mosaic_Virus'], image_size: 224, architecture: 'efficientnet_b0', onnx_sha256: 'abcdef123456789' }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url === '/models/model.onnx') {
        return new Response(null, { status: 200, headers: { 'content-type': 'application/octet-stream', 'content-length': '16000000' } });
      }
      if (url === '/models/calibration.json') {
        return new Response(null, { status: 404 });
      }
      if (url === '/models/wide9.labels.json') {
        return new Response(JSON.stringify({
          labels: ['alternaria_blight', 'angular_leaf_spot', 'cercospora_leaf_spot', 'downy_mildew', 'healthy', 'leaf_curl_virus', 'phytophthora_blight', 'powdery_mildew', 'watermelon_mosaic_virus'],
          input_size: 224,
          class_tiers: { powdery_mildew: 'same_pathogen', angular_leaf_spot: 'symptom_proxy' },
          per_class_recall: { powdery_mildew: 0.96, angular_leaf_spot: 0.61 },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url === '/models/wide9.onnx') {
        // Must be checked with HEAD!
        return new Response(null, { status: 200, headers: { 'content-type': 'application/octet-stream', 'content-length': '17000000' } });
      }
      return new Response(null, { status: 404 });
    }));

    const { visionEngines } = await import('../lib/browserVisionEngine');
    const result = await visionEngines();

    expect(result.default).toBe('legacy4');
    expect(result.engines).toHaveLength(2);
    const wide9 = result.engines.find((e) => e.name === 'wide9');
    expect(wide9).toBeDefined();
    expect(wide9?.calibrated).toBe(false);
    expect(wide9?.costs_money).toBe(false);

    // Verify wide9.onnx was NEVER fetched with GET (no weight download!)
    const wide9Get = fetchCalls.find((c) => c.url === '/models/wide9.onnx' && (!c.method || c.method === 'GET'));
    expect(wide9Get).toBeUndefined();

    // Verify it was checked via HEAD
    const wide9Head = fetchCalls.find((c) => c.url === '/models/wide9.onnx' && c.method === 'HEAD');
    expect(wide9Head).toBeDefined();

    vi.unstubAllGlobals();
  });
});

describe('real sample audio files in public/audio/samples', () => {
  it('measures real audio samples correctly and never fabricates brix/ripeness', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const filePath = path.resolve('public/audio/samples/ripe-sample.wav');
    if (!fs.existsSync(filePath)) return;

    const buf = fs.readFileSync(filePath);
    const sampleRate = buf.readUInt32LE(24);
    const dataOffset = buf.indexOf('data') + 8;
    const numSamples = (buf.length - dataOffset) / 2;
    const samples = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      samples[i] = buf.readInt16LE(dataOffset + i * 2) / 32768.0;
    }

    const result = analyseKnock({ samples, sampleRate, massKg: 3.5 });
    expect(result.ok).toBe(true);
    expect(result.method).toBe('fft-resonance');
    expect(result.reading.dominant_frequency_hz).toBeGreaterThan(60);
    expect(result.reading.dominant_frequency_hz).toBeLessThan(900);
    expect(result.reading.stiffness_index).toBeGreaterThan(0);
    expect(result.reading.brix_estimate).toBeNull();
    expect(result.reading.maturity_grade).toBeNull();
    expect(result.reading.brix_unavailable_reason_th).toContain('ยังไม่มีชุดข้อมูลปรับเทียบ');
    expect(result.reading.maturity_unavailable_reason_th).toContain('การตัดสินว่าสุกหรือยังต้องเทียบกับเกณฑ์');
  });
});
