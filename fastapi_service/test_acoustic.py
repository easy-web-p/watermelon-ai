"""เทสต์การวิเคราะห์เสียงเคาะด้วยสัญญาณสังเคราะห์ที่รู้คำตอบอยู่แล้ว

ทำไมใช้สัญญาณสังเคราะห์: ถ้าเทสต์ด้วยไฟล์เสียงจริง เราจะไม่รู้ค่าที่ถูกต้อง
จึง assert ได้แค่ว่า "ไม่ crash" ซึ่งไม่ได้พิสูจน์ว่าวัดถูก การสร้างคลื่น
ที่ความถี่ที่กำหนดเองทำให้ตรวจได้ว่าตัวเลขที่คืนมาตรงกับความจริงหรือไม่

สัญญาณที่ใช้เป็นคลื่นไซน์ที่ลดทอนแบบเอ็กซ์โพเนนเชียล ซึ่งเป็นรูปของการสั่น
อิสระที่มีการหน่วง — รูปแบบเดียวกับที่ผลไม้สั่นหลังถูกเคาะ
"""

from __future__ import annotations

import io
import math
import wave

import numpy as np
import pytest

import acoustic

SR = 44100


def knock_clip(
    frequency_hz: float = 180.0,
    impulses: int = 4,
    decay_s: float = 0.05,
    gap_s: float = 0.5,
    amplitude: float = 0.4,
    noise: float = 0.0005,
    sample_rate: int = SR,
    seed: int = 7,
) -> np.ndarray:
    """สร้างคลิปเสียงเคาะสังเคราะห์: คลื่นไซน์ลดทอน คั่นด้วยความเงียบ"""
    rng = np.random.default_rng(seed)
    total = int(sample_rate * (gap_s * impulses + 0.2))
    signal = rng.normal(0.0, noise, total)
    ring_len = int(sample_rate * min(gap_s * 0.8, 0.3))
    t = np.arange(ring_len) / sample_rate
    ring = amplitude * np.exp(-t / decay_s) * np.sin(2 * math.pi * frequency_hz * t)
    for i in range(impulses):
        start = int(sample_rate * (0.1 + i * gap_s))
        signal[start : start + ring_len] += ring
    return signal


def to_wav_bytes(signal: np.ndarray, sample_rate: int = SR) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(sample_rate)
        handle.writeframes((np.clip(signal, -1, 1) * 32767).astype("<i2").tobytes())
    return buffer.getvalue()


# ---------------------------------------------------------------- การวัดถูกต้อง


@pytest.mark.parametrize("frequency", [95.0, 140.0, 180.0, 260.0, 420.0])
def test_measures_the_frequency_that_was_put_in(frequency):
    """ความถี่ที่คืนมาต้องตรงกับความถี่ที่สังเคราะห์ไว้

    ยอมคลาดได้ 5% เพราะความละเอียดของ FFT บนหน้าต่าง 120 ms อยู่ราว 8 Hz
    """
    reading = acoustic.analyse(knock_clip(frequency_hz=frequency), SR)

    assert abs(reading.dominant_frequency_hz - frequency) <= frequency * 0.05, (
        f"สังเคราะห์ที่ {frequency} Hz แต่วัดได้ {reading.dominant_frequency_hz} Hz"
    )


def test_counts_the_knocks():
    reading = acoustic.analyse(knock_clip(impulses=4), SR)
    assert reading.impulse_count == 4


def test_repeated_knocks_at_one_frequency_have_low_spread():
    """เคาะความถี่เดียวกันหลายครั้ง ความกระจายต้องน้อย — เป็นตัวบ่งความน่าเชื่อ"""
    reading = acoustic.analyse(knock_clip(frequency_hz=180.0, impulses=5), SR)
    assert reading.frequency_spread_hz <= 20.0


def test_faster_decay_reports_shorter_decay_time():
    """เนื้อที่หน่วงเร็วต้องได้ decay_time น้อยกว่า ไม่ใช่ค่าคงที่"""
    soft = acoustic.analyse(knock_clip(decay_s=0.02), SR)
    firm = acoustic.analyse(knock_clip(decay_s=0.12), SR)

    assert soft.decay_time_ms < firm.decay_time_ms


def test_wav_and_pcm_paths_agree():
    """สองเส้นทางรับข้อมูลต้องได้ผลเดียวกัน ไม่งั้นผลขึ้นกับว่าอัปโหลดแบบไหน"""
    signal = knock_clip(frequency_hz=210.0)

    from_wav, rate_wav = acoustic.decode_wav(to_wav_bytes(signal))
    import base64

    encoded = base64.b64encode(signal.astype("<f4").tobytes()).decode()
    from_pcm, rate_pcm = acoustic.decode_pcm_base64(encoded, SR)

    assert rate_wav == rate_pcm == SR
    a = acoustic.analyse(from_wav, rate_wav)
    b = acoustic.analyse(from_pcm, rate_pcm)
    assert abs(a.dominant_frequency_hz - b.dominant_frequency_hz) <= 10.0


# ------------------------------------------------- ปฏิเสธเมื่อวัดไม่ได้ ไม่เดา


def test_refuses_silence():
    """ความเงียบต้องถูกปฏิเสธ ไม่ใช่คืนความถี่ที่คำนวณจากเสียงรบกวน"""
    with pytest.raises(acoustic.AcousticUnmeasurable, match="ไม่พบจังหวะเคาะ"):
        acoustic.analyse(np.zeros(SR), SR)


def test_refuses_pure_noise():
    """เสียงรบกวนล้วนไม่มีจังหวะเคาะที่ชัด ต้องไม่ได้ตัวเลขออกมา"""
    rng = np.random.default_rng(1)
    with pytest.raises(acoustic.AcousticUnmeasurable):
        acoustic.analyse(rng.normal(0, 0.05, SR * 2), SR)


def test_refuses_clip_that_is_too_short():
    with pytest.raises(acoustic.AcousticUnmeasurable, match="สั้นกว่าขั้นต่ำ"):
        acoustic.analyse(knock_clip(impulses=1, gap_s=0.05)[: int(SR * 0.1)], SR)


def test_refuses_clipped_signal():
    """สัญญาณล้นทำให้ความถี่เพี้ยน จึงต้องปฏิเสธ ไม่ใช่รายงานค่าที่เพี้ยน"""
    loud = knock_clip(amplitude=3.0)
    with pytest.raises(acoustic.AcousticUnmeasurable, match="สัญญาณล้น"):
        acoustic.analyse(np.clip(loud, -1.0, 1.0), SR)


def test_refuses_knock_with_no_energy_in_the_resonance_band():
    """เคาะวัตถุที่กำทอนนอกช่วงของผลแตงโม เช่น 2 kHz ต้องไม่ถูกรายงานเป็นผล"""
    with pytest.raises(acoustic.AcousticUnmeasurable):
        acoustic.analyse(knock_clip(frequency_hz=2500.0), SR)


def test_refuses_low_snr():
    """เสียงเคาะที่จมอยู่ในเสียงรบกวนต้องถูกปฏิเสธพร้อมบอกเหตุ"""
    with pytest.raises(acoustic.AcousticUnmeasurable, match="เสียงรบกวน"):
        acoustic.analyse(knock_clip(amplitude=0.02, noise=0.02), SR)


def test_rejects_impossible_mass():
    with pytest.raises(acoustic.AcousticUnmeasurable, match="นอกช่วงที่เป็นไปได้"):
        acoustic.analyse(knock_clip(), SR, mass_kg=99.0)


# ------------------------------------------------------------ ความซื่อสัตย์ของผล


def test_never_reports_a_brix_number():
    """กฎสำคัญที่สุดของเอ็นด์พอยต์นี้ — ห้ามมีตัวเลขความหวานออกไป"""
    payload = acoustic.analyse(knock_clip(), SR, mass_kg=4.2).to_dict()

    assert payload["brix_estimate"] is None
    assert payload["maturity_grade"] is None
    assert "ปรับเทียบ" in payload["brix_unavailable_reason_th"]


def test_stiffness_needs_mass_and_says_so():
    without = acoustic.analyse(knock_clip(), SR)
    assert without.stiffness_index is None
    assert any("น้ำหนัก" in note for note in without.notes_th)

    with_mass = acoustic.analyse(knock_clip(), SR, mass_kg=4.0)
    assert with_mass.stiffness_index is not None


def test_single_knock_is_flagged_as_unverified():
    """เคาะครั้งเดียววัดได้ แต่ต้องบอกว่ายังไม่รู้ว่าวัดซ้ำจะได้ค่าใกล้กันไหม"""
    reading = acoustic.analyse(knock_clip(impulses=1, gap_s=0.6), SR)

    assert reading.impulse_count == 1
    assert any("ครั้งเดียว" in note for note in reading.notes_th)


# -------------------------------------------------------------- ดัชนีความแข็ง


def test_stiffness_index_cancels_the_effect_of_size():
    """ผลใหญ่ที่เนื้อแข็งเท่ากันสั่นช้ากว่า ดัชนีจึงต้องออกมาใกล้กัน

    นี่คือเหตุผลทั้งหมดที่ใช้ S = f²·m^(2/3) แทนความถี่ดิบ ถ้าเทียบด้วย
    ความถี่ดิบ ผลใหญ่จะดูสุกกว่าผลเล็กทุกครั้งทั้งที่เนื้อแข็งเท่ากัน
    """
    # f ∝ m^(-1/3) เมื่อความแข็งเนื้อเท่ากัน
    small_mass, large_mass = 3.0, 6.0
    small_f = 200.0
    large_f = small_f * (small_mass / large_mass) ** (1.0 / 3.0)

    s_small = acoustic.stiffness_index(small_f, small_mass)
    s_large = acoustic.stiffness_index(large_f, large_mass)

    assert abs(s_small - s_large) / s_small < 0.01


def test_softer_flesh_gives_a_lower_stiffness_index():
    firm = acoustic.stiffness_index(220.0, 4.0)
    soft = acoustic.stiffness_index(150.0, 4.0)
    assert soft < firm


# ------------------------------------------------------- การเทียบภายในล็อต


def test_batch_ranks_softest_first():
    result = acoustic.compare_batch(
        [
            {"id": "a", "stiffness_index": 9000.0},
            {"id": "b", "stiffness_index": 4000.0},
            {"id": "c", "stiffness_index": 6500.0},
        ]
    )

    assert [row["id"] for row in result["ranked"]] == ["b", "c", "a"]
    assert result["ranked"][0]["rank_softest_first"] == 1
    assert result["comparable_count"] == 3


def test_batch_excludes_fruit_without_mass_instead_of_mixing_them_in():
    """ผลที่ไม่ได้ชั่งน้ำหนักต้องถูกแยกออก พร้อมเหตุผล ไม่ใช่เรียงปนด้วยความถี่ดิบ"""
    result = acoustic.compare_batch(
        [
            {"id": "weighed", "stiffness_index": 5000.0},
            {"id": "unweighed", "stiffness_index": None},
        ]
    )

    assert [row["id"] for row in result["ranked"]] == ["weighed"]
    assert result["excluded"][0]["id"] == "unweighed"
    assert "ชั่งน้ำหนัก" in result["excluded"][0]["reason_th"]


def test_batch_of_one_says_it_cannot_rank():
    result = acoustic.compare_batch([{"id": "only", "stiffness_index": 5000.0}])
    assert "น้อยกว่า 2 ลูก" in result["note_th"]


def test_batch_ranking_does_not_claim_ripeness():
    """อันดับบอกว่าควรตัดลูกไหนก่อน ไม่ได้บอกว่าลูกไหนสุกพอดี"""
    note = acoustic.compare_batch(
        [{"id": "a", "stiffness_index": 1.0}, {"id": "b", "stiffness_index": 2.0}]
    )["note_th"]

    assert "ไม่ได้บอกว่าลูกไหนสุกพอดี" in note


def test_service_info_states_what_it_cannot_do():
    info = acoustic.service_info()
    assert info["costs_money"] is False
    assert any("Brix" in item for item in info["does_not_measure_th"])
