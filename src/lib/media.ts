import { useCallback, useEffect, useRef, useState } from 'react';

/** Reads a File into a `data:` URL the API accepts as `imageBase64`/`fileData`. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
    reader.readAsDataURL(file);
  });
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/** Returns a Thai error message, or null when the file is acceptable. */
export function validateImage(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'กรุณาเลือกไฟล์รูปภาพ (JPG, PNG หรือ WEBP)';
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'รองรับเฉพาะไฟล์ JPG, PNG, WEBP และ HEIC';
  if (file.size > MAX_IMAGE_BYTES) return 'ไฟล์ใหญ่เกิน 10 MB กรุณาย่อขนาดภาพก่อนอัปโหลด';
  return null;
}

/**
 * Downscales a photo before upload. Field photos from modern phones are 4–12 MB;
 * the vision model only needs the long edge at ~1600px, which cuts upload time
 * on rural mobile data by roughly an order of magnitude.
 */
export async function compressImage(file: File, maxEdge = 1600, quality = 0.85): Promise<string> {
  const dataUrl = await fileToDataUrl(file);

  // HEIC and anything the canvas cannot decode goes up untouched.
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return dataUrl;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('decode failed'));
    element.src = dataUrl;
  }).catch(() => null);

  if (!image) return dataUrl;

  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  if (scale === 1 && file.size < 1.5 * 1024 * 1024) return dataUrl;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);

  const context = canvas.getContext('2d');
  if (!context) return dataUrl;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', quality);
}

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'ready' | 'denied' | 'unsupported';

export type KnockRecording = {
  dataUrl: string;
  mimeType: string;
  durationMs: number;
  /** Peak amplitudes sampled while recording, for the waveform display. */
  levels: number[];
};

/** Decode the actual recording to mono float32 for the acoustic service. */
export async function recordingToPcm(recording: KnockRecording): Promise<{ pcmBase64: string; sampleRate: number }> {
  const separator = recording.dataUrl.indexOf(',');
  if (!recording.dataUrl.startsWith('data:audio/') || separator < 0) {
    throw new Error('ไฟล์เสียงไม่ถูกต้อง กรุณาอัดใหม่');
  }
  const binary = atob(recording.dataUrl.slice(separator + 1));
  const encoded = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const context = new AudioContext();
  try {
    const audio = await context.decodeAudioData(encoded.buffer);
    if (audio.duration > 20 || audio.duration < 0.3) {
      throw new Error('กรุณาอัดเสียงเคาะยาว 0.3–20 วินาที');
    }
    const bytes = new Uint8Array(audio.length * 4);
    const view = new DataView(bytes.buffer);
    const channels = Array.from({ length: audio.numberOfChannels }, (_, index) => audio.getChannelData(index));
    for (let index = 0; index < audio.length; index += 1) {
      let sample = 0;
      for (const channel of channels) sample += channel[index];
      view.setFloat32(index * 4, sample / channels.length, true);
    }
    let pcm = '';
    for (let index = 0; index < bytes.length; index += 8192) {
      pcm += String.fromCharCode(...bytes.subarray(index, index + 8192));
    }
    return { pcmBase64: btoa(pcm), sampleRate: audio.sampleRate };
  } finally {
    await context.close();
  }
}

/** Encode the measured mono samples as PCM WAV for a fruit-specific training record. */
export function pcmFloat32ToWavDataUrl(pcmBase64: string, sampleRate: number): string {
  if (!Number.isInteger(sampleRate) || sampleRate < 8_000 || sampleRate > 192_000) {
    throw new Error('อัตราสุ่มเสียงไม่ถูกต้อง');
  }
  const raw = atob(pcmBase64);
  if (!raw.length || raw.length % 4 !== 0) throw new Error('ข้อมูลเสียง PCM ไม่ถูกต้อง');
  const sampleCount = raw.length / 4;
  const bytes = new Uint8Array(44 + sampleCount * 2);
  const view = new DataView(bytes.buffer);
  const label = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) bytes[offset + i] = value.charCodeAt(i);
  };
  label(0, 'RIFF');
  view.setUint32(4, bytes.length - 8, true);
  label(8, 'WAVE');
  label(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  label(36, 'data');
  view.setUint32(40, sampleCount * 2, true);
  const pcm = new DataView(Uint8Array.from(raw, (char) => char.charCodeAt(0)).buffer);
  for (let index = 0; index < sampleCount; index += 1) {
    const sample = Math.max(-1, Math.min(1, pcm.getFloat32(index * 4, true)));
    if (!Number.isFinite(sample)) throw new Error('ข้อมูลเสียงมีค่าที่วัดไม่ได้');
    view.setInt16(44 + index * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  let binary = '';
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

/**
 * Microphone recorder for the knock test. Exposes a live level so the waveform
 * reacts to the actual taps instead of animating on a timer, which is what
 * tells a farmer the mic is really picking the knock up.
 */
export function useKnockRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [level, setLevel] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recording, setRecording] = useState<KnockRecording | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const rafId = useRef<number | null>(null);
  const startedAt = useRef(0);
  const levels = useRef<number[]>([]);
  /** Set by `reset()` so a late `onstop` does not resurrect the clip. */
  const discarded = useRef(false);

  const cleanup = useCallback(() => {
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    rafId.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    void audioContext.current?.close().catch(() => undefined);
    audioContext.current = null;
    mediaRecorder.current = null;
  }, []);

  useEffect(
    () => () => {
      // The component is going away, so nothing should be delivered to it;
      // an in-flight recorder also has to be stopped, not just unplugged.
      discarded.current = true;
      if (mediaRecorder.current?.state === 'recording') {
        try {
          mediaRecorder.current.stop();
        } catch {
          // Already stopping; the cleanup below still releases the mic.
        }
      }
      cleanup();
    },
    [cleanup],
  );

  const start = useCallback(async () => {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      setError('อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับการบันทึกเสียง');
      return;
    }

    setState('requesting');
    setError(null);
    setRecording(null);
    levels.current = [];
    discarded.current = false;

    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch {
      setState('denied');
      setError('ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน กรุณาอนุญาตในการตั้งค่าเบราว์เซอร์');
      return;
    }

    stream.current = micStream;

    // Analyser drives the on-screen waveform.
    const context = new AudioContext();
    audioContext.current = context;
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(micStream).connect(analyser);
    const buffer = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(buffer);
      let peak = 0;
      for (const sample of buffer) peak = Math.max(peak, Math.abs(sample - 128) / 128);
      setLevel(peak);
      levels.current.push(peak);
      setElapsedMs(Date.now() - startedAt.current);
      rafId.current = requestAnimationFrame(tick);
    };

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

    const recorder = new MediaRecorder(micStream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      // `stop()` is asynchronous, so `reset()` could run its own cleanup
      // first and then be overwritten here: cancelling a recording left the
      // screen in 'ready' with the clip the farmer had just discarded.
      if (discarded.current) {
        cleanup();
        setLevel(0);
        return;
      }
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const durationMs = Date.now() - startedAt.current;
      const reader = new FileReader();
      reader.onload = () => {
        if (discarded.current) return;
        setRecording({
          dataUrl: String(reader.result),
          mimeType: blob.type,
          durationMs,
          levels: [...levels.current],
        });
        setState('ready');
      };
      reader.onerror = () => {
        if (discarded.current) return;
        // Never silently leave the screen on 'recording' with no clip.
        setState('idle');
        setError('อ่านไฟล์เสียงที่บันทึกไม่สำเร็จ กรุณาลองอัดใหม่อีกครั้ง');
      };
      reader.readAsDataURL(blob);
      cleanup();
      setLevel(0);
    };

    mediaRecorder.current = recorder;
    startedAt.current = Date.now();
    recorder.start();
    setState('recording');
    tick();
  }, [cleanup]);

  const stop = useCallback(() => {
    if (mediaRecorder.current?.state === 'recording') mediaRecorder.current.stop();
  }, []);

  const reset = useCallback(() => {
    discarded.current = true;
    stop();
    cleanup();
    setState('idle');
    setRecording(null);
    setLevel(0);
    setElapsedMs(0);
    setError(null);
  }, [stop, cleanup]);

  return { state, level, elapsedMs, recording, error, start, stop, reset };
}
