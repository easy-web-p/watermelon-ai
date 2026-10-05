"""The inference engine. One photo in, one defensible verdict out.

The checkpoint underneath is unchanged — this module makes the *reading* of it
smarter, which is where the measured failures of v2 actually live. From
``metrics.json``, on the held-out test set:

    Healthy precision 0.62  - of 50 images the model called healthy, 19 were
                              diseased
    Downy_Mildew recall 0.82, Mosaic_Virus recall 0.85
                            - roughly one infected leaf in six was missed

Every missed leaf was called healthy. A farmer acts on "ใบปกติ" by doing
nothing, so that one number is the whole problem. Four mechanisms here attack
it, and each one is a mechanism rather than a tuned constant:

1. **Scale.** A phone photo is 3000 px wide and the network sees 224. An early
   downy-mildew lesion a few millimetres across survives that resize as
   roughly one pixel. ``plan_regions`` also scores overlapping crops, so the
   same lesion arrives at the network around twice as large. This is the
   single biggest reason a small infection reads as healthy.

2. **Variance.** Test-time augmentation averages the logits over the four
   flips the model was trained with. Averaging before the argmax removes the
   coin-flip behaviour on borderline images, which matters most here because
   step 3 takes a maximum over crops and a maximum amplifies noise.

3. **Asymmetric cost.** ``aggregate`` will not let a whole-frame "healthy"
   overrule a crop that clearly shows disease. A false alarm costs one wasted
   inspection; a missed infection costs 60-80% of the crop, per the yield
   figures in ``src/data/diseases.ts``. The rule is deliberately not
   symmetric, and the output says so, so the app can present a crop-level
   finding as "go and look here" instead of as a diagnosis.

4. **Knowing when to decline.** The four-way softmax has no class for "that is
   not a leaf" or "that photo is a smear". ``leafcheck`` supplies both, and
   this module refuses rather than returning a confident wrong answer.

What this module does **not** do is claim a new accuracy number. The dataset
that produced ``metrics.json`` is not in the repository, so the figures the
app shows are still the v2 measurements. ``fit_calibration.py`` re-measures
them, including the aggregation rule, the moment the images are available.
"""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
from PIL import Image

import leafcheck
from model import CLASSES, preprocess, softmax

ENGINE_VERSION = "3.0.0"

HEALTHY_INDEX = CLASSES.index("Healthy")

# -- Modes -------------------------------------------------------------------
# Latency measured on this machine's CPU at ~12 ms per crop, batched:
#   fast      1 crop    ~12 ms   the landing-page demo
#   balanced  8 crops  ~100 ms   default for the app
#   deep     24 crops  ~290 ms   a farmer who asked for a careful look
# Even "deep" is far below the time it takes to upload the photo, so the
# default is chosen for accuracy rather than speed.
MODES = ("fast", "balanced", "deep")
DEFAULT_MODE = "balanced"

# Overlapping crops, as (left, top, right, bottom) fractions of the frame.
# 55% of each edge means ~30% of the area, so a lesion lands on the network
# about twice as wide as it does in the full frame. The 10% overlap stops a
# lesion sitting on a tile boundary from being cut in half in every crop.
QUADRANTS = (
    ("q-tl", (0.00, 0.00, 0.55, 0.55)),
    ("q-tr", (0.45, 0.00, 1.00, 0.55)),
    ("q-bl", (0.00, 0.45, 0.55, 1.00)),
    ("q-br", (0.45, 0.45, 1.00, 1.00)),
)
CENTER = ("center", (0.20, 0.20, 0.80, 0.80))
FULL = ("full", (0.00, 0.00, 1.00, 1.00))

# -- Test-time augmentation --------------------------------------------------
# Exactly the four transforms training used (RandomHorizontalFlip +
# RandomVerticalFlip). Rotations by 90 degrees are deliberately absent: the
# model never saw them, so they would be out of distribution and would add
# bias to the average rather than removing variance from it.
#
# Applied to the preprocessed NCHW array rather than to the PIL image. That is
# exactly equivalent — per-channel normalisation does not depend on where a
# pixel sits — and it means one resize per crop instead of one per view, which
# is where the time in this function actually goes. ``selfcheck.py`` asserts
# the equivalence rather than trusting the argument.
VIEW_NAMES = ("identity", "hflip", "vflip", "hvflip")


def _view(batch: np.ndarray, name: str) -> np.ndarray:
    """One TTA view of an NCHW batch. Axis 2 is height, axis 3 is width."""
    if name == "identity":
        return batch
    if name == "hflip":
        return batch[:, :, :, ::-1]
    if name == "vflip":
        return batch[:, :, ::-1, :]
    if name == "hvflip":
        return batch[:, :, ::-1, ::-1]
    raise ValueError(f"unknown TTA view: {name}")


# The source photo is downscaled once to this long edge before any crop is
# taken. A quadrant is 55% of the edge, so at 768 px a crop arrives at the
# network as ~422 px and is downscaled 1.9x to reach 224, while the full frame
# is downscaled 3.4x. The crops therefore still see roughly twice the detail
# the full frame does, which is the whole reason they exist — and the resizes
# happen on a quarter of the pixels a 1600 px phone photo would cost.
WORK_LONG_EDGE = 768

# -- Aggregation thresholds --------------------------------------------------
# A crop is weaker evidence than the whole frame: it carries less context, and
# taking the maximum over five crops inflates the chance of a fluke high
# score. So the bar to overrule a whole-frame "healthy" sits above the 0.70
# that `diseaseModel.ts` asks of an ordinary diagnosis.
TILE_SUSPICION = 0.80

# A crop that is mostly soil or sky must not raise an alarm. The classifier
# will name a disease in a patch of dirt, because it has no other option.
TILE_MIN_TISSUE = 0.35


@dataclass(frozen=True)
class RegionResult:
    """What the network said about one crop."""

    name: str
    #: (left, top, right, bottom) as fractions of the frame, for the UI to
    #: point at the area the finding came from.
    box: tuple[float, float, float, float]
    class_id: str
    confidence: float
    #: Share of this crop that looks like leaf tissue.
    tissue_fraction: float
    scores: dict[str, float]
    #: How many TTA views were averaged into this result.
    views: int

    def to_dict(self) -> dict:
        data = asdict(self)
        data["box"] = list(self.box)
        return data


@dataclass(frozen=True)
class Calibration:
    """Temperature scaling parameters, loaded from beside the model."""

    temperature: float
    fitted: bool
    source: str
    note: str

    def to_dict(self) -> dict:
        return asdict(self)


UNFITTED_CALIBRATION = Calibration(
    temperature=1.0,
    fitted=False,
    source="default",
    note=(
        "ยังไม่ได้ปรับเทียบความน่าจะเป็น (temperature = 1.0) "
        "ตัวเลขความมั่นใจคือคะแนน softmax ดิบ มักสูงกว่าความถูกต้องจริง"
    ),
)


def load_calibration(model_path: Path) -> Calibration:
    """Read ``calibration.json`` beside the model, or return the honest default.

    A missing file is the normal case, not an error: temperature scaling needs
    a labelled validation set, and shipping ``temperature = 1.0`` with
    ``fitted = False`` is how the service tells the truth about that instead of
    quietly implying its confidences are probabilities.
    """
    path = model_path.with_name("calibration.json")
    if not path.exists():
        return UNFITTED_CALIBRATION
    try:
        meta = json.loads(path.read_text(encoding="utf-8"))
        temperature = float(meta["temperature"])
    except (OSError, ValueError, KeyError, TypeError) as exc:
        # Refuse rather than silently serving uncalibrated scores as calibrated.
        raise RuntimeError(f"อ่าน {path.name} ไม่สำเร็จ: {exc}") from exc
    if not 0.05 <= temperature <= 20.0:
        raise RuntimeError(f"temperature {temperature} อยู่นอกช่วงที่สมเหตุสมผล (0.05-20)")
    return Calibration(
        temperature=temperature,
        fitted=True,
        source=path.name,
        note=(
            f"ปรับเทียบด้วย temperature scaling (T = {temperature:.3f}) "
            f"บนชุด validation ที่โมเดลไม่ได้เห็นตอนฝึก"
        ),
    )


def plan_regions(mode: str) -> tuple[list[tuple[str, tuple[float, float, float, float]]], int, int]:
    """(regions, views for the full frame, views per crop) for a mode."""
    if mode == "fast":
        return [FULL], 1, 0
    if mode == "balanced":
        # The full frame gets the variance reduction; the crops only have to
        # clear a high bar, so one view each is enough to find a candidate.
        return [FULL, *QUADRANTS], len(VIEW_NAMES), 1
    if mode == "deep":
        return [FULL, *QUADRANTS, CENTER], len(VIEW_NAMES), len(VIEW_NAMES)
    raise ValueError(f"โหมดไม่ถูกต้อง: {mode} (รองรับ {', '.join(MODES)})")


def _crop(image: Image.Image, box: tuple[float, float, float, float]) -> Image.Image:
    left, top, right, bottom = box
    if (left, top, right, bottom) == (0.0, 0.0, 1.0, 1.0):
        return image
    w, h = image.size
    return image.crop((round(left * w), round(top * h), round(right * w), round(bottom * h)))


def _work_image(image: Image.Image) -> Image.Image:
    """Downscale once so the per-crop resizes are cheap. See WORK_LONG_EDGE."""
    long_edge = max(image.size)
    if long_edge <= WORK_LONG_EDGE:
        return image
    scale = WORK_LONG_EDGE / long_edge
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    return image.resize(size, Image.BILINEAR)


def run(
    session,
    input_name: str,
    output_name: str,
    image: Image.Image,
    *,
    mode: str = DEFAULT_MODE,
    calibration: Calibration = UNFITTED_CALIBRATION,
    model_version: str = "unknown",
) -> dict:
    """Score one image and return the full, self-describing result.

    The return value is a superset of the v2 ``/predict`` body: ``class_id``,
    ``confidence``, ``scores`` and ``model_version`` keep their old meanings,
    so a caller written against v2 still works. Everything a caller needs in
    order to *doubt* the verdict is in the new keys.
    """
    started = time.perf_counter()
    regions, full_views, tile_views = plan_regions(mode)

    # Quality and lesion area are read from the photo as it arrived: the focus
    # score in particular is meaningless after a downscale, which smooths away
    # exactly the high-frequency detail it measures.
    quality, lesions = leafcheck.analyse(image)
    work = _work_image(image)

    # -- Build every crop-and-view, then run the network once ----------------
    # The exported graph has a dynamic batch axis, so one call over 24 crops
    # costs roughly half of 24 separate calls.
    batch: list[np.ndarray] = []
    # (region index, number of views contributed) in batch order.
    layout: list[tuple[int, int]] = []
    tissue: list[float] = []

    for index, (name, box) in enumerate(regions):
        crop = _crop(work, box)
        tissue.append(leafcheck.region_tissue_fraction(crop) if name != "full" else quality.leaf_fraction)
        n_views = full_views if name == "full" else tile_views
        base = preprocess(crop)
        for view_name in VIEW_NAMES[:n_views]:
            batch.append(_view(base, view_name))
        layout.append((index, n_views))

    # ``_view`` returns negative-stride views; ONNX Runtime needs contiguous
    # memory, which ``ascontiguousarray`` guarantees for the whole batch.
    stacked = np.ascontiguousarray(np.concatenate(batch, axis=0), dtype=np.float32)
    logits = session.run([output_name], {input_name: stacked})[0]

    # -- Average the views, then calibrate, then soften to probabilities -----
    # Averaging logits rather than probabilities is the right order for an
    # ensemble over one shared head: it is a geometric mean of the
    # distributions, which keeps a confidently-wrong view from dominating the
    # vote the way an arithmetic mean of softmax outputs does.
    results: list[RegionResult] = []
    cursor = 0
    for region_index, n_views in layout:
        name, box = regions[region_index]
        mean_logits = logits[cursor : cursor + n_views].mean(axis=0)
        cursor += n_views
        probs = softmax(mean_logits / calibration.temperature)
        winner = int(np.argmax(probs))
        results.append(
            RegionResult(
                name=name,
                box=box,
                class_id=CLASSES[winner],
                confidence=round(float(probs[winner]), 6),
                tissue_fraction=round(tissue[region_index], 4),
                scores={cls: round(float(p), 6) for cls, p in zip(CLASSES, probs)},
                views=n_views,
            )
        )

    verdict, aggregation = aggregate(results)

    payload = {
        # -- v2 contract, unchanged meanings --
        "class_id": verdict.class_id,
        "confidence": verdict.confidence,
        "scores": verdict.scores,
        "model_version": model_version,
        "note": (
            "ผลนี้ผ่านการรวมหลายมุมและหลายบริเวณของภาพ แต่ยังไม่ใช่คำวินิจฉัย "
            "และยังไม่ผ่านการปรับเทียบเป็นความน่าจะเป็นจริง"
            if not calibration.fitted
            else "ผลนี้ผ่านการรวมหลายมุมและหลายบริเวณของภาพ และปรับเทียบความน่าจะเป็นแล้ว แต่ยังไม่ใช่คำวินิจฉัย"
        ),
        # -- v3 additions --
        "engine_version": ENGINE_VERSION,
        "mode": mode,
        "abstain": not quality.usable,
        "quality": quality.to_dict(),
        "lesions": lesions.to_dict(),
        "aggregation": aggregation,
        "regions": [r.to_dict() for r in results],
        "calibration": calibration.to_dict(),
        "inference_ms": round((time.perf_counter() - started) * 1000, 1),
    }
    return payload


def aggregate(results: list[RegionResult]) -> tuple[RegionResult, dict]:
    """Pick the verdict from the per-crop results, and show the work.

    The whole-frame result is the default verdict, because it is the one the
    model's training and its published metrics actually describe. A crop can
    overrule it in exactly one direction: when the frame says *healthy* and a
    crop with enough leaf tissue in it says *disease* above
    ``TILE_SUSPICION``.

    The reverse never happens. A crop that says "healthy" cannot soften a
    whole-frame disease call, because of the 19 wrongly-healthy images in the
    test set: a healthy-looking corner of an infected leaf is the expected
    case, not evidence of health.
    """
    frame = next(r for r in results if r.name == "full")
    tiles = [r for r in results if r.name != "full"]

    runner_up = max(
        (c for c in CLASSES if c != frame.class_id),
        key=lambda c: frame.scores[c],
    )

    candidates = [
        tile
        for tile in tiles
        if tile.class_id != "Healthy"
        and tile.confidence >= TILE_SUSPICION
        and tile.tissue_fraction >= TILE_MIN_TISSUE
    ]
    suppressed = [
        tile
        for tile in tiles
        if tile.class_id != "Healthy"
        and tile.confidence >= TILE_SUSPICION
        and tile.tissue_fraction < TILE_MIN_TISSUE
    ]

    base = {
        "frame_class_id": frame.class_id,
        "frame_confidence": frame.confidence,
        "frame_scores": frame.scores,
        "frame_runner_up": runner_up,
        "regions_scored": len(results),
        "tile_suspicion_threshold": TILE_SUSPICION,
        "tile_min_tissue_fraction": TILE_MIN_TISSUE,
        # Named so a reader knows the rule is one-way by design.
        "rule": "crop-may-escalate-healthy-never-downgrade-disease",
        "suppressed_low_tissue_tiles": [t.name for t in suppressed],
    }

    if frame.class_id != "Healthy" or not candidates:
        return frame, {
            **base,
            "source_region": frame.name,
            "escalated_from_healthy": False,
            "supporting_tiles": [],
            "agrees_with_frame_runner_up": False,
        }

    best = max(candidates, key=lambda t: t.confidence)
    agreeing = [t.name for t in candidates if t.class_id == best.class_id]
    return best, {
        **base,
        "source_region": best.name,
        "escalated_from_healthy": True,
        "supporting_tiles": agreeing,
        # Coherence check, reported rather than required: when the whole
        # frame's second guess is the same disease the crop found, the two
        # pieces of evidence point the same way.
        "agrees_with_frame_runner_up": best.class_id == runner_up,
    }
