/** Pixel quality gate ported from fastapi_service/leafcheck.py. */
import type { LesionMeasurement, PhotoQuality } from './diseaseModel';

export type BrowserQuality = PhotoQuality & {
  luma_mean: number; clipped_fraction: number; green_fraction: number; long_edge: number;
};
export type BrowserLesions = LesionMeasurement & { leaf_fraction: number };
export type ImageSource = HTMLImageElement | ImageBitmap | string;
const WORK_EDGE = 512;
const round = (n: number, places: number) => Number(n.toFixed(places));
const hue = (degrees: number) => degrees * 255 / 360;

export async function loadImage(source: ImageSource): Promise<HTMLImageElement | ImageBitmap> {
  if (typeof source !== 'string') return source;
  const image = new Image();
  image.decoding = 'async';
  image.src = source.startsWith('data:') ? source : `data:image/jpeg;base64,${source}`;
  await image.decode();
  return image;
}

export function imagePixels(source: HTMLImageElement | ImageBitmap, maxEdge = WORK_EDGE): ImageData {
  const originalWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const originalHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  if (!originalWidth || !originalHeight) throw new Error('อ่านขนาดภาพไม่ได้');
  const scale = Math.min(1, maxEdge / Math.max(originalWidth, originalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(originalWidth * scale));
  canvas.height = Math.max(1, Math.round(originalHeight * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('เบราว์เซอร์ไม่รองรับการอ่านภาพด้วย Canvas');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function masks(pixels: ImageData) {
  const { data, width, height } = pixels;
  const count = width * height;
  const luma = new Float64Array(count);
  let green = 0, chlorotic = 0, necrotic = 0, clipped = 0, lumaSum = 0, lumaSquare = 0;
  for (let i = 0; i < count; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
    const value = r * 0.299 + g * 0.587 + b * 0.114;
    luma[i] = value; lumaSum += value; lumaSquare += value * value;
    if (max >= 254 || min <= 1) clipped++;
    const sat = max ? delta * 255 / max : 0;
    if (sat < 40 || max < 28 || (max >= 250 && sat < 60) || delta === 0) continue;
    let degrees = max === r ? (g - b) / delta * 60 : max === g ? ((b - r) / delta + 2) * 60 : ((r - g) / delta + 4) * 60;
    if (degrees < 0) degrees += 360;
    const h = degrees * 255 / 360;
    if (h >= hue(65) && h < hue(175)) green++;
    else if (h >= hue(38) && h < hue(65)) chlorotic++;
    else if (h >= hue(8) && h < hue(38)) necrotic++;
  }
  const mean = lumaSum / count;
  const contrast = Math.sqrt(Math.max(0, lumaSquare / count - mean * mean));
  let lapSum = 0, lapSquare = 0, lapCount = 0;
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    const lap = 4 * luma[i] - luma[i - width] - luma[i + width] - luma[i - 1] - luma[i + 1];
    lapSum += lap; lapSquare += lap * lap; lapCount++;
  }
  const lapVar = lapCount ? Math.max(0, lapSquare / lapCount - (lapSum / lapCount) ** 2) : 0;
  return { green, chlorotic, necrotic, count, focus: lapVar * 48 / Math.max(8, contrast), lumaMean: mean, clipped: clipped / count };
}

export function regionTissueFraction(pixels: ImageData): number {
  const m = masks(pixels);
  return (m.green + m.chlorotic + m.necrotic) / m.count;
}

/** Exposed at the pixel boundary so exact source fixtures can be tested. */
export function analysePixels(pixels: ImageData, originalWidth = pixels.width, originalHeight = pixels.height): { quality: BrowserQuality; lesions: BrowserLesions } {
  const m = masks(pixels);
  const leafPixels = m.green + m.chlorotic + m.necrotic;
  const leafFraction = leafPixels / m.count, greenFraction = m.green / m.count;
  const measured = leafPixels >= Math.max(400, m.count * 0.12) && greenFraction >= 0.025;
  const lesions: BrowserLesions = {
    leaf_fraction: round(leafFraction, 4), measured,
    healthy_fraction: measured ? round(m.green / leafPixels, 4) : 0,
    chlorotic_fraction: measured ? round(m.chlorotic / leafPixels, 4) : 0,
    necrotic_fraction: measured ? round(m.necrotic / leafPixels, 4) : 0,
    discolored_fraction: measured ? round((m.chlorotic + m.necrotic) / leafPixels, 4) : 0,
  };
  let verdict: BrowserQuality['verdict'] = 'usable';
  const reasons: string[] = [];
  const fail = (reason: string) => { verdict = 'unusable'; reasons.push(reason); };
  const warn = (reason: string) => { if (verdict === 'usable') verdict = 'marginal'; reasons.push(reason); };
  let exposureFailed = false;
  if (m.lumaMean < 38) { fail(`ภาพมืดเกินไป (ความสว่างเฉลี่ย ${m.lumaMean.toFixed(0)}/255) ให้ถ่ายในที่มีแสงธรรมชาติ`); exposureFailed = true; }
  else if (m.clipped > 0.55) { fail(`ภาพสว่างจัดเกินไป สีหายไป ${(m.clipped * 100).toFixed(0)}% ของภาพ สีของแผลจะแยกจากใบปกติไม่ได้ ให้ถ่ายในที่ร่มหรือเลี่ยงแดดส่องตรง`); exposureFailed = true; }
  else if (m.clipped > 0.25) warn(`มีส่วนที่สว่างจัดหรือมืดจัด ${(m.clipped * 100).toFixed(0)}% ของภาพ สีบริเวณนั้นอ่านไม่ได้`);
  if (!exposureFailed) {
    if (leafFraction < 0.12) fail(`ไม่พบเนื้อใบในภาพ (เจอเพียง ${(leafFraction * 100).toFixed(0)}% ของเฟรม) ให้ถ่ายใกล้ขึ้นจนใบเต็มกรอบภาพ`);
    else if (greenFraction < 0.025) fail('ภาพนี้ไม่มีเนื้อใบสีเขียวเลย อาจเป็นภาพดิน พื้น หรือถ่ายจ่อแผลใกล้เกินไป ให้ถอยออกมาถ่ายให้เห็นใบทั้งใบ');
    else if (leafFraction < 0.28) warn(`ใบกินพื้นที่ภาพเพียง ${(leafFraction * 100).toFixed(0)}% ฉากหลังมากเกินไป ให้ถ่ายใกล้ขึ้นเพื่อให้โมเดลเห็นแผลชัด`);
  }
  if (m.focus < 18) fail(`ภาพเบลอเกินกว่าจะอ่านแผลได้ (คะแนนความคม ${m.focus.toFixed(0)}) ให้จับโทรศัพท์นิ่ง ๆ แล้วแตะโฟกัสที่ใบก่อนถ่าย`);
  else if (m.focus < 55) warn(`ภาพค่อนข้างเบลอ (คะแนนความคม ${m.focus.toFixed(0)}) แผลเล็กระยะแรกอาจหายไปจากภาพนี้`);
  const longEdge = Math.max(originalWidth, originalHeight);
  if (longEdge < 224) warn(`ภาพเล็กเพียง ${originalWidth}x${originalHeight} px รายละเอียดน้อยกว่าที่โมเดลต้องการ (224 px)`);
  return { quality: {
    verdict, usable: (verdict as BrowserQuality['verdict']) !== 'unusable', reasons,
    focus_score: round(m.focus, 1), luma_mean: round(m.lumaMean, 1), clipped_fraction: round(m.clipped, 4),
    leaf_fraction: round(leafFraction, 4), green_fraction: round(greenFraction, 4), long_edge: longEdge,
  }, lesions };
}

export async function analyse(source: ImageSource) {
  const image = await loadImage(source);
  const width = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const height = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  return analysePixels(imagePixels(image), width, height);
}
