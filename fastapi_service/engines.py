"""ทะเบียนเครื่องยนต์วิเคราะห์ภาพหลายตัวที่ใช้สลับกันได้

ทำไมต้องมีหลายตัว ไม่ใช่เปลี่ยนไปใช้ตัวที่ใหม่กว่าตัวเดียว:
``legacy4`` ผ่านการวัดผลบนชุดทดสอบจริง ปรับเทียบอุณหภูมิมาแล้ว และกฎรวมผล
ของมัน (``crop-may-escalate-healthy-never-downgrade-disease``) ถูกออกแบบจาก
ความผิดพลาดที่วัดได้จริงของโมเดลตัวนั้น ส่วน ``wide9`` ครอบคลุมโรคมากกว่า
แต่เทรนจากภาพโรคของพืชอื่นเป็นตัวแทนบางคลาส ไม่มีตัวใดดีกว่าอีกตัวในทุกงาน
จึงเก็บไว้ทั้งคู่และให้ผู้เรียกเลือก

สิ่งที่ engine ทุกตัวแชร์กันคือ ``leafcheck`` ซึ่งตัดสินว่าภาพอ่านได้หรือไม่
และมีเนื้อใบอยู่ในเฟรมหรือไม่ เพราะนั่นเป็นคุณสมบัติของภาพ ไม่ใช่ของโมเดล
ภาพที่ไม่ผ่านด่านนี้ถูกปฏิเสธก่อนถึงโมเดลทุกตัว

สิ่งที่ไม่แชร์กันคือเส้นทางอนุมานและค่าปรับเทียบ การนำ temperature ที่ fit มากับ
โมเดลหนึ่งไปใช้กับอีกโมเดลทำให้ตัวเลขความมั่นใจผิด ไม่ใช่แค่คลาดเคลื่อน

ขอบเขตเดียวกับ ``main.py``: ที่นี่ไม่รู้จักชื่อโรคภาษาไทย อัตราสารเคมี หรือ
ระยะเก็บเกี่ยวปลอดภัย ``class_id`` ที่คืนออกไปคือป้ายของโมเดลตามที่เทรนมา
การจับคู่กับรหัสโรคในแคตตาล็อกอยู่ที่ ``src/lib/diseaseModel.ts`` ที่เดียว
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from collections.abc import Sequence
from typing import Any, Callable

import numpy as np
import onnxruntime as ort
from PIL import Image

import inference
import leafcheck
from model import MEAN, STD, softmax

HERE = Path(__file__).parent

# น้ำหนักความเชื่อถือตามที่มาของภาพที่ใช้เทรนแต่ละคลาส
# wide9 บางคลาสเทรนจากภาพโรคของพืชอื่นที่อาการคล้ายกัน ไม่ใช่ภาพแตงโม
# ถ้าไม่ลดน้ำหนักลง ตัวเลขความมั่นใจของคลาสเหล่านั้นจะสูงเกินกว่าหลักฐานที่มี
# ค่าชุดนี้ตรงกับที่โปรเจกต์ต้นทางใช้ และมีผลการวัด recall รายคลาสรองรับ
TIER_WEIGHT: dict[str, float] = {
    "direct": 1.0,
    "same_pathogen": 0.95,
    "same_genus": 0.8,
    "symptom_proxy": 0.55,
    "generic": 0.85,
}

TIER_NOTE_TH: dict[str, str] = {
    "direct": "เทรนจากภาพแตงโมโดยตรง",
    "same_pathogen": "เทรนจากภาพเชื้อชนิดเดียวกันบนพืชอื่น",
    "same_genus": "เทรนจากภาพเชื้อสกุลเดียวกันบนพืชอื่น",
    "symptom_proxy": "เทรนจากภาพโรคของพืชอื่นที่อาการคล้ายกันเท่านั้น",
    "generic": "เทรนจากใบปกติของพืชหลายชนิด",
}

# มุมพลิกภาพที่ใช้เฉลี่ยผล ปลอดภัยกับทุกโมเดลเพราะไม่ขึ้นกับความหมายของคลาส
FLIP_VIEWS = ("identity", "hflip", "vflip")


class EngineUnavailable(RuntimeError):
    """engine เรียกไม่ได้ด้วยเหตุที่ผู้ดูแลระบบต้องไปแก้ ไม่ใช่เหตุชั่วคราว

    แยกจากความล้มเหลวทั่วไปเพราะสองอย่างนี้ต้องบอกผู้ใช้ต่างกัน เครือข่ายสะดุด
    หรือโมเดลรับคำขอไม่ทันคือเหตุชั่วคราว บอกให้ลองใหม่ได้ แต่คีย์หมดอายุ
    เครดิตหมด หรือชื่อโมเดลผิด จะล้มเหมือนเดิมทุกครั้งที่ลองใหม่ ถ้าตอบรวมกัน
    เป็น "ลองใหม่ภายหลัง" เกษตรกรจะกดซ้ำไปเรื่อย ๆ โดยไม่มีใครรู้ว่าต้องไปเติมเงิน
    """


@dataclass
class Engine:
    """เครื่องยนต์หนึ่งตัวที่พร้อมรับภาพ"""

    name: str
    title_th: str
    classes: list[str]
    image_size: int
    model_version: str
    description_th: str
    good_for_th: list[str]
    limits_th: list[str]
    calibrated: bool
    # (ภาพ, mode, บริบทจากผู้เรียก) -> ผลลัพธ์
    # บริบทมีไว้ให้ engine ที่ต้องรู้รายชื่อโรคที่เลือกได้ (claude) โดยผู้เรียกส่งมา
    # engine ที่เป็นโมเดลจำแนกไม่ใช้บริบทนี้ เพราะคลาสถูกตรึงมาตั้งแต่ตอนเทรน
    predict: Callable[[Image.Image, str, dict[str, Any]], dict[str, Any]]
    needs_candidates: bool = False
    # เรียกครั้งหนึ่งมีค่าใช้จ่ายกับผู้ให้บริการภายนอกหรือไม่
    # ผู้เรียกต้องรู้ก่อนเลือก ไม่ใช่รู้ตอนได้ใบแจ้งหนี้
    costs_money: bool = False
    class_tiers: dict[str, str] = field(default_factory=dict)
    metrics: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """ข้อมูลที่ผู้เรียกใช้เลือก engine ได้อย่างมีข้อมูลประกอบ"""
        return {
            "name": self.name,
            "title_th": self.title_th,
            "needs_candidates": self.needs_candidates,
            "classes": self.classes,
            "class_count": len(self.classes),
            "image_size": self.image_size,
            "model_version": self.model_version,
            "description_th": self.description_th,
            "good_for_th": self.good_for_th,
            "limits_th": self.limits_th,
            "calibrated": self.calibrated,
            "costs_money": self.costs_money,
            "class_provenance": {
                cls: {"tier": tier, "note_th": TIER_NOTE_TH.get(tier, tier)}
                for cls, tier in sorted(self.class_tiers.items())
            },
            "metrics": self.metrics,
        }


def _load_session(path: Path) -> tuple[ort.InferenceSession, str, str, str]:
    """เปิด ONNX session คืน (session, ชื่ออินพุต, ชื่อเอาต์พุต, ลายนิ้วมือไฟล์)"""
    session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
    return session, session.get_inputs()[0].name, session.get_outputs()[0].name, digest


def _preprocess_at(image: Image.Image, size: int) -> np.ndarray:
    """เตรียมภาพเป็น NCHW ที่ขนาดที่โมเดลนั้นต้องการ

    ``model.preprocess`` ตรึงขนาดไว้ที่ของ legacy4 จึงต้องมีตัวที่รับขนาดได้
    ค่าเฉลี่ยและส่วนเบี่ยงเบนใช้ของ ImageNet เหมือนกันทั้งสองโมเดล
    เพราะทั้งคู่เริ่มจากน้ำหนัก ImageNet
    """
    resized = image.convert("RGB").resize((size, size), Image.BILINEAR)
    array = np.asarray(resized, dtype=np.float32) / 255.0
    array = (array - MEAN) / STD
    return np.ascontiguousarray(array.transpose(2, 0, 1)[np.newaxis], dtype=np.float32)


def _flip(batch: np.ndarray, view: str) -> np.ndarray:
    if view == "hflip":
        return batch[:, :, :, ::-1]
    if view == "vflip":
        return batch[:, :, ::-1, :]
    return batch


# ---------------------------------------------------------------- legacy4


def _build_legacy4(
    model_path: Path,
    session: ort.InferenceSession,
    input_name: str,
    output_name: str,
    calibration: inference.Calibration,
    model_version: str,
) -> Engine:
    """โมเดลเดิม 4 คลาส — เรียก inference.run ตามเดิมทุกตัวอักษร

    รับ session ที่ ``main.py`` เปิดและตรวจความถูกต้องไว้แล้ว ไม่เปิดใหม่
    เพื่อไม่ให้โหลดโมเดลซ้ำสองรอบ และให้ด่านตรวจตอนสตาร์ทอยู่ที่เดียว
    ไม่แตะเส้นทางอนุมานนี้เลย เพราะค่าปรับเทียบและกฎรวมผลถูก fit มากับโมเดลตัวนี้
    """
    from model import CLASSES, IMAGE_SIZE

    version = model_version

    metrics_path = HERE / "metrics.json"
    metrics = json.loads(metrics_path.read_text(encoding="utf-8")) if metrics_path.exists() else {}

    def predict(image: Image.Image, mode: str, _context: dict[str, Any]) -> dict[str, Any]:
        payload = inference.run(
            session,
            input_name,
            output_name,
            image,
            mode=mode,
            calibration=calibration,
            model_version=version,
        )
        payload["engine"] = "legacy4"
        return payload

    return Engine(
        name="legacy4",
        title_th="โมเดลหลัก 4 คลาส (ปรับเทียบแล้ว)",
        classes=list(CLASSES),
        image_size=IMAGE_SIZE,
        model_version=version,
        description_th=(
            "โมเดลที่วัดผลบนชุดทดสอบจริงและปรับเทียบความน่าจะเป็นแล้ว "
            "รวมผลจากหลายมุมและหลายบริเวณของภาพ พร้อมกฎที่ให้บริเวณย่อยยกระดับ "
            "ผลจาก Healthy เป็นโรคได้ แต่ห้ามลดระดับจากโรคเป็น Healthy"
        ),
        good_for_th=[
            "ตรวจ 4 โรคหลักที่โมเดลนี้เทรนจากภาพใบแตงโมโดยตรง",
            "งานที่ต้องการตัวเลขความมั่นใจที่ปรับเทียบแล้ว",
            "ภาพที่มีแผลกระจุกอยู่บางบริเวณของใบ",
        ],
        limits_th=[
            "ตรวจได้เพียง 4 คลาส นอกเหนือจากนี้จะถูกบังคับให้ตอบคลาสที่ใกล้ที่สุด",
        ],
        calibrated=calibration.fitted,
        predict=predict,
        class_tiers={cls: "direct" for cls in CLASSES},
        metrics=metrics,
    )


# ---------------------------------------------------------------- wide9

# มุมมองที่ใช้ตอนทำ TTA: (อัตราขยายก่อนครอบกลาง, พลิกซ้ายขวาหรือไม่)
# วัดบนชุดตรวจสอบ 314 ภาพของโมเดลที่เสิร์ฟอยู่: หกมุมมองนี้ให้ 0.7707
# เทียบมุมมองเดียว 0.7452 จึงคุ้มกับเวลาที่เพิ่ม
# TTA ไม่ใช่กำไรฟรีเสมอ โมเดลที่ทนสเกลอยู่แล้วอาจแย่ลงเมื่อเพิ่มมุมมองซูม
# ต้องวัดใหม่ทุกครั้งที่เปลี่ยนไฟล์โมเดล
WIDE9_TTA_VIEWS: tuple[tuple[float, bool], ...] = (
    (1.0, False),
    (1.15, False),
    (1.35, False),
    (1.0, True),
    (1.15, True),
    (1.35, True),
)
# มุมมองเดียวที่ตรงกับการ validate ตอนเทรน ใช้เมื่อ mode == "fast" หรือปิด TTA
WIDE9_SINGLE_VIEW: tuple[tuple[float, bool], ...] = ((1.15, False),)


def _center_crop_at(image: Image.Image, size: int, ratio: float) -> Image.Image:
    """ย่อด้านสั้นให้เท่า ``size * ratio`` แล้วครอบกลางเป็นจัตุรัส ``size``

    ``_preprocess_at`` บีบภาพเป็นจัตุรัสด้วย ``resize((size, size))`` ซึ่งทำให้
    สัดส่วนเพี้ยนไปจากที่โมเดลเคยเห็นตอนเทรน เพราะตอน validate ใช้
    Resize(ด้านสั้น) + CenterCrop วัดผลต่างได้ 1.9 จุดบนชุดตรวจสอบเดียวกัน
    (0.6465 เทียบ 0.6656) เป็นความแม่นยำที่หายไปโดยไม่มีใครรู้ เพราะตัวเลขที่
    รายงานไว้มาจากการวัดด้วยวิธีเตรียมภาพอีกแบบที่ผู้ใช้ไม่ได้รับ
    """
    short = max(1, int(round(size * ratio)))
    width, height = image.size
    scale = short / max(1, min(width, height))
    resized = image.resize(
        (max(size, round(width * scale)), max(size, round(height * scale))), Image.BICUBIC
    )
    width, height = resized.size
    left, top = (width - size) // 2, (height - size) // 2
    return resized.crop((left, top, left + size, top + size))


def _wide9_batch(
    image: Image.Image, size: int, views: tuple[tuple[float, bool], ...]
) -> np.ndarray:
    """สร้างแบตช์ของทุกมุมมองจากภาพเดียว เป็น NCHW"""
    rgb = image.convert("RGB")
    tensors = []
    for ratio, flip in views:
        source = rgb.transpose(Image.FLIP_LEFT_RIGHT) if flip else rgb
        array = np.asarray(_center_crop_at(source, size, ratio), dtype=np.float32) / 255.0
        array = (array - MEAN) / STD
        tensors.append(array.transpose(2, 0, 1))
    return np.ascontiguousarray(np.stack(tensors), dtype=np.float32)


def _reliability_weight(tier: str, recall: float | None) -> float:
    """น้ำหนัก = ที่มาของข้อมูลเทรน คูณ ความสามารถจับคลาสนั้นได้จริง

    ``per_class_recall`` ถูกเก็บและรายงานอยู่แล้วแต่ไม่เคยถูกนำมาใช้ถ่วงคะแนน
    ระดับที่มา (tier) บอกว่าภาพเทรนมาจากไหน ไม่ได้บอกว่าโมเดลทำได้ดีแค่ไหน
    คลาสที่จับได้เพียง 8% ของกรณีจริงจึงรายงานความมั่นใจเท่าคลาสที่จับได้ 97%
    ซึ่งทำให้ผู้อ่านประเมินหลักฐานผิดและอาจพ่นสารผิดกลุ่ม

    สูตร 0.6 + 0.4 * recall ลดได้มากสุด 40% ไม่กลืนสัญญาณทิ้งทั้งหมด
    ถ้าไฟล์ labels ไม่มีค่า recall ของคลาสนั้นจะไม่ลด เพื่อไม่เดาแทนข้อมูลจริง
    """
    weight = TIER_WEIGHT.get(tier, 1.0)
    if recall is not None:
        weight *= 0.6 + 0.4 * max(0.0, min(1.0, recall))
    return weight


def _wide9_paths(raw: str, fallback: Path) -> list[Path]:
    """แยกรายการไฟล์โมเดลจากค่าที่ตั้งไว้ รับหลายไฟล์คั่นด้วย , หรือ ;

    ไม่แยกด้วย ":" เพราะพาธบนวินโดวส์มีอักขระนี้ในตัวอักษรไดรฟ์
    """
    text = (raw or "").replace(";", ",").strip()
    if not text:
        return [fallback]
    return [Path(part.strip()) for part in text.split(",") if part.strip()]


def _wide9_tta_enabled() -> bool:
    """WIDE9_TTA ค่าเริ่มต้นเป็น "เปิด" ต่างจาก _env_flag ที่ค่าเริ่มต้นเป็นปิด

    _env_flag ตั้งค่าเริ่มต้นเป็นปิดเพราะมันคุม engine ที่เสียเงิน ที่นี่ไม่มี
    ค่าใช้จ่าย มีแต่เวลา CPU และวัดแล้วว่าเปิดไว้แม่นกว่ากับโมเดลที่เสิร์ฟอยู่
    (0.7707 เทียบ 0.7452) จึงให้ค่าเริ่มต้นเป็นเปิด และปิดได้ด้วย WIDE9_TTA=0
    """
    raw = (os.getenv("WIDE9_TTA") or "").strip().lower()
    if not raw:
        return True
    return raw in {"1", "true", "yes", "on"}


def _build_wide9(model_paths: Path | Sequence[Path]) -> Engine:
    """โมเดล 9 คลาสจากโปรเจกต์วินิจฉัยโรคแตงโม

    ไม่นำกฎรวมผลและค่า temperature ของ legacy4 มาใช้ เพราะทั้งสองอย่างถูก fit
    มากับโมเดลนั้นและดัชนีคลาส Healthy ของมัน การใช้ผิดโมเดลทำให้ตัวเลขผิด

    รับหลายไฟล์เพื่อทำ ensemble ได้ ทุกตัวต้องมีคลาสและขนาดภาพตรงกัน
    การเฉลี่ยทำ **หลัง** softmax ไม่ใช่เฉลี่ย logits ดิบ เพราะสมาชิกแต่ละตัวมี
    สเกล logits ของตัวเอง การเฉลี่ย logits ให้ตัวที่มั่นใจเกินจริงลากผลรวมไปทั้งก้อน
    เหตุผลเดียวกันนี้ใช้กับการเฉลี่ยข้ามมุมมองของ TTA ด้วย
    """
    # รับไฟล์เดียวหรือหลายไฟล์ก็ได้ ตัวเรียกเดิมส่ง Path มาตัวเดียว
    paths = [model_paths] if isinstance(model_paths, Path) else list(model_paths)

    sessions: list[tuple[ort.InferenceSession, str, str, float, str]] = []
    base: dict[str, Any] | None = None
    classes: list[str] = []
    size = 224
    tiers: dict[str, str] = {}
    recall: dict[str, float] = {}

    for model_path in paths:
        # wide9.onnx -> wide9.labels.json (ชื่อเดียวกัน คนละนามสกุล)
        labels_path = model_path.with_suffix(".labels.json")
        if not labels_path.is_file():
            raise RuntimeError(
                f"พบไฟล์โมเดล {model_path.name} แต่ไม่พบ {labels_path.name} "
                "ซึ่งเก็บลำดับคลาสและที่มาของข้อมูลเทรน — ถ้าปล่อยผ่านจะจับคู่คลาสผิดตัว"
            )
        payload = json.loads(labels_path.read_text(encoding="utf-8"))
        member_classes: list[str] = payload["labels"]
        member_size = int(payload.get("input_size", 224))

        if base is None:
            base = payload
            classes = member_classes
            size = member_size
            tiers = dict(payload.get("class_tiers") or {})
            recall = dict(payload.get("per_class_recall") or {})
        elif member_classes != classes or member_size != size:
            raise RuntimeError(
                f"โมเดล {model_path.name} มีคลาสหรือขนาดภาพไม่ตรงกับตัวแรก "
                "จึงเฉลี่ยผลเข้าด้วยกันไม่ได้ ความน่าจะเป็นจะถูกบวกข้ามคลาสกัน"
            )

        session, input_name, output_name, digest = _load_session(model_path)
        output_shape = session.get_outputs()[0].shape
        if output_shape[-1] not in (len(classes), None, "classes"):
            raise RuntimeError(
                f"wide9 ({model_path.name}) ให้ผลลัพธ์ {output_shape} "
                f"ไม่ตรงกับ {len(classes)} คลาสใน {labels_path.name}"
            )
        # temperature ที่ fit ไว้บนชุดตรวจสอบของโมเดลตัวนั้น หารกับ logits ก่อน softmax
        # ไม่เปลี่ยนลำดับคลาสจึงไม่กระทบความแม่นยำ แต่ทำให้ตัวเลขใกล้ความจริงขึ้น
        temperature = float(payload.get("temperature") or 1.0)
        if temperature <= 0:
            temperature = 1.0
        sessions.append((session, input_name, output_name, temperature, digest))

    if base is None or not sessions:
        raise RuntimeError("ไม่มีไฟล์โมเดล wide9 ที่โหลดได้")

    arch = str(base.get("arch", "onnx"))
    version = f"{arch}@{'+'.join(d for *_rest, d in sessions)}"
    proxy = sorted(c for c, t in tiers.items() if t == "symptom_proxy")
    tta_enabled = _wide9_tta_enabled()
    measured_accuracy = base.get("val_accuracy")
    measured_ece = base.get("val_ece")

    def predict(image: Image.Image, mode: str, _context: dict[str, Any]) -> dict[str, Any]:
        started = time.perf_counter()
        quality, lesions = leafcheck.analyse(image)

        views = WIDE9_SINGLE_VIEW if (mode == "fast" or not tta_enabled) else WIDE9_TTA_VIEWS
        batch = _wide9_batch(image, size, views)

        member_probs = []
        for session, input_name, output_name, temperature, _digest in sessions:
            logits = np.asarray(
                session.run([output_name], {input_name: batch})[0], dtype=np.float32
            )
            logits = logits.reshape(-1, logits.shape[-1])
            member_probs.append(softmax(logits / temperature).mean(axis=0))
        probs = np.mean(member_probs, axis=0)

        # ลดน้ำหนักตามที่มาของข้อมูลเทรนและ recall จริง แล้วหาผู้ชนะจากคะแนนที่ถ่วงแล้ว
        weighted = {
            cls: float(p) * _reliability_weight(tiers.get(cls, "direct"), recall.get(cls))
            for cls, p in zip(classes, probs)
        }
        winner = max(weighted, key=lambda c: weighted[c])
        winner_tier = tiers.get(winner, "direct")
        winner_recall = recall.get(winner)

        note = (
            "ผลนี้ไม่ใช่คำวินิจฉัย ความมั่นใจถูกลดน้ำหนักตามที่มาของภาพที่ใช้เทรน "
            "และตามความสามารถจับคลาสนั้นได้จริงบนชุดตรวจสอบแล้ว"
        )
        if winner_tier == "symptom_proxy":
            note += (
                f" คลาส {winner} {TIER_NOTE_TH[winner_tier]} "
                "ต้องยืนยันด้วยการตรวจอาการในแปลงก่อนตัดสินใจใช้สารเคมี"
            )
        if winner_recall is not None and winner_recall < 0.5:
            note += (
                f" บนชุดตรวจสอบ โมเดลจับคลาสนี้ได้เพียง {winner_recall * 100:.0f}% "
                "ของกรณีที่เป็นคลาสนี้จริง จึงพลาดได้บ่อยกว่าที่ตัวเลขความมั่นใจชวนให้คิด"
            )

        return {
            "class_id": winner,
            "confidence": round(weighted[winner], 6),
            "scores": {cls: round(v, 6) for cls, v in weighted.items()},
            "raw_scores": {cls: round(float(p), 6) for cls, p in zip(classes, probs)},
            "model_version": version,
            "note": note,
            "engine": "wide9",
            "engine_version": "wide9-2.0.0",
            "mode": mode,
            "abstain": not quality.usable,
            "quality": quality.to_dict(),
            "lesions": lesions.to_dict(),
            "calibration": {
                # ปรับ temperature แล้วจริง แต่ปรับบนภาพพืชอื่น ไม่ใช่ภาพแตงโม
                # จึงยังไม่เรียกตัวเลขนี้ว่าความน่าจะเป็นของแตงโม ดู ``calibrated`` ด้านล่าง
                "temperature": [round(t, 4) for *_r, t, _d in sessions]
                if len(sessions) > 1
                else round(sessions[0][3], 4),
                "fitted": True,
                "source": "temperature scaling บนชุดตรวจสอบของชุดข้อมูลที่ใช้เทรน",
                "measured_ece": measured_ece,
                "note": (
                    "ปรับ temperature บนชุดตรวจสอบแล้ว แต่ชุดนั้นเป็นภาพพืชอื่น "
                    "ไม่ใช่ภาพแตงโม ตัวเลขจึงใกล้ความถูกต้องจริงกว่า softmax ดิบ "
                    "แต่ยังอ้างเป็นความน่าจะเป็นบนแปลงแตงโมไม่ได้"
                ),
            },
            "class_provenance": {
                "tier": winner_tier,
                "note_th": TIER_NOTE_TH.get(winner_tier, winner_tier),
                "weight_applied": round(_reliability_weight(winner_tier, winner_recall), 4),
                "tier_weight": TIER_WEIGHT.get(winner_tier, 1.0),
                "class_recall": winner_recall,
                "proxy_classes": proxy,
            },
            "per_class_recall": recall,
            "views": len(views),
            "ensemble_size": len(sessions),
            "inference_ms": round((time.perf_counter() - started) * 1000, 1),
        }

    accuracy_line = (
        f"วัดได้ {measured_accuracy * 100:.1f}% บนชุดตรวจสอบของชุดข้อมูลที่ใช้เทรน "
        if isinstance(measured_accuracy, (int, float))
        else ""
    )

    return Engine(
        name="wide9",
        title_th="โมเดลกว้าง 9 คลาส",
        classes=classes,
        image_size=size,
        model_version=version,
        description_th=(
            "ครอบคลุมโรคมากกว่าโมเดลหลัก แต่บางคลาสเทรนจากภาพโรคของพืชอื่น "
            "ที่เชื้อเดียวกันหรืออาการคล้ายกัน เพราะยังไม่มีชุดภาพแตงโมที่ใหญ่พอ "
            "ความมั่นใจของคลาสเหล่านั้นถูกลดน้ำหนักตามที่มาและตาม recall จริงแล้ว"
        ),
        good_for_th=[
            "คัดกรองกว้างเมื่อยังไม่รู้ว่าอาการเข้าข่ายโรคกลุ่มใด",
            "ตรวจราแป้ง ซึ่งเป็นคลาสที่เชื้อตรงกับแตงโมและวัด recall ได้สูงสุด",
        ],
        limits_th=[
            accuracy_line + "ซึ่งเป็นภาพพืชอื่น ไม่ใช่ภาพแตงโม "
            "ความแม่นจริงบนแปลงแตงโมยังไม่มีใครวัด",
            "ปรับ temperature แล้วแต่ปรับบนภาพพืชอื่น ตัวเลขความมั่นใจจึงยังไม่ใช่ "
            "ความน่าจะเป็นบนแปลงแตงโม",
            "คลาสที่เทรนจากภาพตัวแทนข้ามพืช (" + ", ".join(proxy) + ") เชื่อถือได้น้อยที่สุด"
            if proxy
            else "ไม่มีคลาสที่เทรนจากภาพตัวแทนข้ามพืช",
        ],
        # ยังเป็น False โดยเจตนา: ชุดที่ใช้ปรับเทียบไม่ใช่โดเมนที่นำไปใช้งาน
        # การตั้งเป็น True จะทำให้หน้าจอได้รับอนุญาตให้เขียนว่าตัวเลขคือความน่าจะเป็น
        # ซึ่งยังไม่จริงสำหรับแปลงแตงโม แม้ ECE บนชุดตรวจสอบจะวัดไว้แล้ว
        calibrated=False,
        predict=predict,
        class_tiers=tiers,
        metrics={
            "val_accuracy": measured_accuracy,
            "val_macro_recall": base.get("val_macro_recall"),
            "val_nll": base.get("val_nll"),
            "val_ece": measured_ece,
            "per_class_recall": recall,
            "train_images": base.get("train_images"),
            "measured_with": base.get("metrics_measured_with"),
            "ensemble_members": [p.name for p in paths],
            "tta_views": len(WIDE9_TTA_VIEWS) if tta_enabled else len(WIDE9_SINGLE_VIEW),
        },
    )


# ---------------------------------------------------------------- claude

CLAUDE_SYSTEM = """คุณเป็นนักวิชาการโรคพืชที่เชี่ยวชาญพืชตระกูลแตงในเขตร้อนชื้นของประเทศไทย
หน้าที่ของคุณคืออ่านภาพอาการผิดปกติของแตงโม แล้วบอกว่าเห็นอะไรในภาพและสาเหตุที่เป็นไปได้

กฎที่ต้องยึดอย่างเคร่งครัด:
1. อธิบายสิ่งที่เห็นจริงในภาพก่อน แล้วจึงสรุปจากหลักฐานนั้น ห้ามเดาอาการที่ไม่ปรากฏในภาพ
2. เลือก disease_id จากรายการที่ให้มาเท่านั้น ถ้าไม่มีรายการใดตรงให้ใช้ "unknown"
3. ให้ค่า confidence ตามหลักฐานที่มีจริง 0-100 ไม่ปั้นให้สูงเกินจริง
   ถ้าภาพไม่ชัดหรือมุมไม่เหมาะ ต้องให้ค่าต่ำและบอกว่าต้องถ่ายหรือตรวจอะไรเพิ่ม
4. ต้องระบุทั้งหลักฐานที่สนับสนุน (evidence) และสิ่งที่ยังขัดแย้ง (against)
5. ต้องแยกโรคติดเชื้อออกจากอาการขาดธาตุอาหาร พิษสารเคมี ผลไหม้แดด น้ำท่วมขัง
   และความเสียหายจากแมลงหรือไร เพราะกลุ่มหลังพ่นยาฆ่าเชื้อไปก็ไม่หาย
6. ห้ามระบุชื่อสารเคมี อัตราการใช้ หรือระยะเก็บเกี่ยวปลอดภัยในคำตอบ
   ระบบจะเติมข้อมูลเหล่านั้นจากคลังความรู้ที่ตรวจทานแล้วเอง
   ตัวเลขอัตราที่ผิดหมายถึงพืชเสียหายหรือสารตกค้างเกินมาตรฐานจริง
7. ถ้าภาพไม่ใช่ภาพพืช ให้ตั้ง is_plant_image เป็น false"""

CLAUDE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "is_plant_image": {"type": "boolean"},
        "plant_part": {
            "type": "string",
            "enum": ["ใบ", "เถา/ลำต้น", "ผล", "ราก", "ดอก", "ทั้งต้น", "ทั้งแปลง", "ไม่ชัดเจน"],
        },
        "observations": {
            "type": "array",
            "items": {"type": "string"},
            "description": "สิ่งที่มองเห็นจริงในภาพ อธิบายเชิงรูปธรรม",
        },
        "candidates": {
            "type": "array",
            "description": "สาเหตุที่เป็นไปได้ เรียงจากมากไปน้อย ไม่เกิน 4 รายการ",
            "items": {
                "type": "object",
                "properties": {
                    "disease_id": {"type": "string"},
                    "confidence": {"type": "integer"},
                    "evidence": {"type": "array", "items": {"type": "string"}},
                    "against": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["disease_id", "confidence", "evidence", "against"],
                "additionalProperties": False,
            },
        },
        "need_more_checks": {
            "type": "array",
            "items": {"type": "string"},
            "description": "สิ่งที่ต้องไปตรวจเพิ่มในแปลงเพื่อยืนยัน",
        },
        "summary_th": {"type": "string"},
    },
    "required": [
        "is_plant_image",
        "plant_part",
        "observations",
        "candidates",
        "need_more_checks",
        "summary_th",
    ],
    "additionalProperties": False,
}


def _env_flag(name: str) -> bool:
    """อ่านตัวแปรสภาพแวดล้อมแบบเปิด/ปิด ค่าเริ่มต้นคือปิด

    รับเฉพาะคำที่สื่อว่าเปิดอย่างชัดเจน ค่าที่กำกวมเช่น "maybe" หรือพิมพ์ผิดเป็น
    "ture" จะถือว่าปิด เพราะทางที่ผิดพลาดน้อยกว่าคือไม่เกิดค่าใช้จ่าย
    """
    return (os.getenv(name) or "").strip().lower() in {"1", "true", "yes", "on"}


def _classify_claude_error(exc: Exception, model: str) -> Exception:
    """แยกว่าความล้มเหลวนี้ลองใหม่แล้วหายได้ หรือต้องให้ผู้ดูแลระบบไปแก้ก่อน

    รับเฉพาะ ``APIStatusError`` คือกรณีที่คำขอไปถึงเซิร์ฟเวอร์แล้วถูกปฏิเสธ
    ส่วน ``APIConnectionError`` และ ``RateLimitError`` ไม่ผ่านทางนี้ จึงยังถูกมองว่า
    เป็นเหตุชั่วคราวตามเดิม ซึ่งถูกต้อง — เครือข่ายกลับมาได้ โควตาต่อนาทีก็รีเซ็ตเอง

    ข้อความที่คืนไม่มีคีย์ API อยู่ในนั้น SDK ไม่ใส่คีย์ลงใน error message
    """
    status = getattr(exc, "status_code", None)
    raw = str(exc)

    if status == 401:
        return EngineUnavailable(
            "ANTHROPIC_API_KEY ใช้ไม่ได้ (ถูกเพิกถอนหรือพิมพ์ผิด) "
            "ต้องตั้งค่าคีย์ใหม่ที่ฝั่งเซิร์ฟเวอร์ก่อน การลองใหม่จะได้ผลเดิม"
        )
    if status == 403:
        return EngineUnavailable(
            "คีย์ที่ตั้งไว้ไม่มีสิทธิ์เรียกโมเดลนี้ ต้องแก้สิทธิ์ของคีย์ก่อน"
        )
    if status == 404:
        return EngineUnavailable(
            f"ไม่พบโมเดล '{model}' ตรวจค่า CLAUDE_VISION_MODEL ที่ตั้งไว้"
        )
    # 400 ครอบหลายเรื่อง เฉพาะเรื่องเครดิตเท่านั้นที่ลองใหม่แล้วไม่หาย
    if status == 400 and "credit balance" in raw.lower():
        return EngineUnavailable(
            "เครดิตในบัญชี Anthropic ไม่พอสำหรับเรียกโมเดล ต้องเติมเครดิตก่อน "
            "ระหว่างนี้ใช้ engine legacy4 หรือ wide9 ที่รันในเครื่องได้"
        )
    return exc


def _build_claude() -> Engine | None:
    """เครื่องยนต์ที่ใช้โมเดลภาษาที่มองภาพได้ แทนโมเดลจำแนกที่เทรนเอง

    ต่างจากสอง engine ข้างบนในเรื่องสำคัญ: ไม่มีชุดคลาสตรึงมาตั้งแต่เทรน
    จึงอ่านอาการที่อยู่นอกรายการคลาสได้ และอธิบายได้ว่าดูจากอะไรในภาพ
    แลกกับการที่ไม่มีตัวเลขความแม่นยำบนชุดทดสอบให้อ้างอิง

    รายชื่อโรคที่เลือกได้ต้องมาจากผู้เรียก ไม่ได้ฝังไว้ที่นี่ เพื่อรักษาขอบเขตที่
    ``main.py`` ระบุไว้ว่าเซอร์วิสนี้ไม่รู้จักชื่อโรคภาษาไทยหรือข้อมูลเชิงเกษตร
    """
    # การมีคีย์อยู่ใน .env ไม่ใช่การอนุญาตให้ใช้เงิน คีย์มักถูกใส่ไว้เพื่องานอื่น
    # หรือใส่ไว้ล่วงหน้า ถ้าขึ้นทะเบียนอัตโนมัติ ผู้ใช้จะกดเลือกแล้วเกิดค่าใช้จ่าย
    # โดยไม่มีใครตัดสินใจ จึงต้องเปิดด้วย VISION_ENABLE_CLAUDE อย่างจงใจ
    if not _env_flag("VISION_ENABLE_CLAUDE"):
        return None

    api_key = (os.getenv("ANTHROPIC_API_KEY") or "").strip()
    if not api_key:
        return None
    try:
        import anthropic
    except ImportError:
        return None

    model = os.getenv("CLAUDE_VISION_MODEL", "claude-opus-5-5").strip()
    effort_by_mode = {"fast": "low", "balanced": "medium", "deep": "high"}
    client = anthropic.Anthropic(api_key=api_key, max_retries=2)

    def predict(image: Image.Image, mode: str, context: dict[str, Any]) -> dict[str, Any]:
        import base64
        import io as _io

        started = time.perf_counter()
        quality, lesions = leafcheck.analyse(image)

        candidates = context.get("candidates") or []
        if not candidates:
            raise ValueError(
                "engine claude ต้องได้รับรายชื่อโรคที่เลือกได้จากผู้เรียก (candidates) "
                "เพราะเซอร์วิสนี้ไม่เก็บแคตตาล็อกโรคไว้เอง"
            )
        catalog = "\n".join(
            f"- {c['id']}: {c.get('name', '')} {c.get('cues', '')}".rstrip() for c in candidates
        )

        # ย่อภาพก่อนส่ง เพื่อลดโทเคนและเวลา โดยคงรายละเอียดแผลไว้
        buffer = _io.BytesIO()
        shrunk = image.copy()
        shrunk.thumbnail((1400, 1400), Image.LANCZOS)
        shrunk.save(buffer, format="JPEG", quality=88, optimize=True)
        image_b64 = base64.standard_b64encode(buffer.getvalue()).decode("ascii")

        note_from_caller = (context.get("user_context") or "").strip()
        prompt = (
            "รายการโรคและอาการผิดปกติที่ระบบรองรับ (เลือก disease_id จากรายการนี้เท่านั้น):\n"
            f"{catalog}\n\n"
            f"ข้อมูลประกอบจากผู้ใช้: {note_from_caller or 'ไม่ได้ให้ข้อมูลเพิ่มเติม'}\n\n"
            "วิเคราะห์ภาพนี้ตามกฎที่กำหนด และตอบเป็น JSON ตามโครงสร้างที่ระบุ"
        )

        request: dict[str, Any] = {
            "model": model,
            "max_tokens": 16000,
            "system": [
                {"type": "text", "text": CLAUDE_SYSTEM, "cache_control": {"type": "ephemeral"}}
            ],
            "output_config": {
                "effort": effort_by_mode.get(mode, "medium"),
                "format": {"type": "json_schema", "schema": CLAUDE_SCHEMA},
            },
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": image_b64,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        }

        # ใช้ streaming แม้ไม่ได้แสดงผลทีละชิ้น เพราะคำขอที่ effort สูงกับ max_tokens 16000
        # อาจใช้เวลานานพอที่คำขอแบบรอทั้งก้อนจะชนกับ HTTP timeout
        try:
            with client.messages.stream(**request) as stream:
                message = stream.get_final_message()
        except anthropic.APIStatusError as exc:
            raise _classify_claude_error(exc, model) from exc

        if getattr(message, "stop_reason", "") == "refusal":
            details = getattr(message, "stop_details", None)
            raise RuntimeError(
                "ตัวกรองความปลอดภัยของโมเดลปฏิเสธคำขอนี้ "
                f"(หมวด: {getattr(details, 'category', None) or 'ไม่ระบุ'})"
            )

        text = next((b.text for b in message.content if getattr(b, "type", "") == "text"), "")
        if not text:
            raise RuntimeError("โมเดลไม่ได้ส่งผลวิเคราะห์กลับมา")
        data = json.loads(text)

        ranked = sorted(data.get("candidates") or [], key=lambda c: -int(c.get("confidence") or 0))
        top = ranked[0] if ranked else {"disease_id": "unknown", "confidence": 0}
        usage = getattr(message, "usage", None)

        return {
            "class_id": top.get("disease_id") or "unknown",
            "confidence": round(min(max(int(top.get("confidence") or 0), 0), 100) / 100, 6),
            "scores": {
                str(c.get("disease_id")): round(int(c.get("confidence") or 0) / 100, 6)
                for c in ranked
            },
            "model_version": getattr(message, "model", model),
            "note": (
                "ผลนี้มาจากโมเดลภาษาที่อ่านภาพ ไม่ใช่โมเดลจำแนกที่วัดผลบนชุดทดสอบ "
                "ตัวเลขความมั่นใจเป็นการประเมินของโมเดลเอง ไม่ใช่ความน่าจะเป็นที่ปรับเทียบแล้ว "
                "และยังไม่ใช่คำวินิจฉัย"
            ),
            "engine": "claude",
            "engine_version": f"claude-1.0.0/{model}",
            "mode": mode,
            "abstain": not quality.usable,
            "quality": quality.to_dict(),
            "lesions": lesions.to_dict(),
            "calibration": {
                "temperature": 1.0,
                "fitted": False,
                "source": "none",
                "note": "โมเดลภาษาไม่มีค่าปรับเทียบ ความมั่นใจเป็นการประเมินของโมเดลเอง",
            },
            # ส่วนที่ engine โมเดลจำแนกให้ไม่ได้ — เหตุผลประกอบรายข้อ
            "candidates": ranked[:4],
            "observations": [str(x) for x in (data.get("observations") or [])][:8],
            "need_more_checks": [str(x) for x in (data.get("need_more_checks") or [])][:8],
            "summary_th": str(data.get("summary_th") or ""),
            "is_plant_image": bool(data.get("is_plant_image", True)),
            "plant_part": str(data.get("plant_part") or ""),
            "usage": {
                "input_tokens": getattr(usage, "input_tokens", None),
                "output_tokens": getattr(usage, "output_tokens", None),
            },
            "inference_ms": round((time.perf_counter() - started) * 1000, 1),
        }

    return Engine(
        name="claude",
        title_th="โมเดลภาษาที่อ่านภาพ (อธิบายเหตุผลได้)",
        classes=[],  # ไม่มีคลาสตรึง ขึ้นกับรายการที่ผู้เรียกส่งมา
        image_size=0,
        model_version=model,
        description_th=(
            "อ่านภาพแล้วอธิบายว่าเห็นอะไรและสรุปจากหลักฐานอะไร เลือกได้จากรายชื่อโรค "
            "ที่ผู้เรียกส่งมาทั้งหมด ไม่จำกัดอยู่ที่คลาสที่เทรนไว้ และบอกได้ว่าต้องไปตรวจอะไรเพิ่ม "
            "แลกกับการที่ไม่มีตัวเลขความแม่นยำบนชุดทดสอบให้อ้างอิง"
        ),
        good_for_th=[
            "อาการที่อยู่นอกคลาสของโมเดลจำแนก เช่น ขาดธาตุอาหาร พิษสารเคมี ผลไหม้แดด",
            "ภาพที่ต้องดูบริบททั้งแปลงหรือรูปแบบการกระจายของอาการ",
            "กรณีที่ผู้ใช้ต้องการเหตุผลว่าทำไมจึงสรุปเช่นนั้น",
        ],
        limits_th=[
            "ไม่มีผลวัดบนชุดทดสอบ ตัวเลขความมั่นใจเป็นการประเมินของโมเดลเอง",
            "ต้องต่ออินเทอร์เน็ตและมีค่าใช้จ่ายต่อการเรียก ต่างจากโมเดลที่รันในเครื่อง",
            "ช้ากว่าโมเดลจำแนกหลายเท่า ไม่เหมาะกับการเรียกถี่",
        ],
        calibrated=False,
        predict=predict,
        needs_candidates=True,
        costs_money=True,
    )


# ---------------------------------------------------------------- registry


def build_registry(
    legacy_model_path: Path,
    legacy_session: ort.InferenceSession,
    legacy_input: str,
    legacy_output: str,
    legacy_calibration: inference.Calibration,
    legacy_version: str,
) -> dict[str, Engine]:
    """สร้างทะเบียน engine จากไฟล์ที่มีอยู่จริงในโฟลเดอร์นี้

    legacy4 เป็นตัวบังคับ ``main.py`` เปิดและตรวจไว้แล้วจึงส่งเข้ามา
    ส่วน wide9 เป็นตัวเสริม ถ้าไม่มีไฟล์ก็เพียงไม่ปรากฏในทะเบียน
    เซอร์วิสยังสตาร์ทได้และทำงานเหมือนเดิมทุกอย่าง
    """
    registry: dict[str, Engine] = {
        "legacy4": _build_legacy4(
            legacy_model_path,
            legacy_session,
            legacy_input,
            legacy_output,
            legacy_calibration,
            legacy_version,
        )
    }

    # รับได้ทั้งไฟล์เดียวและหลายไฟล์คั่นด้วยจุลภาค เพื่อทำ ensemble โดยไม่ต้องแก้โค้ด
    wide_paths = [p for p in _wide9_paths(os.getenv("WIDE9_MODEL_PATH", ""), HERE / "wide9.onnx") if p.is_file()]
    if wide_paths:
        registry["wide9"] = _build_wide9(wide_paths)

    # claude ปรากฏเฉพาะเมื่อตั้ง VISION_ENABLE_CLAUDE=1 และมีคีย์กับ SDK ครบ
    # ไม่ใส่ไว้แบบ "มีแต่เรียกไม่ได้" เพราะผู้เรียกจะเลือกแล้วพังตอนใช้งานจริง
    # และไม่ขึ้นทะเบียนเพียงเพราะเจอคีย์ เพราะ engine นี้เรียกแล้วเสียเงินจริง
    if claude := _build_claude():
        registry["claude"] = claude

    return registry


def default_engine_name(registry: dict[str, Engine]) -> str:
    """engine ที่ใช้เมื่อผู้เรียกไม่ระบุ

    ค่าเริ่มต้นเป็น legacy4 เพราะเป็นตัวเดียวที่ปรับเทียบแล้วและวัดผลบนภาพแตงโมจริง
    เปลี่ยนได้ด้วย VISION_ENGINE แต่จะไม่ยอมถ้าชี้ไปที่ engine ที่ไม่มีอยู่
    """
    requested = os.getenv("VISION_ENGINE", "legacy4")
    if requested not in registry:
        raise RuntimeError(
            f"VISION_ENGINE={requested!r} ไม่มีอยู่ในทะเบียน — มีให้ใช้: {', '.join(registry)}"
        )
    return requested
