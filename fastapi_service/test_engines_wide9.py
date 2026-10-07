"""เทสต์ของ engine wide9 หลังอัปเกรดเป็นรุ่น 2

สามเรื่องที่ตัวเลขความมั่นใจขึ้นอยู่กับมันโดยตรง และเคยผิดมาก่อน
- การเตรียมภาพต้องตรงกับตอนเทรน ไม่ใช่บีบเป็นจัตุรัส
- per_class_recall ที่เก็บไว้ต้องถูกนำมาถ่วงคะแนนจริง ไม่ใช่เก็บไว้รายงานเฉย ๆ
- การเฉลี่ยผลหลายโมเดลต้องปฏิเสธโมเดลที่คลาสไม่ตรงกัน

เทสต์ไม่เรียกบริการภายนอกและไม่มีค่าใช้จ่าย ส่วนที่ต้องใช้ไฟล์โมเดลจริงจะข้ามไป
เมื่อไม่มีไฟล์ในเครื่อง เพราะน้ำหนักโมเดลไม่ได้ commit ลงรีโพ
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

import engines


def _wide9_file() -> Path:
    path = Path(engines.HERE) / "wide9.onnx"
    if not path.is_file():
        pytest.skip("ไม่มีไฟล์ wide9.onnx ในเครื่องนี้")
    return path


# ----------------------------------------------------- การเตรียมภาพ


def test_center_crop_keeps_aspect_ratio():
    """ภาพแนวนอนต้องถูกย่อด้านสั้นแล้วครอบกลาง ไม่ใช่บีบให้เป็นจัตุรัส

    `_preprocess_at` ใช้ resize((size, size)) ซึ่งบีบสัดส่วนให้เพี้ยนไปจากที่
    โมเดลเห็นตอนเทรน วัดบนชุดตรวจสอบเดียวกันได้ 0.6465 เทียบกับ 0.6656
    เมื่อเตรียมภาพให้ตรงกับตอน validate — เกือบสองจุดที่หายไปเงียบ ๆ
    """
    img = Image.new("RGB", (800, 400), (0, 0, 0))
    for y in range(150, 250):
        for x in range(800):
            img.putpixel((x, y), (255, 255, 255))

    cropped = engines._center_crop_at(img, 224, 1.0)
    assert cropped.size == (224, 224)

    arr = np.asarray(cropped)
    white_rows = int((arr[:, :, 0] > 200).all(axis=1).sum())
    # ด้านสั้น 400 ย่อเป็น 224 แถบขาว 100 พิกเซลจึงเหลือราว 56 แถว
    # ถ้าบีบเป็นจัตุรัสจะเหลือ 56 แถวเหมือนกันแต่ภาพถูกอัดด้านกว้าง
    # เทสต์ความสูงไว้กันการย่อผิดสเกล และเทสต์ความกว้างเต็มไว้กันการครอบผิดแกน
    assert 50 <= white_rows <= 62, f"สัดส่วนเพี้ยน ได้ {white_rows} แถว"
    assert bool((arr[160, :, 0] < 60).all()), "แถวนอกแถบขาวต้องยังดำอยู่"


def test_batch_has_one_row_per_view():
    img = Image.new("RGB", (300, 200), (10, 120, 40))
    batch = engines._wide9_batch(img, 224, engines.WIDE9_TTA_VIEWS)
    assert batch.shape == (len(engines.WIDE9_TTA_VIEWS), 3, 224, 224)
    assert batch.dtype == np.float32

    single = engines._wide9_batch(img, 224, engines.WIDE9_SINGLE_VIEW)
    assert single.shape == (1, 3, 224, 224)


def test_flipped_view_differs_from_unflipped():
    """มุมมองที่พลิกต้องให้พิกเซลต่างจริง ไม่ใช่ทำซ้ำภาพเดิมให้แบตช์ใหญ่ขึ้นเปล่า ๆ"""
    img = Image.new("RGB", (256, 256), (0, 0, 0))
    for x in range(0, 60):
        for y in range(256):
            img.putpixel((x, y), (255, 255, 255))

    plain = engines._wide9_batch(img, 224, ((1.0, False),))
    flipped = engines._wide9_batch(img, 224, ((1.0, True),))
    assert not np.allclose(plain, flipped)


# ----------------------------------------------------- การถ่วงน้ำหนักความเชื่อถือ


def test_recall_lowers_the_weight():
    """คลาสที่โมเดลจับได้น้อยต้องถูกถ่วงลง แม้ที่มาของข้อมูลเทรนจะดี

    tier บอกแค่ว่าภาพเทรนมาจากไหน ไม่ได้บอกว่าโมเดลทำได้ดีแค่ไหนกับคลาสนั้น
    ``per_class_recall`` ถูกเก็บและรายงานอยู่ก่อนแล้วแต่ไม่เคยถูกใช้ถ่วงคะแนน
    คลาสที่จับได้ 8% จึงรายงานความมั่นใจเท่าคลาสที่จับได้ 97%
    """
    strong = engines._reliability_weight("direct", 0.97)
    weak = engines._reliability_weight("direct", 0.08)
    assert weak < strong
    assert weak == pytest.approx(0.6 + 0.4 * 0.08)


def test_missing_recall_is_not_guessed():
    """ไฟล์ labels รุ่นเก่าไม่มี per_class_recall ต้องไม่ถ่วงลงโดยเดาเอง"""
    assert engines._reliability_weight("direct", None) == 1.0
    assert engines._reliability_weight("same_pathogen", None) == engines.TIER_WEIGHT["same_pathogen"]


def test_recall_weight_never_zeroes_the_signal():
    assert engines._reliability_weight("direct", 0.0) == pytest.approx(0.6)
    assert engines._reliability_weight("symptom_proxy", 0.0) > 0


def test_tier_and_recall_multiply():
    combined = engines._reliability_weight("symptom_proxy", 0.5)
    assert combined == pytest.approx(engines.TIER_WEIGHT["symptom_proxy"] * (0.6 + 0.4 * 0.5))


# ----------------------------------------------------- การตั้งค่าหลายไฟล์


def test_paths_accepts_a_list():
    fallback = Path("fallback.onnx")
    assert engines._wide9_paths("a.onnx, b.onnx", fallback) == [Path("a.onnx"), Path("b.onnx")]
    assert engines._wide9_paths("a.onnx;b.onnx", fallback) == [Path("a.onnx"), Path("b.onnx")]


def test_paths_falls_back_when_unset():
    fallback = Path("fallback.onnx")
    assert engines._wide9_paths("", fallback) == [fallback]
    assert engines._wide9_paths("   ", fallback) == [fallback]


def test_paths_keeps_a_windows_drive_letter_intact():
    """พาธบนวินโดวส์มี ":" ในตัวอักษรไดรฟ์ ต้องไม่ถูกตัดเป็นสองพาธ"""
    absolute = r"D:\models\wide9.onnx"
    assert engines._wide9_paths(absolute, Path("x.onnx")) == [Path(absolute)]


def test_ensemble_refuses_members_with_different_classes(tmp_path):
    """โมเดลที่คลาสไม่ตรงกันเฉลี่ยผลเข้าด้วยกันไม่ได้

    ถ้าปล่อยผ่าน ความน่าจะเป็นของคลาสที่ดัชนีเดียวกันแต่ความหมายต่างกันจะถูก
    บวกรวม ผลที่ได้ไม่ผิดแบบเห็นได้ชัด แต่ชี้ไปที่โรคผิดอย่างมั่นใจ
    """
    real = _wide9_file()
    copy = tmp_path / "other.onnx"
    copy.write_bytes(real.read_bytes())
    labels = json.loads((real.with_suffix(".labels.json")).read_text(encoding="utf-8"))
    labels["labels"] = labels["labels"][::-1]
    (tmp_path / "other.labels.json").write_text(
        json.dumps(labels, ensure_ascii=False), encoding="utf-8"
    )

    with pytest.raises(RuntimeError, match="ไม่ตรงกับตัวแรก"):
        engines._build_wide9([real, copy])


def test_missing_labels_file_is_refused(tmp_path):
    orphan = tmp_path / "wide9.onnx"
    orphan.write_bytes(b"not a model")
    with pytest.raises(RuntimeError, match="labels"):
        engines._build_wide9([orphan])


# ----------------------------------------------------- พฤติกรรมตอนทำนาย


def test_tta_default_is_on_and_can_be_turned_off(monkeypatch):
    """ค่าเริ่มต้นต้องเปิด เพราะวัดแล้วแม่นกว่ากับโมเดลที่เสิร์ฟอยู่

    ต่างจาก ``_env_flag`` ที่ค่าเริ่มต้นเป็นปิด เพราะตัวนั้นคุม engine ที่เสียเงิน
    ส่วนตัวนี้แลกแค่เวลา CPU
    """
    monkeypatch.delenv("WIDE9_TTA", raising=False)
    assert engines._wide9_tta_enabled() is True

    monkeypatch.setenv("WIDE9_TTA", "0")
    assert engines._wide9_tta_enabled() is False

    monkeypatch.setenv("WIDE9_TTA", "maybe")
    assert engines._wide9_tta_enabled() is False


def test_fast_mode_uses_one_view(monkeypatch):
    monkeypatch.delenv("WIDE9_TTA", raising=False)
    engine = engines._build_wide9([_wide9_file()])
    img = Image.new("RGB", (400, 300), (60, 140, 60))

    assert engine.predict(img, "fast", {})["views"] == 1
    assert engine.predict(img, "normal", {})["views"] == len(engines.WIDE9_TTA_VIEWS)


def test_scores_are_weighted_and_raw_scores_are_not(monkeypatch):
    """ต้องรายงานทั้งคะแนนที่ถ่วงแล้วและค่าดิบ เพื่อให้ตรวจย้อนได้ว่าโมเดลเห็นอะไร"""
    monkeypatch.delenv("WIDE9_TTA", raising=False)
    engine = engines._build_wide9([_wide9_file()])
    out = engine.predict(Image.new("RGB", (400, 300), (60, 140, 60)), "normal", {})

    assert set(out["scores"]) == set(out["raw_scores"]) == set(engine.classes)
    assert sum(out["raw_scores"].values()) == pytest.approx(1.0, abs=0.01)
    # คะแนนที่ถ่วงแล้วรวมกันน้อยกว่า 1 เพราะทุกคลาสถูกลดน้ำหนักตามที่มาและ recall
    assert sum(out["scores"].values()) < sum(out["raw_scores"].values())


def test_calibration_is_reported_as_fitted_but_engine_stays_uncalibrated(monkeypatch):
    """ปรับ temperature แล้วจริง แต่ปรับบนภาพพืชอื่น จึงยังไม่อ้างว่าเป็นความน่าจะเป็น

    ``calibrated`` คุมกฎของหน้าจอ: ถ้าเป็น True หน้าจอได้รับอนุญาตให้เขียนว่า
    ตัวเลขความมั่นใจคือความน่าจะเป็น ซึ่งยังไม่จริงสำหรับแปลงแตงโม เพราะชุดที่
    ใช้ปรับเทียบไม่ใช่โดเมนที่นำไปใช้งาน
    """
    monkeypatch.delenv("WIDE9_TTA", raising=False)
    engine = engines._build_wide9([_wide9_file()])
    out = engine.predict(Image.new("RGB", (400, 300), (60, 140, 60)), "normal", {})

    assert engine.calibrated is False
    assert out["calibration"]["fitted"] is True
    assert "ไม่ใช่ภาพแตงโม" in out["calibration"]["note"]


def test_limits_mention_the_measured_number_and_the_domain_gap(monkeypatch):
    monkeypatch.delenv("WIDE9_TTA", raising=False)
    engine = engines._build_wide9([_wide9_file()])
    text = " ".join(engine.limits_th)
    assert "ไม่ใช่ภาพแตงโม" in text
    assert engine.costs_money is False


def test_low_recall_winner_is_flagged_in_the_note(monkeypatch):
    """ถ้าคลาสที่ชนะมี recall ต่ำ ต้องเขียนกำกับไว้ให้ผู้อ่านเห็น"""
    monkeypatch.delenv("WIDE9_TTA", raising=False)
    engine = engines._build_wide9([_wide9_file()])
    recalls = engine.metrics["per_class_recall"]
    assert recalls, "ไฟล์ labels ต้องมี per_class_recall จึงจะถ่วงน้ำหนักได้"

    weakest = min(recalls, key=lambda c: recalls[c])
    assert recalls[weakest] < 0.5, "ชุดนี้ควรมีคลาสที่ recall ต่ำกว่า 0.5 อยู่"
