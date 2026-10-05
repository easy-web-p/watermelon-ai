"""Image analysis that runs *beside* the classifier, not through it.

The classifier is a four-way softmax: hand it a photo of a shoe and it still
returns one of Anthracnose / Downy_Mildew / Healthy / Mosaic_Virus, with a
confidence that can easily clear 0.9. It has no way to say "that is not a
leaf" or "that photo is too blurry to read", because neither was ever a
training label.

This module supplies those two judgements from the pixels themselves, so the
service can decline instead of guessing:

  * ``assess_quality`` - is this photo readable at all? (focus, exposure,
    resolution, and whether there is leaf tissue in the frame)
  * ``lesion_stats``   - what share of the leaf tissue is discoloured?

``lesion_stats`` is deliberately named after what it measures. It counts
necrotic and chlorotic *pixels*; it does not know which disease caused them
and must never be presented as a severity diagnosis. Its value to a farmer is
that it is a repeatable number: the same leaf photographed a week later gives
a comparable figure, which a per-disease constant from a catalogue cannot.

Pure NumPy and Pillow. Nothing here needs SciPy, OpenCV or a model file, so
it also runs inside the training scripts and the self-check.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field

import numpy as np
from PIL import Image

# Every measurement below is taken on the image resized so its long edge is
# this many pixels. Without a fixed working size the focus score would depend
# on the phone's megapixel count rather than on how sharp the photo is.
WORK_EDGE = 512


# -- Hue bands ---------------------------------------------------------------
# Pillow's HSV mode packs hue into 0-255 rather than 0-359, so a hue in degrees
# maps to ``degrees * 255 / 360``. The three bands are written in degrees and
# converted once, because every agronomy reference describes leaf colour in
# degrees and a reader has to be able to check these numbers.
def _hue(degrees: float) -> float:
    return degrees * 255.0 / 360.0


# Living leaf tissue: yellow-green through to blue-green.
GREEN_HUE = (_hue(65), _hue(175))
# Chlorosis - the yellowing of mosaic virus and the early halo of downy mildew.
CHLOROTIC_HUE = (_hue(38), _hue(65))
# Necrosis - the brown, collapsed tissue of an anthracnose lesion.
NECROTIC_HUE = (_hue(8), _hue(38))

# Saturation and value floors. Below these a pixel is grey: shadow, sky,
# soil, a plastic crate, a hand. Counting those as leaf would inflate every
# fraction this module reports.
MIN_SATURATION = 40
MIN_VALUE = 28

# Near-white pixels are excluded instead of all bright ones. In sunlight the
# green channel of a leaf saturates at 255 while red and blue stay well below
# it, so the pixel keeps its hue and is plainly leaf — rejecting it on
# brightness alone made a sunlit leaf measure as *no leaf at all*. What has to
# go is specular glare and sky: bright **and** colourless.
WHITE_VALUE = 250
WHITE_SATURATION = 60

# -- Verdict thresholds ------------------------------------------------------
# A photo below this focus score has no fine texture left, so an early lesion
# a few millimetres across cannot be in it even if it is on the leaf. Chosen
# on the conservative side: the cost of asking for one more photo is seconds,
# the cost of reading a diagnosis off a smear is a season.
FOCUS_UNUSABLE = 18.0
FOCUS_MARGINAL = 55.0

# Mean luma below this means the photo is too dark to read tissue colour from.
LUMA_DARK = 38.0
# Share of pixels with at least one channel pinned at the top or bottom of its
# range. Past the unusable bar the hue of a lesion is no longer in the file, so
# no amount of model is going to recover it.
CLIPPED_MARGINAL = 0.25
CLIPPED_UNUSABLE = 0.55

# Share of the frame that has to look like leaf tissue before the classifier's
# answer means anything. A frame under the unusable bar is something else.
LEAF_UNUSABLE = 0.12
LEAF_MARGINAL = 0.28

# Leaf tissue that is entirely brown with no green anywhere is far more likely
# to be soil, mulch or a wooden bench than a leaf.
MIN_GREEN_FOR_LEAF = 0.025

# Under this many pixels on the long edge there is no detail to resize *down*
# to the model's 224 px input, so the photo was already degraded before it
# arrived.
MIN_LONG_EDGE = 224


@dataclass(frozen=True)
class Quality:
    """Whether a photo can carry a diagnosis, and why not when it cannot."""

    verdict: str  # "usable" | "marginal" | "unusable"
    focus_score: float
    luma_mean: float
    clipped_fraction: float
    leaf_fraction: float
    green_fraction: float
    long_edge: int
    #: Thai, farmer-facing, and specific about what to change. Empty when usable.
    reasons: list[str] = field(default_factory=list)

    @property
    def usable(self) -> bool:
        return self.verdict != "unusable"

    def to_dict(self) -> dict:
        data = asdict(self)
        data["usable"] = self.usable
        return data


@dataclass(frozen=True)
class Lesions:
    """Discoloured share of the leaf tissue found in the frame."""

    #: Pixels classified as leaf tissue, as a share of the whole frame.
    leaf_fraction: float
    #: The three fractions below are shares *of the leaf tissue* and sum to 1.
    healthy_fraction: float
    chlorotic_fraction: float
    necrotic_fraction: float
    #: chlorotic + necrotic. The headline number.
    discolored_fraction: float
    #: False when there was too little leaf tissue for the fractions to mean
    #: anything. The caller must not show them.
    measured: bool

    def to_dict(self) -> dict:
        return asdict(self)


def _work_image(image: Image.Image) -> Image.Image:
    """Resize so the long edge is ``WORK_EDGE``, leaving smaller images alone."""
    long_edge = max(image.size)
    if long_edge <= WORK_EDGE:
        return image.convert("RGB")
    scale = WORK_EDGE / long_edge
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    return image.convert("RGB").resize(size, Image.BILINEAR)


def _luma(rgb: np.ndarray) -> np.ndarray:
    """Rec. 601 luma, the channel the eye reads detail from."""
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def focus_score(image: Image.Image) -> float:
    """Variance of the Laplacian - the standard no-reference sharpness proxy.

    A sharp photo has strong second derivatives at every leaf vein and lesion
    edge; a blurred one has almost none. Computed with array slicing rather
    than a convolution library so the serving dependencies stay at NumPy.

    Normalised by the image's own contrast, because an in-focus photo of a
    uniformly pale leaf would otherwise score like a blurred one.
    """
    return _focus_from_luma(_luma(np.asarray(_work_image(image), dtype=np.float32)))


def _focus_from_luma(luma: np.ndarray) -> float:
    if min(luma.shape) < 3:
        return 0.0
    # 4-neighbour discrete Laplacian on the interior.
    lap = (
        4.0 * luma[1:-1, 1:-1]
        - luma[:-2, 1:-1]
        - luma[2:, 1:-1]
        - luma[1:-1, :-2]
        - luma[1:-1, 2:]
    )
    contrast = float(luma.std())
    # The 8.0 floor keeps a near-black frame from dividing its way up to
    # "sharp"; 48 is roughly mid-grey std, so a normal photo scales by ~1.
    return float(lap.var()) * 48.0 / max(8.0, contrast)


def _tissue_masks(work: Image.Image) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """(green, chlorotic, necrotic) boolean masks.

    Takes an image already reduced by ``_work_image``. Resizing a 12 MP phone
    photo costs more than everything else in this module put together, so the
    callers do it once and share the result.
    """
    hsv = np.asarray(work.convert("HSV"), dtype=np.int16)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    glare = (val >= WHITE_VALUE) & (sat < WHITE_SATURATION)
    lit = (sat >= MIN_SATURATION) & (val >= MIN_VALUE) & ~glare

    def band(span: tuple[float, float]) -> np.ndarray:
        return lit & (hue >= span[0]) & (hue < span[1])

    return band(GREEN_HUE), band(CHLOROTIC_HUE), band(NECROTIC_HUE)


def assess_quality(image: Image.Image) -> Quality:
    """Decide whether this photo can carry a diagnosis.

    Three independent ways a photo fails, each with its own fix, so the
    message tells the farmer what to do differently rather than just
    "try again": out of focus, badly exposed, or not pointed at a leaf.
    """
    work = _work_image(image)
    return _quality_from(work, _tissue_masks(work), max(image.size), image.size)


def analyse(image: Image.Image) -> tuple[Quality, Lesions]:
    """Both measurements in one pass.

    Resizing a 12 MP phone photo is the dominant cost in this module, so the
    serving path asks for both results at once and pays for one resize and one
    HSV conversion instead of four.
    """
    work = _work_image(image)
    masks = _tissue_masks(work)
    return (
        _quality_from(work, masks, max(image.size), image.size),
        _lesions_from(masks),
    )


def _quality_from(
    work: Image.Image,
    masks: tuple[np.ndarray, np.ndarray, np.ndarray],
    long_edge: int,
    original_size: tuple[int, int],
) -> Quality:
    green, chlorotic, necrotic = masks
    rgb = np.asarray(work, dtype=np.float32)
    luma = _luma(rgb)

    pixels = luma.size
    # Clipping is measured per channel, not on luma. A sunlit leaf whose green
    # channel pins at 255 still has a mid-range luma, so a luma-only test
    # calls that photo correctly exposed while the colour that distinguishes a
    # chlorotic lesion from healthy tissue has already been thrown away.
    channel_max = rgb.max(axis=-1)
    channel_min = rgb.min(axis=-1)
    clipped = float(((channel_max >= 254) | (channel_min <= 1)).sum()) / pixels
    luma_mean = float(luma.mean())
    focus = _focus_from_luma(luma)
    green_fraction = float(green.sum()) / pixels
    leaf_fraction = green_fraction + float(chlorotic.sum() + necrotic.sum()) / pixels
    width, height = original_size

    reasons: list[str] = []
    verdict = "usable"

    def fail(reason: str) -> None:
        nonlocal verdict
        verdict = "unusable"
        reasons.append(reason)

    def warn(reason: str) -> None:
        nonlocal verdict
        if verdict == "usable":
            verdict = "marginal"
        reasons.append(reason)

    # The three checks run in this order on purpose, because each one destroys
    # the evidence the next would need:
    #   exposure  - a clipped frame has no colour left to find leaf tissue in,
    #               so reporting "no leaf" there would name the wrong problem
    #   leaf       - a sharp, well-exposed photo of the wrong subject is the
    #               failure most likely to produce a confident wrong answer,
    #               because the classifier has no class for "something else"
    #   focus      - checked last; it is the only one that can be marginal and
    #               still leave a readable photo
    exposure_failed = False

    # -- Exposure --
    if luma_mean < LUMA_DARK:
        fail(f"ภาพมืดเกินไป (ความสว่างเฉลี่ย {luma_mean:.0f}/255) ให้ถ่ายในที่มีแสงธรรมชาติ")
        exposure_failed = True
    elif clipped > CLIPPED_UNUSABLE:
        fail(
            f"ภาพสว่างจัดเกินไป สีหายไป {clipped * 100:.0f}% ของภาพ "
            "สีของแผลจะแยกจากใบปกติไม่ได้ ให้ถ่ายในที่ร่มหรือเลี่ยงแดดส่องตรง"
        )
        exposure_failed = True
    elif clipped > CLIPPED_MARGINAL:
        warn(f"มีส่วนที่สว่างจัดหรือมืดจัด {clipped * 100:.0f}% ของภาพ สีบริเวณนั้นอ่านไม่ได้")

    # -- Is there a leaf in the frame? --
    if exposure_failed:
        # The hue bands are meaningless on a clipped frame, so skip rather than
        # add a second, wrong reason to a photo that already has to be retaken.
        pass
    elif leaf_fraction < LEAF_UNUSABLE:
        fail(
            f"ไม่พบเนื้อใบในภาพ (เจอเพียง {leaf_fraction * 100:.0f}% ของเฟรม) "
            "ให้ถ่ายใกล้ขึ้นจนใบเต็มกรอบภาพ"
        )
    elif green_fraction < MIN_GREEN_FOR_LEAF:
        # Brown fills the frame but nothing in it is alive. Either the subject
        # is soil, mulch or a wooden surface, or it is a macro crop of one
        # lesion with no leaf around it. Both need a different photo: with no
        # healthy tissue for contrast the classifier has nothing to compare
        # the lesion against.
        fail(
            "ภาพนี้ไม่มีเนื้อใบสีเขียวเลย อาจเป็นภาพดิน พื้น หรือถ่ายจ่อแผลใกล้เกินไป "
            "ให้ถอยออกมาถ่ายให้เห็นใบทั้งใบ"
        )
    elif leaf_fraction < LEAF_MARGINAL:
        warn(
            f"ใบกินพื้นที่ภาพเพียง {leaf_fraction * 100:.0f}% ฉากหลังมากเกินไป "
            "ให้ถ่ายใกล้ขึ้นเพื่อให้โมเดลเห็นแผลชัด"
        )

    # -- Focus --
    if focus < FOCUS_UNUSABLE:
        fail(
            f"ภาพเบลอเกินกว่าจะอ่านแผลได้ (คะแนนความคม {focus:.0f}) "
            "ให้จับโทรศัพท์นิ่ง ๆ แล้วแตะโฟกัสที่ใบก่อนถ่าย"
        )
    elif focus < FOCUS_MARGINAL:
        warn(f"ภาพค่อนข้างเบลอ (คะแนนความคม {focus:.0f}) แผลเล็กระยะแรกอาจหายไปจากภาพนี้")

    # -- Resolution --
    if long_edge < MIN_LONG_EDGE:
        warn(
            f"ภาพเล็กเพียง {width}x{height} px "
            f"รายละเอียดน้อยกว่าที่โมเดลต้องการ ({MIN_LONG_EDGE} px)"
        )

    return Quality(
        verdict=verdict,
        focus_score=round(focus, 1),
        luma_mean=round(luma_mean, 1),
        clipped_fraction=round(clipped, 4),
        leaf_fraction=round(leaf_fraction, 4),
        green_fraction=round(green_fraction, 4),
        long_edge=long_edge,
        reasons=reasons,
    )


def lesion_stats(image: Image.Image) -> Lesions:
    """Share of the leaf tissue that is chlorotic or necrotic.

    Measured inside the leaf mask, not over the whole frame, so a photo taken
    against bare soil does not read as a devastated leaf.
    """
    return _lesions_from(_tissue_masks(_work_image(image)))


def _lesions_from(masks: tuple[np.ndarray, np.ndarray, np.ndarray]) -> Lesions:
    green, chlorotic, necrotic = masks
    leaf_pixels = int(green.sum() + chlorotic.sum() + necrotic.sum())
    frame_pixels = green.size
    green_fraction = float(green.sum()) / frame_pixels

    too_little_tissue = leaf_pixels < max(400, frame_pixels * LEAF_UNUSABLE)
    # The green floor is repeated from ``assess_quality`` on purpose. Without
    # it, a frame of bare soil measures as 100% necrotic, and this function
    # must not depend on the caller having run the quality gate first.
    no_living_tissue = green_fraction < MIN_GREEN_FOR_LEAF

    if too_little_tissue or no_living_tissue:
        # Too little tissue for a percentage to be anything but noise. Say so
        # rather than reporting a fraction of a few hundred pixels.
        return Lesions(
            leaf_fraction=round(leaf_pixels / frame_pixels, 4),
            healthy_fraction=0.0,
            chlorotic_fraction=0.0,
            necrotic_fraction=0.0,
            discolored_fraction=0.0,
            measured=False,
        )

    healthy = float(green.sum()) / leaf_pixels
    chlorosis = float(chlorotic.sum()) / leaf_pixels
    necrosis = float(necrotic.sum()) / leaf_pixels
    return Lesions(
        leaf_fraction=round(leaf_pixels / frame_pixels, 4),
        healthy_fraction=round(healthy, 4),
        chlorotic_fraction=round(chlorosis, 4),
        necrotic_fraction=round(necrosis, 4),
        discolored_fraction=round(chlorosis + necrosis, 4),
        measured=True,
    )


def region_tissue_fraction(image: Image.Image) -> float:
    """Leaf-tissue share of one crop. Cheap enough to call per tile.

    Used to stop a tile that is mostly soil or sky from raising a disease
    alarm: the classifier will happily name a disease in a patch of dirt.
    """
    green, chlorotic, necrotic = _tissue_masks(_work_image(image))
    return float(green.sum() + chlorotic.sum() + necrotic.sum()) / green.size
