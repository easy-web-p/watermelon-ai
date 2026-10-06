"""Watermelon leaf disease vision service.

This process does exactly one thing: turn an image into evidence about the
four classes in ``model.py``. It deliberately knows nothing about Thai disease
names, chemical rates or pre-harvest intervals — that mapping lives in
``src/lib/diseaseModel.ts`` so there is a single agronomic source of truth
instead of one copy per language.

The one kind of Thai text it does produce is photography guidance
("ภาพเบลอ…ให้แตะโฟกัสที่ใบ"). That is not an exception to the boundary above:
how readable a photo is, is a property of the image, which is this service's
subject. What the photo *means* for a crop is not.

Inference runs on ONNX Runtime, not PyTorch. ``export_onnx.py`` produces
``model.onnx`` once from the training checkpoint and verifies it against
PyTorch before writing it; after that the serving path needs neither torch nor
its unsigned DLLs, which Smart App Control blocks on some Windows machines.

The reading of that checkpoint lives in ``inference.py`` — multi-scale crops,
test-time augmentation, temperature scaling and a deliberately asymmetric
aggregation rule — and the photo-readability checks live in ``leafcheck.py``.
Both are worth reading before changing anything here; the header of
``inference.py`` explains which measured failure each mechanism targets.

It also never guesses. If the model file is missing the process refuses to
start, and if an image cannot be decoded the caller gets a 4xx. An earlier
version of this file answered with ``random.choices()`` over a disease
catalogue, which looked like a working demo and would have had farmers
spraying fungicide chosen by a random number generator.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import io
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, Field

import engines
import inference
from model import CLASSES, IMAGE_SIZE, preprocess, softmax

MODEL_PATH = Path(os.getenv("MODEL_PATH", Path(__file__).with_name("model.onnx")))
METRICS_PATH = Path(__file__).with_name("metrics.json")
MAX_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

Mode = Literal["fast", "balanced", "deep"]
DEFAULT_MODE: Mode = os.getenv("VISION_MODE", inference.DEFAULT_MODE)  # type: ignore[assignment]


class DiseaseCandidate(BaseModel):
    """รายการโรคหนึ่งรายการที่ผู้เรียกอนุญาตให้ engine เลือกได้

    เซอร์วิสนี้ไม่เก็บแคตตาล็อกโรคไว้เอง ตามขอบเขตที่อธิบายไว้ด้านบนของไฟล์
    ผู้เรียก (Node API ซึ่ง import แคตตาล็อกจาก src/data/diseases.ts) ส่งมาต่อคำขอ
    """

    id: str = Field(min_length=1)
    name: str = ""
    cues: str = ""


class Base64PredictRequest(BaseModel):
    imageBase64: str = Field(min_length=1)
    mode: Mode | None = None
    engine: str | None = None
    candidates: list[DiseaseCandidate] | None = None
    userContext: str = ""


def _resolve_engine(requested: str | None) -> engines.Engine:
    """เลือก engine ตามที่ผู้เรียกระบุ หรือใช้ค่าเริ่มต้นของเซอร์วิส

    ชื่อที่ไม่มีในทะเบียนต้องตอบ 422 พร้อมบอกว่ามีอะไรให้ใช้ ไม่ใช่เงียบ ๆ
    ถอยไปใช้ตัวเริ่มต้น เพราะผู้เรียกที่ขอ engine หนึ่งแล้วได้ผลจากอีกตัว
    จะตีความตัวเลขความมั่นใจผิด (ตัวหนึ่งปรับเทียบแล้ว อีกตัวยังไม่)
    """
    registry: dict[str, engines.Engine] = app.state.engines
    name = requested or app.state.default_engine
    if name not in registry:
        raise HTTPException(
            status_code=422,
            detail=f"engine ต้องเป็นหนึ่งใน {', '.join(registry)} (ได้รับ '{name}')",
        )
    return registry[name]


def _decode_image(data: bytes) -> Image.Image:
    """Verify then decode. ``verify()`` invalidates the handle, hence two opens.

    Returns a PIL image rather than a preprocessed batch: the engine needs the
    full-resolution pixels to crop and to measure focus from. EXIF rotation is
    applied, because a photo taken in portrait arrives rotated and a leaf lying
    on its side is a different image to a network trained on upright ones.
    """
    try:
        with Image.open(io.BytesIO(data)) as probe:
            probe.verify()
        with Image.open(io.BytesIO(data)) as image:
            return ImageOps.exif_transpose(image).convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"ไฟล์ภาพเสียหายหรืออ่านไม่ได้: {exc}") from exc


def _resolve_mode(requested: str | None) -> Mode:
    mode = requested or DEFAULT_MODE
    if mode not in inference.MODES:
        raise HTTPException(
            status_code=422,
            detail=f"mode ต้องเป็นหนึ่งใน {', '.join(inference.MODES)} (ได้รับ '{mode}')",
        )
    return mode  # type: ignore[return-value]


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not MODEL_PATH.exists():
        raise RuntimeError(
            f"ไม่พบไฟล์โมเดล {MODEL_PATH} — รัน export_onnx.py บนเครื่องที่มี PyTorch "
            "เพื่อแปลง model.pt เป็น model.onnx แล้วนำมาวางที่โฟลเดอร์นี้ (ดู README.md)"
        )

    sidecar = MODEL_PATH.with_suffix(MODEL_PATH.suffix + ".json")
    meta = json.loads(sidecar.read_text(encoding="utf-8")) if sidecar.exists() else {}
    if meta.get("classes") and meta["classes"] != CLASSES:
        raise RuntimeError(
            f"ลำดับคลาสของโมเดลไม่ตรงกับโค้ด: model={meta['classes']} code={CLASSES}. "
            "ถ้าปล่อยผ่าน ผลทำนายทุกภาพจะถูกจับคู่กับโรคผิดตัว"
        )
    # The graph has a fixed spatial input, so a mismatch here would fail on the
    # first request rather than at startup — and only on machines that get a
    # request. Checked now so a bad deploy cannot look healthy.
    if meta.get("image_size") and meta["image_size"] != IMAGE_SIZE:
        raise RuntimeError(
            f"โมเดลถูกส่งออกที่ {meta['image_size']}px แต่ model.py เตรียมภาพที่ {IMAGE_SIZE}px — "
            f"แก้ IMAGE_SIZE ใน model.py ให้ตรงกันก่อนเปิดเซอร์วิส"
        )
    if DEFAULT_MODE not in inference.MODES:
        raise RuntimeError(
            f"VISION_MODE={DEFAULT_MODE!r} ไม่ถูกต้อง — รองรับ {', '.join(inference.MODES)}"
        )

    session = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])

    # A head that does not emit one score per class means the file and the code
    # disagree about the task; a wrong-length output would be silently sliced.
    output_shape = session.get_outputs()[0].shape
    if output_shape[-1] not in (len(CLASSES), None, "classes"):
        raise RuntimeError(f"โมเดลให้ผลลัพธ์ {output_shape} ไม่ตรงกับ {len(CLASSES)} คลาสในโค้ด")

    # A corrupt calibration file raises here rather than being skipped, so the
    # service can never serve raw scores while reporting them as calibrated.
    calibration = inference.load_calibration(MODEL_PATH)

    digest = hashlib.sha256(MODEL_PATH.read_bytes()).hexdigest()[:12]
    app.state.session = session
    app.state.input_name = session.get_inputs()[0].name
    app.state.output_name = session.get_outputs()[0].name
    app.state.architecture = meta.get("architecture", "efficientnet_b0")
    app.state.model_version = f"{app.state.architecture}@{digest}"
    app.state.trained_epoch = meta.get("trained_epoch")
    app.state.calibration = calibration

    # ทะเบียน engine สร้างหลังด่านตรวจข้างบนผ่านแล้ว โดยส่ง session ของ legacy4
    # ที่เปิดไว้แล้วเข้าไปใช้ต่อ ไม่เปิดใหม่ให้โหลดโมเดลซ้ำ
    app.state.engines = engines.build_registry(
        MODEL_PATH,
        session,
        app.state.input_name,
        app.state.output_name,
        calibration,
        app.state.model_version,
    )
    app.state.default_engine = engines.default_engine_name(app.state.engines)
    yield
    app.state.session = None
    app.state.engines = {}


app = FastAPI(
    title="Watermelon Leaf Disease Vision Service",
    description=(
        "จำแนกภาพใบแตงโม 4 คลาส ด้วยการรวมผลหลายมุมและหลายบริเวณของภาพ "
        "ส่งคืนคะแนนความน่าจะเป็นพร้อมหลักฐานประกอบ ไม่ตีความเป็นคำวินิจฉัย"
    ),
    version="3.0.0",
    lifespan=lifespan,
)

# The Node API is the only intended caller; browsers reach this through it.
origins = [o.strip() for o in os.getenv("VISION_CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"], allow_headers=["*"])


@app.get("/health")
def health():
    calibration: inference.Calibration = app.state.calibration
    return {
        "status": "ok",
        "service": "watermelon-vision",
        "runtime": f"onnxruntime {ort.__version__}",
        "model_loaded": app.state.session is not None,
        "model_version": app.state.model_version,
        "architecture": app.state.architecture,
        "device": "cpu",
        "classes": CLASSES,
        "engine_version": inference.ENGINE_VERSION,
        "modes": list(inference.MODES),
        "default_mode": DEFAULT_MODE,
        # รายชื่อเครื่องยนต์ที่เปิดใช้ได้ รายละเอียดเต็มอยู่ที่ /engines
        "engines": sorted(app.state.engines),
        "default_engine": app.state.default_engine,
        # Reported so a caller can tell whether `confidence` is a probability
        # or a raw softmax score, which changes how it should be worded.
        "calibration": calibration.to_dict(),
        "aggregation": {
            "tile_suspicion_threshold": inference.TILE_SUSPICION,
            "tile_min_tissue_fraction": inference.TILE_MIN_TISSUE,
            "rule": "crop-may-escalate-healthy-never-downgrade-disease",
        },
    }


@app.get("/metrics")
def metrics():
    """Held-out test results, so callers can show real accuracy rather than a claim."""
    if not METRICS_PATH.exists():
        raise HTTPException(status_code=404, detail="ไม่พบ metrics.json ของรุ่นที่ฝึกไว้")
    return json.loads(METRICS_PATH.read_text(encoding="utf-8"))


@app.get("/engines")
def list_engines():
    """เครื่องยนต์ที่เปิดใช้ได้ พร้อมข้อดีข้อจำกัดของแต่ละตัว

    มีไว้ให้ผู้เรียกเลือกได้อย่างมีข้อมูลประกอบ ไม่ใช่เดาจากชื่อ
    โดยเฉพาะ `calibrated` ซึ่งบอกว่าตัวเลข confidence ตีความเป็นความน่าจะเป็นได้หรือไม่
    """
    registry: dict[str, engines.Engine] = app.state.engines
    return {
        "default": app.state.default_engine,
        "engines": [engine.to_dict() for engine in registry.values()],
        "note": (
            "ไม่มี engine ใดดีกว่าอีกตัวในทุกงาน legacy4 ปรับเทียบแล้วและวัดผลบนภาพแตงโมจริง "
            "แต่ตรวจได้ 4 คลาส ส่วน wide9 ครอบคลุมกว้างกว่าแต่ยังไม่ปรับเทียบ "
            "และบางคลาสเทรนจากภาพโรคของพืชอื่น"
        ),
    }


def _predict(
    image: Image.Image,
    mode: Mode,
    engine: engines.Engine,
    context: dict | None = None,
) -> dict:
    """เรียก engine ที่เลือก และแปลงข้อผิดพลาดให้เป็น HTTP ที่สื่อความ

    engine ที่ต้องพึ่งบริการภายนอก (claude) ล้มได้ด้วยเหตุที่ผู้เรียกแก้ไม่ได้
    เช่น เครือข่ายล่มหรือโควตาหมด ซึ่งต้องเป็น 502 ไม่ใช่ 500 และต้องไม่ถอยไปใช้
    engine อื่นเงียบ ๆ เพราะผู้เรียกจะตีความตัวเลขความมั่นใจผิดโมเดล
    """
    payload = context or {}
    if engine.needs_candidates and not payload.get("candidates"):
        raise HTTPException(
            status_code=422,
            detail=(
                f"engine '{engine.name}' ต้องได้รับรายการโรคที่เลือกได้ (candidates) "
                "จากผู้เรียก เพราะเซอร์วิสนี้ไม่เก็บแคตตาล็อกโรคไว้เอง"
            ),
        )
    try:
        return engine.predict(image, mode, payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 — ครอบคลุมความล้มเหลวของบริการภายนอก
        raise HTTPException(
            status_code=502,
            detail=f"engine '{engine.name}' ทำงานไม่สำเร็จ: {exc}",
        ) from exc


@app.post("/predict")
async def predict_file(
    file: UploadFile = File(...),
    mode: str | None = Query(default=None, description="fast | balanced | deep"),
    engine: str | None = Query(default=None, description="legacy4 | wide9"),
):
    resolved = _resolve_mode(mode)
    selected = _resolve_engine(engine)
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="รองรับเฉพาะไฟล์ JPEG, PNG และ WebP")
    data = await file.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="ไฟล์ภาพใหญ่เกิน 10 MB")
    return _predict(_decode_image(data), resolved, selected)


@app.post("/predict-base64")
async def predict_base64(payload: Base64PredictRequest):
    resolved = _resolve_mode(payload.mode)
    selected = _resolve_engine(payload.engine)
    raw = payload.imageBase64
    # Browsers hand over a data URL; keep only the payload after the comma.
    if raw.startswith("data:"):
        _, _, raw = raw.partition(",")
    try:
        data = base64.b64decode(raw, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"ถอดรหัส base64 ไม่สำเร็จ: {exc}") from exc
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="ไฟล์ภาพใหญ่เกิน 10 MB")
    return _predict(
        _decode_image(data),
        resolved,
        selected,
        {
            "candidates": [c.model_dump() for c in payload.candidates or []],
            "user_context": payload.userContext,
        },
    )


@app.post("/predict-raw")
async def predict_raw(file: UploadFile = File(...)):
    """Single centre view, no crops, no TTA, no quality gate.

    Here so the effect of the engine can be measured against the plain
    checkpoint on the same image — ``fit_calibration.py`` uses it to report
    both numbers side by side. Not for the app: it is the v2 behaviour, which
    called 19 of 50 diseased leaves healthy.
    """
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="รองรับเฉพาะไฟล์ JPEG, PNG และ WebP")
    data = await file.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="ไฟล์ภาพใหญ่เกิน 10 MB")
    image = _decode_image(data)
    logits = app.state.session.run(
        [app.state.output_name], {app.state.input_name: preprocess(image)}
    )[0]
    scores = softmax(logits)[0].tolist()
    winner = int(np.argmax(scores))
    return {
        "class_id": CLASSES[winner],
        "confidence": round(scores[winner], 6),
        "scores": {name: round(score, 6) for name, score in zip(CLASSES, scores)},
        "model_version": app.state.model_version,
        "engine_version": "raw",
        "note": "คะแนน softmax ดิบจากภาพเดียวมุมเดียว ไม่ผ่านเครื่องยนต์รวมผล ใช้เพื่อเปรียบเทียบเท่านั้น",
    }
