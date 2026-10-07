"""วิเคราะห์เสียงเคาะแตงโมด้วยการประมวลผลสัญญาณ ไม่ใช้โมเดลที่ต้องเทรน

ขอบเขตของไฟล์นี้ — อ่านก่อนแก้
================================

โมดูลนี้ **วัด** สมบัติทางกายภาพของเสียงเคาะ ไม่ **ทำนาย** ค่าความหวาน

เหตุผลไม่ได้อยู่ที่ความขยาด แต่อยู่ที่ว่าการแปลงความถี่เป็นค่า Brix ต้องมี
ชุดข้อมูลที่จับคู่ "เสียงเคาะของผลหนึ่ง" กับ "ค่า Brix ที่วัดจากผลเดียวกัน
หลังผ่า" จำนวนมากพอ ซึ่งโครงการนี้ยังไม่มี ตัวเลข Brix ที่ไม่ได้มาจาก
การปรับเทียบคือการเดา และเกษตรกรใช้ตัวเลขนั้นตัดสินใจว่าจะตัดขายวันไหน

เวอร์ชันก่อนหน้าของระบบนี้ตอบด้วย ``Math.random()`` — ความถี่ 125-150 Hz
ค่า Brix 11.4-12.9 ความมั่นใจ 93% และคำตัดสิน "สุกพอดี" คงที่ โดยไม่เคย
อ่านไฟล์เสียงที่ผู้ใช้อัดมาเลย ดู ``server.ts`` ที่อธิบายไว้ ไฟล์นี้จึงตอบ
เฉพาะสิ่งที่วัดได้จริงจากสัญญาณ และปฏิเสธอย่างชัดเจนเมื่อวัดไม่ได้

สิ่งที่วัดได้จริงและมีความหมาย
-----------------------------

1. **ความถี่กำทอน (resonance)** ผลไม้ที่ถูกเคาะสั่นเป็นทรงกลมยืดหยุ่น
   ความถี่โหมดแรกขึ้นกับความแข็งของเนื้อ เนื้อที่สุกขึ้นจะนิ่มลง
   ค่ามอดุลัสยืดหยุ่นลดลง ความถี่จึงลดลง ความสัมพันธ์นี้เป็นที่ยอมรับใน
   งานวิจัยหลังการเก็บเกี่ยว แต่ "ค่าสัมบูรณ์" ขึ้นกับมวลและขนาดผลด้วย
   ผลใหญ่สั่นช้ากว่าผลเล็กที่สุกเท่ากัน จึงเทียบความถี่ดิบข้ามผลไม่ได้

2. **ดัชนีความแข็ง (stiffness index)** ``S = f² · m^(2/3)``
   เป็นรูปที่ตัดผลของมวลออกไป ใช้กันในงานวัดความแน่นเนื้อผลไม้ด้วยเสียง
   คำนวณได้เฉพาะเมื่อผู้ใช้ชั่งน้ำหนักผลมาให้ ถ้าไม่มีน้ำหนัก โมดูลนี้
   คืนค่า ``None`` พร้อมเหตุผล ไม่ใช่เดาน้ำหนักจากสายพันธุ์

3. **การหน่วง (damping)** เนื้อที่เริ่มเป็นโพรงหรือช้ำจะหน่วงเสียงเร็วขึ้น
   วัดจากอัตราการลดลงของพลังงานหลังจุดกระทบ

สิ่งที่ "ใช้ได้เลย" โดยไม่ต้องปรับเทียบ
--------------------------------------

การเปรียบเทียบผลหลายลูกในล็อตเดียวกัน ถ้าเคาะด้วยวิธีเดียวกันและชั่งน้ำหนัก
ผลที่ ``S`` ต่ำกว่าคือเนื้อนิ่มกว่า ซึ่งโดยทั่วไปคือสุกกว่า การจัดอันดับ
ภายในล็อตไม่ต้องรู้ค่าสัมบูรณ์ จึงเป็นผลลัพธ์ที่ใช้ได้จริงตั้งแต่วันนี้
ดู ``compare_batch``
"""

from __future__ import annotations

import base64
import io
import math
import wave
from dataclasses import dataclass, field
from typing import Any

import numpy as np

# ช่วงความถี่ที่มองหาโหมดกำทอนของผลแตงโม
#
# งานวัดความแน่นเนื้อด้วยเสียงในผลไม้ขนาดใกล้กันรายงานโหมดแรกอยู่ในช่วง
# หลักสิบถึงหลักร้อยต้น ๆ เฮิรตซ์ ขอบล่าง 60 Hz ตัดเสียงฮัมไฟบ้าน 50 Hz
# กับการสั่นของมือออก ขอบบน 900 Hz กว้างพอรับผลเล็กที่สั่นเร็วกว่า
RESONANCE_BAND_HZ = (60.0, 900.0)

# ความยาวหน้าต่างที่ใช้วิเคราะห์หลังจุดกระทบ (วินาที)
#
# สั้นพอที่จะไม่กินเสียงเคาะครั้งถัดไป และยาวพอให้ความละเอียดความถี่
# ประมาณ 1/0.12 ≈ 8 Hz ซึ่งละเอียดกว่าความต่างที่ต้องแยกแยะ
ANALYSIS_WINDOW_S = 0.12

# เกณฑ์คุณภาพสัญญาณ ต่ำกว่านี้คือวัดไม่ได้ ไม่ใช่วัดได้แต่ไม่แม่น
MIN_DURATION_S = 0.20
MIN_IMPULSES = 1
MIN_SNR_DB = 6.0
CLIPPING_FRACTION_LIMIT = 0.01

# สัดส่วนพลังงานที่ต้องอยู่ในช่วงกำทอนของผล จึงจะถือว่าเป็นเสียงเคาะผลแตงโม
#
# การเช็คเพียงว่า "มีพลังงานในช่วงนี้บ้างไหม" ไม่พอ เพราะการรั่วของสเปกตรัม
# ทำให้มีพลังงานในทุกช่วงเสมอ การเคาะโต๊ะหรือแก้วที่กำทอนราว 2 kHz จึงเคย
# ได้ความถี่ในช่วง 60-900 Hz ออกมาเป็นผล ทั้งที่ไม่ใช่เสียงผลไม้ — เทสต์
# test_refuses_knock_with_no_energy_in_the_resonance_band จับข้อนี้ได้
#
# วัดจากสัญญาณสังเคราะห์: เคาะในช่วง 95-700 Hz ได้สัดส่วน ~1.00
# เคาะที่ 1.2 kHz ขึ้นไปได้ ~0.00 เกณฑ์ 0.25 จึงมีระยะเผื่อมาก และยังผ่อน
# พอให้เสียงกระทบจริงที่มีองค์ประกอบความถี่สูงปนมาด้วยไม่ถูกปฏิเสธ
MIN_IN_BAND_ENERGY_RATIO = 0.25


class AcousticUnmeasurable(ValueError):
    """สัญญาณนี้วัดไม่ได้ — ต้องบอกผู้ใช้ให้อัดใหม่ ไม่ใช่คืนตัวเลขที่เดาเอา

    แยกเป็นข้อผิดพลาดของ "คำขอ" (ผู้ใช้แก้ได้ด้วยการอัดใหม่) ไม่ใช่ของระบบ
    ผู้เรียกจึงแปลงเป็น HTTP 422 พร้อมข้อความที่บอกวิธีแก้
    """


@dataclass
class Peak:
    """ยอดคลื่นหนึ่งยอดในสเปกตรัม"""

    frequency_hz: float
    relative_amplitude: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "frequency_hz": round(self.frequency_hz, 1),
            "relative_amplitude": round(self.relative_amplitude, 4),
        }


@dataclass
class AcousticReading:
    """ผลการวัดหนึ่งครั้ง มีแต่สิ่งที่วัดได้จากสัญญาณ"""

    dominant_frequency_hz: float
    peaks: list[Peak]
    spectral_centroid_hz: float
    decay_time_ms: float
    impulse_count: int
    frequency_spread_hz: float
    snr_db: float
    duration_s: float
    sample_rate: int
    mass_kg: float | None = None
    stiffness_index: float | None = None
    notes_th: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "dominant_frequency_hz": round(self.dominant_frequency_hz, 1),
            "peaks": [p.to_dict() for p in self.peaks],
            "spectral_centroid_hz": round(self.spectral_centroid_hz, 1),
            "decay_time_ms": round(self.decay_time_ms, 1),
            "impulse_count": self.impulse_count,
            # ความกระจายของความถี่ระหว่างการเคาะหลายครั้ง ยิ่งน้อยยิ่งน่าเชื่อ
            "frequency_spread_hz": round(self.frequency_spread_hz, 1),
            "snr_db": round(self.snr_db, 1),
            "duration_s": round(self.duration_s, 3),
            "sample_rate": self.sample_rate,
            "mass_kg": self.mass_kg,
            "stiffness_index": (
                None if self.stiffness_index is None else round(self.stiffness_index, 1)
            ),
            "notes_th": self.notes_th,
            # ตรงนี้คือหัวใจของความซื่อสัตย์ของเอ็นด์พอยต์นี้
            "brix_estimate": None,
            "brix_unavailable_reason_th": (
                "ยังไม่มีชุดข้อมูลปรับเทียบที่จับคู่เสียงเคาะกับค่า Brix ที่วัดจากผลเดียวกัน "
                "ระบบจึงไม่แปลงความถี่เป็นค่าความหวาน เพราะตัวเลขที่ได้จะเป็นการเดา "
                "สิ่งที่ใช้ได้ตอนนี้คือการเทียบผลหลายลูกในล็อตเดียวกัน (ดู /acoustic/compare)"
            ),
            "maturity_grade": None,
            "maturity_unavailable_reason_th": (
                "การตัดสินว่าสุกหรือยังต้องเทียบกับเกณฑ์ที่ปรับเทียบไว้ของสายพันธุ์นั้น "
                "ซึ่งยังไม่มีผลวัดรองรับ ระบบจึงรายงานค่าที่วัดได้ ไม่ตัดสินแทน"
            ),
        }


def _to_mono_float(samples: np.ndarray) -> np.ndarray:
    """รวมช่องสัญญาณเป็นช่องเดียวและแปลงเป็น float32 ช่วง [-1, 1]"""
    data = np.asarray(samples, dtype=np.float64)
    if data.ndim > 1:
        data = data.mean(axis=1 if data.shape[1] < data.shape[0] else 0)
    return data.astype(np.float64, copy=False)


def decode_wav(raw: bytes) -> tuple[np.ndarray, int]:
    """อ่าน WAV แบบ PCM ด้วยไลบรารีมาตรฐาน ไม่ต้องมี ffmpeg

    รองรับเฉพาะ WAV/PCM เพราะเป็นรูปแบบเดียวที่อ่านได้โดยไม่ต้องพึ่งโปรแกรม
    ภายนอก เสียงจากเบราว์เซอร์มักเป็น webm/opus ซึ่งถอดรหัสฝั่งเบราว์เซอร์
    แล้วส่งมาเป็น PCM ตรง ๆ (ดู ``decode_pcm_base64``) จะได้ไม่ต้องติดตั้ง
    ffmpeg ในอิมเมจและไม่ต้องถอดรหัสซ้ำสองรอบ
    """
    try:
        with wave.open(io.BytesIO(raw), "rb") as handle:
            channels = handle.getnchannels()
            width = handle.getsampwidth()
            rate = handle.getframerate()
            frames = handle.readframes(handle.getnframes())
    except wave.Error as exc:
        raise AcousticUnmeasurable(
            f"อ่านไฟล์เสียงไม่ได้ ({exc}) รองรับเฉพาะ WAV แบบ PCM "
            "ถ้าอัดจากเบราว์เซอร์ ให้ถอดรหัสเป็น PCM ก่อนส่ง"
        ) from exc

    dtype = {1: np.uint8, 2: np.int16, 4: np.int32}.get(width)
    if dtype is None:
        raise AcousticUnmeasurable(f"ความละเอียด {width * 8} บิตยังไม่รองรับ")

    data = np.frombuffer(frames, dtype=dtype).astype(np.float64)
    if width == 1:
        # WAV 8 บิตเป็นแบบไม่มีเครื่องหมาย จุดศูนย์อยู่ที่ 128
        data = (data - 128.0) / 128.0
    else:
        data = data / float(2 ** (width * 8 - 1))
    if channels > 1:
        data = data.reshape(-1, channels).mean(axis=1)
    return data, rate


def decode_pcm_base64(encoded: str, sample_rate: int) -> tuple[np.ndarray, int]:
    """รับ PCM float32 ที่เบราว์เซอร์ถอดรหัสมาแล้ว เข้ารหัส base64

    เส้นทางนี้เป็นเส้นทางหลัก: ``AudioContext.decodeAudioData`` ของเบราว์เซอร์
    ถอดรหัส webm/opus ได้ฟรีและเร็ว ฝั่งเซิร์ฟเวอร์จึงไม่ต้องมี ffmpeg
    """
    if sample_rate < 8000:
        raise AcousticUnmeasurable(
            f"อัตราสุ่ม {sample_rate} Hz ต่ำเกินไป ต้องอย่างน้อย 8000 Hz"
        )
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (ValueError, TypeError) as exc:
        raise AcousticUnmeasurable("ถอดรหัส base64 ของสัญญาณเสียงไม่ได้") from exc
    if len(raw) % 4:
        raise AcousticUnmeasurable("ความยาวข้อมูลไม่ลงตัวกับ float32 (4 ไบต์ต่อค่า)")
    data = np.frombuffer(raw, dtype="<f4").astype(np.float64)
    if not data.size:
        raise AcousticUnmeasurable("ไม่มีตัวอย่างเสียงในคำขอ")
    if not np.all(np.isfinite(data)):
        raise AcousticUnmeasurable("สัญญาณมีค่า NaN หรือ Infinity")
    return data, int(sample_rate)


def _energy_envelope(signal: np.ndarray, sample_rate: int) -> tuple[np.ndarray, int]:
    """ซองพลังงานแบบ RMS ต่อหน้าต่างสั้น ใช้หาจุดกระทบ"""
    hop = max(1, int(sample_rate * 0.002))  # 2 ms
    window = max(hop, int(sample_rate * 0.005))  # 5 ms
    count = max(1, 1 + (len(signal) - window) // hop) if len(signal) >= window else 1
    envelope = np.empty(count, dtype=np.float64)
    for i in range(count):
        chunk = signal[i * hop : i * hop + window]
        envelope[i] = math.sqrt(float(np.mean(chunk**2))) if chunk.size else 0.0
    return envelope, hop


def _find_impulses(signal: np.ndarray, sample_rate: int) -> list[int]:
    """หาตำแหน่งจุดกระทบ (ดัชนีตัวอย่าง) จากการพุ่งขึ้นของพลังงาน

    ใช้เกณฑ์เทียบกับค่าสูงสุดของซองพลังงาน ไม่ใช่ค่าคงที่สัมบูรณ์
    เพราะระดับเสียงที่อัดได้ขึ้นกับระยะไมค์และอุปกรณ์ของผู้ใช้
    """
    envelope, hop = _energy_envelope(signal, sample_rate)
    if envelope.max() <= 0:
        return []

    threshold = max(envelope.max() * 0.35, float(np.median(envelope)) * 4.0)
    # ห้ามนับการเคาะสองครั้งภายใน 60 ms เพราะเสียงกังวานของครั้งแรกยังอยู่
    min_gap = max(1, int(0.060 / 0.002))

    onsets: list[int] = []
    last = -min_gap
    for i in range(1, len(envelope)):
        rising = envelope[i] > envelope[i - 1]
        if envelope[i] >= threshold and rising and i - last >= min_gap:
            onsets.append(i * hop)
            last = i
    return onsets


def _dominant_peak(
    window: np.ndarray, sample_rate: int, max_peaks: int = 4
) -> tuple[float, list[Peak], float]:
    """หาความถี่เด่นและยอดอื่น ๆ ในช่วงกำทอน คืน (ความถี่เด่น, ยอด, เซนทรอยด์)"""
    if window.size < 32:
        raise AcousticUnmeasurable("ช่วงสัญญาณหลังจุดกระทบสั้นเกินกว่าจะวิเคราะห์")

    # ตัดค่าเฉลี่ยออกก่อน ไม่ให้ DC offset ของไมค์กลายเป็นยอดที่ 0 Hz
    centred = window - float(np.mean(window))
    spectrum = np.abs(np.fft.rfft(centred * np.hanning(centred.size)))
    freqs = np.fft.rfftfreq(centred.size, d=1.0 / sample_rate)

    band = (freqs >= RESONANCE_BAND_HZ[0]) & (freqs <= RESONANCE_BAND_HZ[1])
    if not band.any() or spectrum[band].max() <= 0:
        raise AcousticUnmeasurable(
            f"ไม่พบพลังงานในช่วง {RESONANCE_BAND_HZ[0]:.0f}-{RESONANCE_BAND_HZ[1]:.0f} Hz "
            "ซึ่งเป็นช่วงที่ผลแตงโมกำทอน เสียงที่อัดมาอาจไม่ใช่เสียงเคาะผล"
        )

    # พลังงานส่วนใหญ่ต้องอยู่ในช่วงกำทอนของผล ไม่ใช่แค่มีอยู่บ้าง
    # ตัดต่ำกว่า 20 Hz ออกจากตัวหาร เพราะเป็นการเลื่อนฐานของไมค์ ไม่ใช่เสียง
    power = spectrum**2
    usable = freqs >= 20.0
    total = float(power[usable].sum())
    in_band_ratio = float(power[band].sum()) / total if total > 0 else 0.0
    if in_band_ratio < MIN_IN_BAND_ENERGY_RATIO:
        raise AcousticUnmeasurable(
            f"พลังงานเพียง {in_band_ratio * 100:.0f}% อยู่ในช่วง "
            f"{RESONANCE_BAND_HZ[0]:.0f}-{RESONANCE_BAND_HZ[1]:.0f} Hz ที่ผลแตงโมกำทอน "
            f"(ต้องการอย่างน้อย {MIN_IN_BAND_ENERGY_RATIO * 100:.0f}%) "
            "เสียงที่อัดมาน่าจะเป็นการเคาะวัตถุอื่น เช่น โต๊ะหรือภาชนะ ไม่ใช่ผลแตงโม"
        )

    band_freqs = freqs[band]
    band_mag = spectrum[band]
    peak_value = float(band_mag.max())

    # หายอดเฉพาะที่ (ค่ามากกว่าเพื่อนบ้านทั้งสองข้าง) แล้วเรียงตามความสูง
    local: list[Peak] = []
    for i in range(1, len(band_mag) - 1):
        if band_mag[i] >= band_mag[i - 1] and band_mag[i] > band_mag[i + 1]:
            local.append(Peak(float(band_freqs[i]), float(band_mag[i]) / peak_value))
    if not local:
        local = [Peak(float(band_freqs[int(np.argmax(band_mag))]), 1.0)]
    local.sort(key=lambda p: -p.relative_amplitude)

    centroid = float(np.sum(band_freqs * band_mag) / np.sum(band_mag))
    return local[0].frequency_hz, local[:max_peaks], centroid


def _decay_time_ms(signal: np.ndarray, sample_rate: int, onset: int) -> float:
    """เวลาที่พลังงานลดลง 20 dB หลังจุดกระทบ (มิลลิวินาที)

    เนื้อที่เริ่มเป็นโพรงหรือช้ำจะหน่วงเสียงเร็วกว่า ค่านี้จึงเป็นข้อมูล
    ประกอบที่วัดได้จริง คืน 0.0 เมื่อหาไม่ได้ ไม่ใช่เดาค่ากลาง
    """
    tail = signal[onset : onset + int(sample_rate * 0.5)]
    if tail.size < 16:
        return 0.0
    envelope, hop = _energy_envelope(tail, sample_rate)
    if envelope.size < 2 or envelope[0] <= 0:
        return 0.0
    target = envelope[0] * (10 ** (-20 / 20))  # ลดลง 20 dB
    below = np.nonzero(envelope <= target)[0]
    if not below.size:
        return 0.0
    return float(below[0] * hop / sample_rate * 1000.0)


def _snr_db(signal: np.ndarray, onsets: list[int], sample_rate: int) -> float:
    """อัตราส่วนพลังงานช่วงเคาะต่อพลังงานพื้นหลัง (เดซิเบล)"""
    mask = np.zeros(signal.size, dtype=bool)
    span = int(sample_rate * ANALYSIS_WINDOW_S)
    for onset in onsets:
        mask[onset : onset + span] = True
    signal_part = signal[mask]
    noise_part = signal[~mask]
    if not signal_part.size:
        return 0.0
    signal_power = float(np.mean(signal_part**2))
    # ถ้าไม่มีช่วงเงียบเลย ถือว่าวัดพื้นหลังไม่ได้ ใช้ค่าต่ำสุดที่ไม่ทำให้หาร 0
    noise_power = float(np.mean(noise_part**2)) if noise_part.size else 1e-12
    if signal_power <= 0:
        return 0.0
    return float(10.0 * math.log10(signal_power / max(noise_power, 1e-12)))


def stiffness_index(frequency_hz: float, mass_kg: float) -> float:
    """ดัชนีความแข็ง ``S = f² · m^(2/3)``

    รูปนี้ตัดผลของมวลออกจากความถี่ จึงเทียบระหว่างผลต่างขนาดได้
    ซึ่งความถี่ดิบทำไม่ได้ — ผลใหญ่สั่นช้ากว่าผลเล็กที่สุกเท่ากัน

    หน่วยเป็น Hz²·kg^(2/3) ค่าที่ได้ใช้เทียบกันเองในล็อตเดียวกัน
    ไม่ใช่เทียบกับเกณฑ์สัมบูรณ์ เพราะยังไม่มีการปรับเทียบ
    """
    if frequency_hz <= 0 or mass_kg <= 0:
        raise AcousticUnmeasurable("ความถี่และน้ำหนักต้องมากกว่าศูนย์")
    return float(frequency_hz**2 * mass_kg ** (2.0 / 3.0))


def analyse(
    signal: np.ndarray, sample_rate: int, mass_kg: float | None = None
) -> AcousticReading:
    """วิเคราะห์สัญญาณเสียงเคาะหนึ่งคลิป

    โยน ``AcousticUnmeasurable`` เมื่อสัญญาณไม่ผ่านเกณฑ์คุณภาพ แทนการคืน
    ตัวเลขที่คำนวณจากเสียงรบกวน ซึ่งผู้ใช้แยกไม่ออกว่าต่างจากการวัดจริง
    """
    data = _to_mono_float(signal)
    duration = data.size / sample_rate

    if duration < MIN_DURATION_S:
        raise AcousticUnmeasurable(
            f"คลิปยาว {duration:.2f} วินาที สั้นกว่าขั้นต่ำ {MIN_DURATION_S:.2f} วินาที "
            "ให้อัดใหม่โดยเคาะ 3-5 ครั้งห่างกันประมาณครึ่งวินาที"
        )

    clipped = float(np.mean(np.abs(data) >= 0.999))
    if clipped > CLIPPING_FRACTION_LIMIT:
        raise AcousticUnmeasurable(
            f"สัญญาณล้น {clipped * 100:.1f}% ของตัวอย่าง (เกินเกณฑ์ "
            f"{CLIPPING_FRACTION_LIMIT * 100:.0f}%) ยอดคลื่นที่ถูกตัดทำให้ความถี่ที่วัดได้เพี้ยน "
            "ให้ถือไมค์ห่างจากผลขึ้นอีกหรือลดระดับการอัด แล้วอัดใหม่"
        )

    onsets = _find_impulses(data, sample_rate)
    if len(onsets) < MIN_IMPULSES:
        raise AcousticUnmeasurable(
            "ไม่พบจังหวะเคาะในคลิปนี้ ระบบจึงไม่มีสัญญาณให้วัด "
            "ให้เคาะด้วยข้อนิ้วกลางผล 3-5 ครั้ง ในที่ที่ไม่มีเสียงรบกวน"
        )

    snr = _snr_db(data, onsets, sample_rate)
    if snr < MIN_SNR_DB:
        raise AcousticUnmeasurable(
            f"เสียงเคาะดังกว่าเสียงรบกวนเพียง {snr:.1f} dB (ต้องการอย่างน้อย "
            f"{MIN_SNR_DB:.0f} dB) ค่าที่วัดได้จะเป็นเสียงรบกวนมากกว่าเสียงผล "
            "ให้ย้ายไปที่เงียบกว่าแล้วอัดใหม่"
        )

    span = int(sample_rate * ANALYSIS_WINDOW_S)
    per_impulse: list[float] = []
    all_peaks: list[Peak] = []
    centroids: list[float] = []
    failures = 0
    for onset in onsets:
        window = data[onset : onset + span]
        try:
            dominant, peaks, centroid = _dominant_peak(window, sample_rate)
        except AcousticUnmeasurable:
            # การเคาะบางครั้งอาจเบาเกินไป ข้ามไปแต่จำไว้ว่าข้ามกี่ครั้ง
            failures += 1
            continue
        per_impulse.append(dominant)
        all_peaks.extend(peaks)
        centroids.append(centroid)

    if not per_impulse:
        raise AcousticUnmeasurable(
            "พบจังหวะเคาะแต่ไม่มีครั้งใดให้พลังงานในช่วงกำทอนของผลแตงโม "
            "เสียงที่อัดมาอาจเป็นการเคาะวัตถุอื่น หรือไมค์อยู่ไกลเกินไป"
        )

    # ใช้มัฐยฐานไม่ใช่ค่าเฉลี่ย เพราะการเคาะพลาดหนึ่งครั้งไม่ควรดึงผลทั้งหมด
    dominant = float(np.median(per_impulse))
    spread = float(np.max(per_impulse) - np.min(per_impulse)) if len(per_impulse) > 1 else 0.0

    merged: dict[float, Peak] = {}
    for peak in all_peaks:
        key = round(peak.frequency_hz / 10.0) * 10.0
        current = merged.get(key)
        if current is None or peak.relative_amplitude > current.relative_amplitude:
            merged[key] = Peak(peak.frequency_hz, peak.relative_amplitude)
    peaks = sorted(merged.values(), key=lambda p: -p.relative_amplitude)[:4]

    notes: list[str] = []
    if failures:
        notes.append(
            f"ข้ามจังหวะเคาะที่วัดไม่ได้ {failures} ครั้ง จากทั้งหมด {len(onsets)} ครั้ง"
        )
    if len(per_impulse) == 1:
        notes.append(
            "วัดได้จากการเคาะครั้งเดียว จึงยังไม่มีข้อมูลว่าการวัดซ้ำจะได้ค่าใกล้กันหรือไม่ "
            "ให้เคาะ 3-5 ครั้งเพื่อดูความสม่ำเสมอ"
        )
    elif spread > dominant * 0.25:
        notes.append(
            f"ความถี่จากการเคาะแต่ละครั้งต่างกันถึง {spread:.0f} Hz "
            "อาจเคาะไม่ตรงจุดเดิมหรือจับผลไว้แน่นจนเปลี่ยนการสั่น ค่าที่ได้จึงยังไม่นิ่ง"
        )

    stiffness: float | None = None
    if mass_kg is not None:
        if mass_kg <= 0 or mass_kg > 30:
            raise AcousticUnmeasurable(
                f"น้ำหนัก {mass_kg} กก. อยู่นอกช่วงที่เป็นไปได้ของผลแตงโม (0-30 กก.)"
            )
        stiffness = stiffness_index(dominant, mass_kg)
    else:
        notes.append(
            "ไม่ได้ส่งน้ำหนักผลมา จึงคำนวณดัชนีความแข็งไม่ได้ และเทียบกับผลอื่น "
            "ที่ขนาดต่างกันไม่ได้ ชั่งน้ำหนักผล (กก.) ส่งมาด้วยจะเทียบกันได้"
        )

    return AcousticReading(
        dominant_frequency_hz=dominant,
        peaks=peaks,
        spectral_centroid_hz=float(np.median(centroids)) if centroids else 0.0,
        decay_time_ms=_decay_time_ms(data, sample_rate, onsets[0]),
        impulse_count=len(per_impulse),
        frequency_spread_hz=spread,
        snr_db=snr,
        duration_s=duration,
        sample_rate=int(sample_rate),
        mass_kg=mass_kg,
        stiffness_index=stiffness,
        notes_th=notes,
    )


def compare_batch(entries: list[dict[str, Any]]) -> dict[str, Any]:
    """จัดอันดับผลหลายลูกในล็อตเดียวกันจากดัชนีความแข็ง

    นี่คือผลลัพธ์ที่ใช้ได้จริงโดยไม่ต้องปรับเทียบ: การเทียบกันเองไม่ต้องรู้
    ค่าสัมบูรณ์ ต้องรู้แค่ว่าวัดด้วยวิธีเดียวกัน ผลที่ ``S`` ต่ำกว่าเนื้อนิ่มกว่า
    ซึ่งโดยทั่วไปคือสุกกว่า

    ``entries`` แต่ละตัวต้องมี ``id`` กับ ``stiffness_index`` ผลที่ไม่ได้ชั่ง
    น้ำหนักจะถูกแยกออกไปอยู่ใน ``excluded`` พร้อมเหตุผล ไม่ใช่เอามาเรียง
    ปนกับความถี่ดิบ ซึ่งจะทำให้ผลใหญ่ดูสุกกว่าผลเล็กทั้งที่ไม่จริง
    """
    ranked: list[dict[str, Any]] = []
    excluded: list[dict[str, Any]] = []
    for entry in entries:
        value = entry.get("stiffness_index")
        if value is None:
            excluded.append(
                {
                    "id": entry.get("id"),
                    "reason_th": "ไม่มีดัชนีความแข็ง (ต้องชั่งน้ำหนักผลมาด้วย) "
                    "การเรียงด้วยความถี่ดิบจะทำให้ผลใหญ่ดูสุกกว่าผลเล็กทั้งที่ไม่จริง",
                }
            )
            continue
        ranked.append({"id": entry.get("id"), "stiffness_index": float(value)})

    ranked.sort(key=lambda row: row["stiffness_index"])
    for position, row in enumerate(ranked, start=1):
        row["rank_softest_first"] = position

    note = (
        "เรียงจากเนื้อนิ่มที่สุดไปแข็งที่สุดภายในล็อตนี้เท่านั้น "
        "อันดับนี้ไม่ได้บอกว่าลูกไหนสุกพอดีหรือยังไม่สุก เพราะยังไม่มีเกณฑ์ที่ปรับเทียบไว้ "
        "แต่บอกได้ว่าควรตัดลูกไหนก่อนลูกไหน"
    )
    if len(ranked) < 2:
        note = (
            "มีผลที่เทียบได้น้อยกว่า 2 ลูก จึงยังจัดอันดับไม่ได้ "
            "วัดและชั่งน้ำหนักผลอย่างน้อย 2 ลูกในล็อตเดียวกันเพื่อเทียบ"
        )

    return {
        "ranked": ranked,
        "excluded": excluded,
        "comparable_count": len(ranked),
        "note_th": note,
    }


def service_info() -> dict[str, Any]:
    """สิ่งที่เอ็นด์พอยต์นี้ทำและไม่ทำ สำหรับให้หน้าจอแสดงก่อนผู้ใช้เริ่มอัด"""
    return {
        "available": True,
        "costs_money": False,
        "method": "การประมวลผลสัญญาณ (FFT) ไม่ใช่โมเดลที่เทรนจากข้อมูล",
        "measures_th": [
            "ความถี่กำทอนเด่น (Hz) จากการเคาะแต่ละครั้ง",
            "ดัชนีความแข็ง S = f²·m^(2/3) เมื่อส่งน้ำหนักผลมาด้วย",
            "เวลาหน่วงของเสียง (ms) และเซนทรอยด์สเปกตรัม",
            "คุณภาพสัญญาณ: จำนวนจังหวะเคาะ สัญญาณล้น และอัตราส่วนต่อเสียงรบกวน",
        ],
        "does_not_measure_th": [
            "ค่าความหวาน (Brix) — ต้องมีชุดข้อมูลปรับเทียบที่จับคู่เสียงกับค่าที่วัดจากผลเดียวกัน",
            "คำตัดสินว่าสุกหรือยังสุก — ต้องมีเกณฑ์ที่ปรับเทียบของแต่ละสายพันธุ์",
        ],
        "usable_today_th": (
            "เทียบผลหลายลูกในล็อตเดียวกันได้ทันที โดยเคาะด้วยวิธีเดียวกันและชั่งน้ำหนักทุกลูก "
            "ผลที่ดัชนีความแข็งต่ำกว่าคือเนื้อนิ่มกว่า จึงควรตัดก่อน"
        ),
        "how_to_calibrate_th": (
            "บันทึกคู่ข้อมูล (เสียงเคาะ + น้ำหนัก + ค่า Brix ที่วัดจากผลเดียวกันหลังผ่า) "
            "สะสมให้ครบหลายสิบผลต่อสายพันธุ์ แล้วจึงหาความสัมพันธ์ได้ "
            "ก่อนถึงจุดนั้นระบบจะไม่รายงานค่า Brix"
        ),
        "recording_tips_th": [
            "เคาะด้วยข้อนิ้วกลางผล 3-5 ครั้ง ห่างกันประมาณครึ่งวินาที",
            "วางผลบนฝ่ามือหรือพื้นนุ่ม ไม่จับแน่นจนผลสั่นไม่ได้",
            "อัดในที่เงียบ ถือไมค์ห่างผลประมาณหนึ่งฝ่ามือ",
            "ชั่งน้ำหนักผลเป็นกิโลกรัมส่งมาด้วย เพื่อให้เทียบกับผลอื่นได้",
        ],
        "resonance_band_hz": list(RESONANCE_BAND_HZ),
        "min_duration_s": MIN_DURATION_S,
        "min_snr_db": MIN_SNR_DB,
    }
