/** Browser port of fastapi_service/acoustic.py. Measures sound; never estimates Brix. */
import type { AcousticAnalysis, AcousticModelStatus } from './api';

export class AcousticUnmeasurable extends Error { constructor(message: string) { super(message); this.name = 'AcousticUnmeasurable'; } }
const round = (x: number, d = 1) => Number(x.toFixed(d));
const median = (values: number[]) => { const ordered = [...values].sort((a, b) => a - b); const mid = Math.floor(ordered.length / 2); return ordered.length % 2 ? ordered[mid] : (ordered[mid - 1] + ordered[mid]) / 2; };
export function decodePcm(pcmBase64: string): Float32Array {
  let raw: string;
  try { raw = atob(pcmBase64); } catch { throw new AcousticUnmeasurable('ถอดรหัส base64 ของสัญญาณเสียงไม่ได้'); }
  if (!raw.length || raw.length % 4) throw new AcousticUnmeasurable('ความยาวข้อมูลไม่ลงตัวกับ float32 (4 ไบต์ต่อค่า)');
  const bytes = Uint8Array.from(raw, (character) => character.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(bytes.length / 4);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = view.getFloat32(i * 4, true);
    if (!Number.isFinite(samples[i])) throw new AcousticUnmeasurable('สัญญาณมีค่า NaN หรือ Infinity');
  }
  return samples;
}
function envelope(samples: Float32Array, sampleRate: number) {
  const hop = Math.max(1, Math.floor(sampleRate * .002));
  const window = Math.max(hop, Math.floor(sampleRate * .005));
  const count = samples.length >= window ? Math.max(1, 1 + Math.floor((samples.length - window) / hop)) : 1;
  const values = new Array<number>(count);
  for (let i = 0; i < count; i++) {
    let sum = 0, n = 0;
    for (let j = i * hop; j < Math.min(samples.length, i * hop + window); j++) { sum += samples[j] ** 2; n++; }
    values[i] = n ? Math.sqrt(sum / n) : 0;
  }
  return { values, hop };
}
function impulses(samples: Float32Array, sampleRate: number) {
  const { values, hop } = envelope(samples, sampleRate);
  const maximum = Math.max(...values);
  if (maximum <= 0) return [];
  const threshold = Math.max(maximum * .35, median(values) * 4);
  const minGap = Math.max(1, Math.floor(.060 / .002));
  const found: number[] = []; let last = -minGap;
  for (let i = 1; i < values.length; i++) if (values[i] >= threshold && values[i] > values[i - 1] && i - last >= minGap) { found.push(i * hop); last = i; }
  return found;
}
function snrDb(samples: Float32Array, onsets: number[], sampleRate: number) {
  const selected = new Uint8Array(samples.length), span = Math.floor(sampleRate * .12);
  for (const onset of onsets) selected.fill(1, onset, Math.min(samples.length, onset + span));
  let signal = 0, noise = 0, signalCount = 0, noiseCount = 0;
  for (let i = 0; i < samples.length; i++) if (selected[i]) { signal += samples[i] ** 2; signalCount++; } else { noise += samples[i] ** 2; noiseCount++; }
  if (!signalCount || signal <= 0) return 0;
  return 10 * Math.log10((signal / signalCount) / Math.max(noiseCount ? noise / noiseCount : 1e-12, 1e-12));
}
/** Zero-padded radix-2 real FFT. Bin spacing is no worse than the source window. */
function spectrum(window: Float32Array) {
  let size = 1; while (size < window.length) size *= 2;
  const re = new Float64Array(size), im = new Float64Array(size);
  const mean = window.reduce((sum, value) => sum + value, 0) / window.length;
  for (let i = 0; i < window.length; i++) re[i] = (window[i] - mean) * .5 * (1 - Math.cos(2 * Math.PI * i / (window.length - 1)));
  for (let i = 1, j = 0; i < size; i++) {
    let bit = size >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let length = 2; length <= size; length *= 2) {
    const angle = -2 * Math.PI / length;
    for (let base = 0; base < size; base += length) for (let j = 0; j < length / 2; j++) {
      const c = Math.cos(angle * j), s = Math.sin(angle * j), u = base + j, v = u + length / 2;
      const tr = re[v] * c - im[v] * s, ti = re[v] * s + im[v] * c;
      re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti;
    }
  }
  return Array.from({ length: size / 2 + 1 }, (_, i) => Math.hypot(re[i], im[i]));
}
function dominantPeak(window: Float32Array, sampleRate: number) {
  if (window.length < 32) throw new AcousticUnmeasurable('ช่วงสัญญาณหลังจุดกระทบสั้นเกินกว่าจะวิเคราะห์');
  const magnitudes = spectrum(window), binHz = sampleRate / ((magnitudes.length - 1) * 2);
  let bandPower = 0, totalPower = 0, bandSum = 0, bandWeighted = 0;
  const local: { frequency_hz: number; relative_amplitude: number }[] = [];
  let maxBand = 0, maxIndex = 0;
  for (let i = 1; i < magnitudes.length; i++) {
    const hz = i * binHz, magnitude = magnitudes[i];
    if (hz >= 20) totalPower += magnitude ** 2;
    if (hz >= 60 && hz <= 900) {
      bandPower += magnitude ** 2; bandSum += magnitude; bandWeighted += hz * magnitude;
      if (magnitude > maxBand) { maxBand = magnitude; maxIndex = i; }
    }
  }
  if (maxBand <= 0) throw new AcousticUnmeasurable('ไม่พบพลังงานในช่วง 60-900 Hz ซึ่งเป็นช่วงที่ผลแตงโมกำทอน');
  const ratio = totalPower > 0 ? bandPower / totalPower : 0;
  if (ratio < .25) throw new AcousticUnmeasurable(`พลังงานเพียง ${(ratio * 100).toFixed(0)}% อยู่ในช่วง 60-900 Hz ที่ผลแตงโมกำทอน (ต้องการอย่างน้อย 25%) เสียงที่อัดมาน่าจะเป็นการเคาะวัตถุอื่น`);
  for (let i = 1; i < magnitudes.length - 1; i++) if (i * binHz >= 60 && i * binHz <= 900 && magnitudes[i] >= magnitudes[i - 1] && magnitudes[i] > magnitudes[i + 1]) local.push({ frequency_hz: i * binHz, relative_amplitude: magnitudes[i] / maxBand });
  if (!local.length) local.push({ frequency_hz: maxIndex * binHz, relative_amplitude: 1 });
  local.sort((a, b) => b.relative_amplitude - a.relative_amplitude);
  return { dominant: local[0].frequency_hz, peaks: local.slice(0, 4), centroid: bandWeighted / bandSum };
}
function decayTime(samples: Float32Array, sampleRate: number, onset: number) {
  const tail = samples.subarray(onset, onset + Math.floor(sampleRate * .5));
  if (tail.length < 16) return 0;
  const { values, hop } = envelope(tail, sampleRate);
  if (values.length < 2 || values[0] <= 0) return 0;
  const first = values.findIndex((value) => value <= values[0] * .1);
  return first < 0 ? 0 : first * hop / sampleRate * 1000;
}
export function serviceInfo(): NonNullable<AcousticModelStatus['info']> {
  return {
    method: 'การประมวลผลสัญญาณ (FFT) ไม่ใช่โมเดลที่เทรนจากข้อมูล',
    measures_th: ['ความถี่กำทอนเด่น (Hz) จากการเคาะแต่ละครั้ง', 'ดัชนีความแข็ง S = f²·m^(2/3) เมื่อส่งน้ำหนักผลมาด้วย', 'เวลาหน่วงของเสียง (ms) และเซนทรอยด์สเปกตรัม', 'คุณภาพสัญญาณ: จำนวนจังหวะเคาะ สัญญาณล้น และอัตราส่วนต่อเสียงรบกวน'],
    does_not_measure_th: ['ค่าความหวาน (Brix) — ต้องมีชุดข้อมูลปรับเทียบที่จับคู่เสียงกับค่าที่วัดจากผลเดียวกัน', 'คำตัดสินว่าสุกหรือยังสุก — ต้องมีเกณฑ์ที่ปรับเทียบของแต่ละสายพันธุ์'],
    recording_tips_th: ['เคาะด้วยข้อนิ้วกลางผล 3-5 ครั้ง ห่างกันประมาณครึ่งวินาที', 'วางผลบนฝ่ามือหรือพื้นนุ่ม ไม่จับแน่นจนผลสั่นไม่ได้', 'อัดในที่เงียบ ถือไมค์ห่างผลประมาณหนึ่งฝ่ามือ', 'ชั่งน้ำหนักผลเป็นกิโลกรัมส่งมาด้วย เพื่อให้เทียบกับผลอื่นได้'],
  };
}
export function analyse(body: { pcmBase64?: string; samples?: Float32Array; sampleRate: number; massKg?: number }): AcousticAnalysis {
  const { sampleRate, massKg } = body;
  if (!Number.isFinite(sampleRate) || sampleRate < 8000) throw new AcousticUnmeasurable(`อัตราสุ่ม ${sampleRate} Hz ต่ำเกินไป ต้องอย่างน้อย 8000 Hz`);
  const samples = body.samples ?? decodePcm(body.pcmBase64 ?? '');
  if (!samples.length) throw new AcousticUnmeasurable('ไม่มีตัวอย่างเสียงที่วัดได้ในคำขอ');
  if (samples.some((value) => !Number.isFinite(value))) throw new AcousticUnmeasurable('สัญญาณมีค่า NaN หรือ Infinity');
  const duration = samples.length / sampleRate;
  if (duration < .2) throw new AcousticUnmeasurable(`คลิปยาว ${duration.toFixed(2)} วินาที สั้นกว่าขั้นต่ำ 0.20 วินาที ให้อัดใหม่โดยเคาะ 3-5 ครั้งห่างกันประมาณครึ่งวินาที`);
  const clipped = samples.filter((value) => Math.abs(value) >= .999).length / samples.length;
  if (clipped > .01) throw new AcousticUnmeasurable(`สัญญาณล้น ${(clipped * 100).toFixed(1)}% ของตัวอย่าง (เกินเกณฑ์ 1%) ให้ถือไมค์ห่างจากผลขึ้นอีกหรือลดระดับการอัด แล้วอัดใหม่`);
  const onsets = impulses(samples, sampleRate);
  if (!onsets.length) throw new AcousticUnmeasurable('ไม่พบจังหวะเคาะในคลิปนี้ ระบบจึงไม่มีสัญญาณให้วัด ให้เคาะด้วยข้อนิ้วกลางผล 3-5 ครั้ง ในที่ที่ไม่มีเสียงรบกวน');
  const snr = snrDb(samples, onsets, sampleRate);
  if (snr < 6) throw new AcousticUnmeasurable(`เสียงเคาะดังกว่าเสียงรบกวนเพียง ${snr.toFixed(1)} dB (ต้องการอย่างน้อย 6 dB) ให้ย้ายไปที่เงียบกว่าแล้วอัดใหม่`);
  const frequencies: number[] = [], centroids: number[] = [], allPeaks: { frequency_hz: number; relative_amplitude: number }[] = [];
  let failures = 0;
  for (const onset of onsets) {
    try {
      const result = dominantPeak(samples.subarray(onset, onset + Math.floor(sampleRate * .12)), sampleRate);
      frequencies.push(result.dominant); centroids.push(result.centroid); allPeaks.push(...result.peaks);
    } catch (error) { if (error instanceof AcousticUnmeasurable) failures++; else throw error; }
  }
  if (!frequencies.length) throw new AcousticUnmeasurable('พบจังหวะเคาะแต่ไม่มีครั้งใดให้พลังงานในช่วงกำทอนของผลแตงโม เสียงที่อัดมาอาจเป็นการเคาะวัตถุอื่น');
  if (massKg !== undefined && (!Number.isFinite(massKg) || massKg <= 0 || massKg > 30)) throw new AcousticUnmeasurable(`น้ำหนัก ${massKg} กก. อยู่นอกช่วงที่เป็นไปได้ของผลแตงโม (0-30 กก.)`);
  const dominant = median(frequencies), spread = Math.max(...frequencies) - Math.min(...frequencies);
  const merged = new Map<number, { frequency_hz: number; relative_amplitude: number }>();
  for (const peak of allPeaks) { const key = Math.round(peak.frequency_hz / 10) * 10; if (!merged.has(key) || merged.get(key)!.relative_amplitude < peak.relative_amplitude) merged.set(key, peak); }
  const notes: string[] = [];
  if (failures) notes.push(`ข้ามจังหวะเคาะที่วัดไม่ได้ ${failures} ครั้ง จากทั้งหมด ${onsets.length} ครั้ง`);
  if (frequencies.length === 1) notes.push('วัดได้จากการเคาะครั้งเดียว จึงยังไม่มีข้อมูลว่าการวัดซ้ำจะได้ค่าใกล้กันหรือไม่ ให้เคาะ 3-5 ครั้งเพื่อดูความสม่ำเสมอ');
  else if (spread > dominant * .25) notes.push(`ความถี่จากการเคาะแต่ละครั้งต่างกันถึง ${spread.toFixed(0)} Hz อาจเคาะไม่ตรงจุดเดิมหรือจับผลไว้แน่นจนเปลี่ยนการสั่น`);
  if (massKg === undefined) notes.push('ไม่ได้ส่งน้ำหนักผลมา จึงคำนวณดัชนีความแข็งไม่ได้ ชั่งน้ำหนักผล (กก.) ส่งมาด้วยจะเทียบกันได้');
  return { ok: true, method: 'fft-resonance', costs_money: false, reading: {
    dominant_frequency_hz: round(dominant), peaks: [...merged.values()].sort((a, b) => b.relative_amplitude - a.relative_amplitude).slice(0, 4).map((peak) => ({ frequency_hz: round(peak.frequency_hz), relative_amplitude: round(peak.relative_amplitude, 4) })),
    spectral_centroid_hz: round(median(centroids)), decay_time_ms: round(decayTime(samples, sampleRate, onsets[0])), impulse_count: frequencies.length,
    frequency_spread_hz: round(spread), snr_db: round(snr), duration_s: round(duration, 3), sample_rate: sampleRate,
    mass_kg: massKg ?? null, stiffness_index: massKg === undefined ? null : round(dominant ** 2 * massKg ** (2 / 3)), notes_th: notes,
    brix_estimate: null, brix_unavailable_reason_th: 'ยังไม่มีชุดข้อมูลปรับเทียบที่จับคู่เสียงเคาะกับค่า Brix ที่วัดจากผลเดียวกัน ระบบจึงไม่แปลงความถี่เป็นค่าความหวาน เพราะตัวเลขที่ได้จะเป็นการเดา',
    maturity_grade: null, maturity_unavailable_reason_th: 'การตัดสินว่าสุกหรือยังต้องเทียบกับเกณฑ์ที่ปรับเทียบไว้ของสายพันธุ์นั้น ซึ่งยังไม่มีผลวัดรองรับ ระบบจึงรายงานค่าที่วัดได้ ไม่ตัดสินแทน',
  } };
}
