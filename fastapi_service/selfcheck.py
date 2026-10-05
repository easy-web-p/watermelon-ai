"""Test suite for the vision service. Run it before handing work over.

    py selfcheck.py            # everything
    py selfcheck.py --no-model # skip the checks that need model.onnx

Plain asserts and a counter rather than pytest, because pytest is not in this
project's dependencies and adding a test framework to run eleven groups of
assertions is not a trade worth making. Exits non-zero on the first failing
group's summary, so CI and a human read the same thing.

What is deliberately *not* here: an accuracy number. These checks verify that
the engine does what it claims mechanically — that a flip is a flip, that a
crop cannot talk the model out of a disease call, that the metrics code
reproduces the recorded run. Accuracy needs labelled leaves, which is
``fit_calibration.py``'s job.
"""

from __future__ import annotations

import argparse
import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import evaluation
import inference
import leafcheck
from inference import RegionResult
from model import CLASSES, IMAGE_SIZE, preprocess

HERE = Path(__file__).parent

passed = 0
failed: list[str] = []
_group = "?"


def group(name: str) -> None:
    global _group
    _group = name
    print(f"\n{name}")


def check(label: str, condition: bool, detail: str = "") -> None:
    global passed
    if condition:
        passed += 1
        print(f"  ok   {label}" + (f"  [{detail}]" if detail else ""))
    else:
        failed.append(f"{_group} / {label}" + (f"  [{detail}]" if detail else ""))
        print(f"  FAIL {label}" + (f"  [{detail}]" if detail else ""))


def near(a: float, b: float, tol: float = 1e-9) -> bool:
    return abs(a - b) <= tol


# -- Image fixtures ----------------------------------------------------------

RNG = np.random.default_rng(20261005)


def leaf_photo(
    height: int = 900,
    width: int = 1200,
    brightness: float = 1.0,
    lesions: tuple = (),
    lesion_colour: tuple[int, int, int] = (118, 68, 36),
    blur: float = 0.0,
) -> Image.Image:
    """A plausible photo of a lit leaf: shading, veins, sensor noise, JPEG."""
    yy, xx = np.mgrid[0:height, 0:width] / np.array([[height]], float)
    shade = 0.84 + 0.28 * np.exp(-((xx - 0.5) ** 2 + (yy - 0.5) ** 2) / 0.3)
    base = np.stack(
        [np.full((height, width), 56.0), np.full((height, width), 130.0), np.full((height, width), 50.0)],
        axis=-1,
    )
    array = base * shade[..., None]
    for index in range(24):
        row = int(height * (index + 0.5) / 24)
        array[max(0, row - 3) : row + 3, :, :] *= 0.77
    array = array * brightness + RNG.normal(0, 3.5, (height, width, 3))
    image = Image.fromarray(np.clip(array, 0, 255).astype(np.uint8))
    draw = ImageDraw.Draw(image)
    for cx, cy, radius in lesions:
        draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=lesion_colour)
    if blur:
        image = image.filter(ImageFilter.GaussianBlur(blur))
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=90)
    buffer.seek(0)
    return Image.open(buffer).convert("RGB")


def flat(colour: tuple[int, int, int], height: int = 900, width: int = 1200, noise: float = 9.0) -> Image.Image:
    array = np.full((height, width, 3), np.array(colour, float)) + RNG.normal(0, noise, (height, width, 3))
    return Image.fromarray(np.clip(array, 0, 255).astype(np.uint8))


# -- leafcheck ---------------------------------------------------------------


def test_quality_gate() -> None:
    group("leafcheck: the quality gate accepts real photos and names the real problem")
    cases = [
        ("a normal photo is usable", leaf_photo(), "usable", None),
        ("a bright photo is still usable", leaf_photo(brightness=1.6), "usable", None),
        ("a diseased leaf is usable", leaf_photo(lesions=[(300, 500, 90)]), "usable", None),
        ("a badly defocused photo is refused", leaf_photo(blur=8), "unusable", "เบลอ"),
        ("an underexposed photo is refused for exposure", leaf_photo(brightness=0.28), "unusable", "มืด"),
        ("an overexposed photo is refused for exposure", leaf_photo(brightness=3.2), "unusable", "สว่างจัดเกินไป"),
        ("a sunlit leaf is still read as a leaf", leaf_photo(brightness=1.9), "usable", None),
        ("a grey wall is refused as not-a-leaf", flat((152, 152, 152)), "unusable", "ไม่พบเนื้อใบ"),
        ("bare soil is refused as not-a-leaf", flat((126, 92, 64)), "unusable", "ไม่มีเนื้อใบสีเขียว"),
        ("skin is refused as not-a-leaf", flat((225, 172, 142)), "unusable", "ไม่มีเนื้อใบสีเขียว"),
    ]
    for label, image, want_verdict, want_reason in cases:
        quality = leafcheck.assess_quality(image)
        detail = f"{quality.verdict}, focus={quality.focus_score:.0f}, leaf={quality.leaf_fraction:.2f}"
        ok = quality.verdict == want_verdict
        if ok and want_reason:
            ok = any(want_reason in reason for reason in quality.reasons)
        check(label, ok, detail)

    tiny = leafcheck.assess_quality(leaf_photo(height=120, width=160))
    check("a 160px photo is flagged but not refused", tiny.verdict == "marginal", tiny.verdict)
    check("a usable photo carries no complaints", leafcheck.assess_quality(leaf_photo()).reasons == [])
    check(
        "the unusable verdict is the only one that blocks a diagnosis",
        leafcheck.assess_quality(leaf_photo()).usable
        and leafcheck.assess_quality(leaf_photo(height=120, width=160)).usable
        and not leafcheck.assess_quality(flat((152, 152, 152))).usable,
    )


def test_lesion_measurement() -> None:
    group("leafcheck: lesion area is measured, and refuses to be measured when it cannot be")
    clean = leafcheck.lesion_stats(leaf_photo())
    check("a clean leaf measures near zero discolouration", clean.measured and clean.discolored_fraction < 0.02,
          f"{clean.discolored_fraction:.4f}")

    # A quarter of the frame painted necrotic brown.
    quarter = leaf_photo()
    ImageDraw.Draw(quarter).rectangle([0, 0, 300, 900], fill=(120, 70, 38))
    necrotic = leafcheck.lesion_stats(quarter)
    check(
        "a quarter-necrotic leaf measures ~0.25 necrotic",
        necrotic.measured and 0.20 <= necrotic.necrotic_fraction <= 0.30,
        f"{necrotic.necrotic_fraction:.3f}",
    )
    check(
        "the three tissue fractions sum to 1",
        near(necrotic.healthy_fraction + necrotic.chlorotic_fraction + necrotic.necrotic_fraction, 1.0, 1e-3),
    )

    chlorotic = leaf_photo()
    ImageDraw.Draw(chlorotic).rectangle([0, 0, 480, 900], fill=(198, 200, 72))
    yellow = leafcheck.lesion_stats(chlorotic)
    check(
        "a yellowed leaf is counted as chlorotic, not necrotic",
        yellow.chlorotic_fraction > 0.3 and yellow.necrotic_fraction < 0.05,
        f"chlor={yellow.chlorotic_fraction:.3f} necro={yellow.necrotic_fraction:.3f}",
    )

    soil = leafcheck.lesion_stats(flat((126, 92, 64)))
    check(
        "bare soil refuses to report a lesion fraction rather than reading 100% necrotic",
        not soil.measured and soil.discolored_fraction == 0.0,
    )
    wall = leafcheck.lesion_stats(flat((152, 152, 152)))
    check("a grey wall refuses to report a lesion fraction", not wall.measured)


def test_analyse_matches_separate_calls() -> None:
    group("leafcheck: the one-pass helper equals the two separate calls")
    image = leaf_photo(lesions=[(400, 400, 120)])
    quality, lesions = leafcheck.analyse(image)
    check("quality is identical", quality == leafcheck.assess_quality(image))
    check("lesions are identical", lesions == leafcheck.lesion_stats(image))


# -- inference ---------------------------------------------------------------


def test_tta_views_are_exact() -> None:
    group("inference: a flipped array is bit-identical to a flipped image")
    image = Image.fromarray(RNG.integers(0, 256, (437, 611, 3), dtype=np.uint8))
    base = preprocess(image)
    for name, operation in (
        ("hflip", Image.FLIP_LEFT_RIGHT),
        ("vflip", Image.FLIP_TOP_BOTTOM),
        ("hvflip", Image.ROTATE_180),
    ):
        via_array = np.ascontiguousarray(inference._view(base, name))
        via_image = preprocess(image.transpose(operation))
        check(f"{name} is exact", np.array_equal(via_array, via_image))
    check("identity is the input", np.array_equal(inference._view(base, "identity"), base))
    check("preprocess emits the shape the graph wants", base.shape == (1, 3, IMAGE_SIZE, IMAGE_SIZE), str(base.shape))
    check(
        "every named view is implemented",
        all(inference._view(base, name) is not None for name in inference.VIEW_NAMES),
    )


def test_region_plans() -> None:
    group("inference: each mode scores the crops it claims to")
    expected = {"fast": (1, 1), "balanced": (5, 8), "deep": (6, 24)}
    for mode, (want_regions, want_crops) in expected.items():
        regions, full_views, tile_views = inference.plan_regions(mode)
        crops = full_views + (len(regions) - 1) * tile_views
        check(f"{mode}: {want_regions} regions, {want_crops} crops", (len(regions), crops) == (want_regions, want_crops),
              f"{len(regions)} regions, {crops} crops")
    check("every mode includes the full frame", all(
        any(name == "full" for name, _ in inference.plan_regions(m)[0]) for m in inference.MODES
    ))
    try:
        inference.plan_regions("turbo")
        check("an unknown mode is refused", False)
    except ValueError:
        check("an unknown mode is refused", True)

    for name, (left, top, right, bottom) in [inference.FULL, *inference.QUADRANTS, inference.CENTER]:
        check(
            f"region {name} is a valid box",
            0.0 <= left < right <= 1.0 and 0.0 <= top < bottom <= 1.0,
            f"({left}, {top}, {right}, {bottom})",
        )


def region(name: str, class_id: str, confidence: float, tissue: float = 1.0) -> RegionResult:
    """A RegionResult with the rest of the distribution spread evenly."""
    share = (1.0 - confidence) / (len(CLASSES) - 1)
    scores = {c: (confidence if c == class_id else share) for c in CLASSES}
    box = (0.0, 0.0, 1.0, 1.0) if name == "full" else (0.0, 0.45, 0.55, 1.0)
    return RegionResult(name, box, class_id, confidence, tissue, scores, 4)


def test_aggregation_rule() -> None:
    group("inference: the aggregation rule is asymmetric, and only in the safe direction")

    # The case the whole engine exists for.
    verdict, meta = inference.aggregate([
        region("full", "Healthy", 0.95),
        region("q-tl", "Healthy", 0.92),
        region("q-bl", "Downy_Mildew", 0.88),
    ])
    check("a confident crop overrules a confident whole-frame 'healthy'",
          verdict.class_id == "Downy_Mildew" and meta["escalated_from_healthy"],
          f"{verdict.class_id} from {meta['source_region']}")
    check("the escalation names the crop it came from", meta["source_region"] == "q-bl")
    check("the frame's own answer is still reported", meta["frame_class_id"] == "Healthy"
          and near(meta["frame_confidence"], 0.95))

    # The reverse must never happen.
    verdict, meta = inference.aggregate([
        region("full", "Anthracnose", 0.91),
        region("q-tl", "Healthy", 0.99),
        region("q-tr", "Healthy", 0.99),
        region("q-bl", "Healthy", 0.99),
        region("q-br", "Healthy", 0.99),
    ])
    check("four healthy crops cannot downgrade a whole-frame disease call",
          verdict.class_id == "Anthracnose" and not meta["escalated_from_healthy"],
          verdict.class_id)

    # A crop below the bar is evidence, not a verdict.
    verdict, meta = inference.aggregate([
        region("full", "Healthy", 0.95),
        region("q-bl", "Downy_Mildew", inference.TILE_SUSPICION - 0.01),
    ])
    check("a crop just under the suspicion bar does not escalate",
          verdict.class_id == "Healthy" and not meta["escalated_from_healthy"])
    verdict, meta = inference.aggregate([
        region("full", "Healthy", 0.95),
        region("q-bl", "Downy_Mildew", inference.TILE_SUSPICION),
    ])
    check("a crop exactly at the bar does escalate", meta["escalated_from_healthy"])

    # A crop of soil must not raise an alarm.
    verdict, meta = inference.aggregate([
        region("full", "Healthy", 0.95),
        region("q-bl", "Anthracnose", 0.97, tissue=inference.TILE_MIN_TISSUE - 0.01),
    ])
    check("a crop with too little leaf tissue is suppressed",
          verdict.class_id == "Healthy" and meta["suppressed_low_tissue_tiles"] == ["q-bl"],
          str(meta["suppressed_low_tissue_tiles"]))

    # Several crops agreeing is reported as strength.
    verdict, meta = inference.aggregate([
        region("full", "Healthy", 0.93),
        region("q-tl", "Mosaic_Virus", 0.85),
        region("q-bl", "Mosaic_Virus", 0.91),
        region("q-br", "Anthracnose", 0.84),
    ])
    check("the strongest agreeing crop wins", verdict.class_id == "Mosaic_Virus" and near(verdict.confidence, 0.91))
    check("agreeing crops are listed, disagreeing ones are not",
          sorted(meta["supporting_tiles"]) == ["q-bl", "q-tl"], str(meta["supporting_tiles"]))

    # fast mode has no crops at all, so the frame must stand alone.
    verdict, meta = inference.aggregate([region("full", "Healthy", 0.62)])
    check("with no crops the frame is the verdict", verdict.class_id == "Healthy"
          and meta["supporting_tiles"] == [] and not meta["escalated_from_healthy"])

    # The verdict's scores must match its class, or diseaseModel.ts would pick
    # a runner-up from a different region's distribution.
    verdict, _ = inference.aggregate([
        region("full", "Healthy", 0.95),
        region("q-bl", "Downy_Mildew", 0.88),
    ])
    top = max(CLASSES, key=lambda c: verdict.scores[c])
    check("the reported scores belong to the reported class", top == verdict.class_id
          and near(verdict.scores[top], verdict.confidence))
    check("the reported scores are a distribution", near(sum(verdict.scores.values()), 1.0, 1e-6))


def test_calibration_loading() -> None:
    group("inference: calibration is loaded honestly or not at all")
    missing = inference.load_calibration(HERE / "definitely-not-here.onnx")
    check("a missing file yields temperature 1.0", near(missing.temperature, 1.0))
    check("a missing file is reported as unfitted", not missing.fitted)
    check("the unfitted note says the scores are raw", "ยังไม่ได้ปรับเทียบ" in missing.note)

    scratch = HERE / "_selfcheck_tmp.onnx"
    sidecar = scratch.with_name("calibration.json")
    had_real = sidecar.exists()
    if had_real:
        check("a real calibration.json is present, skipping the write tests", True, "skipped")
        return
    try:
        sidecar.write_text(json.dumps({"temperature": 1.75}), encoding="utf-8")
        loaded = inference.load_calibration(scratch)
        check("a valid file is loaded", near(loaded.temperature, 1.75) and loaded.fitted)
        check("the fitted note states the temperature", "1.750" in loaded.note)

        for bad, why in [
            ({"temperature": 0.0}, "zero"),
            ({"temperature": 40.0}, "out of range"),
            ({"temperature": "warm"}, "not a number"),
            ({}, "missing key"),
        ]:
            sidecar.write_text(json.dumps(bad), encoding="utf-8")
            try:
                inference.load_calibration(scratch)
                check(f"a {why} temperature is refused", False)
            except RuntimeError:
                check(f"a {why} temperature is refused", True)
    finally:
        sidecar.unlink(missing_ok=True)


# -- evaluation --------------------------------------------------------------


def test_metrics_reproduce_the_recorded_run() -> None:
    group("evaluation: the metrics code reproduces the run already in metrics.json")
    path = HERE / "metrics.json"
    if not path.exists():
        check("metrics.json is present", False)
        return
    recorded = json.loads(path.read_text(encoding="utf-8"))["test"]
    matrix = np.array(recorded["confusion_matrix"])

    check("accuracy matches to the last digit",
          near(float(matrix.trace() / matrix.sum()), recorded["accuracy"], 1e-12),
          f"{matrix.trace() / matrix.sum():.16f}")
    mine = evaluation.per_class(matrix)
    macro = float(np.mean([mine[c]["f1"] for c in CLASSES]))
    check("macro F1 matches to the last digit", near(macro, recorded["macro_f1"], 1e-12), f"{macro:.16f}")
    for name in CLASSES:
        want = recorded["per_class"][name]
        check(f"{name} precision/recall/F1/support match",
              all(near(mine[name][k], want[k], 1e-12) for k in ("precision", "recall", "f1"))
              and mine[name]["support"] == want["support"])

    rate = evaluation.false_healthy_rate(matrix)
    missed = sum(int(matrix[i, evaluation.HEALTHY_INDEX]) for i in evaluation.DISEASE_INDICES)
    diseased = sum(int(matrix[i].sum()) for i in evaluation.DISEASE_INDICES)
    check("the false-healthy rate is counted from the matrix", near(rate, missed / diseased),
          f"{missed}/{diseased} = {rate:.4f}")
    check("the recorded run really did miss 19 diseased leaves", missed == 19, str(missed))
    check("macro F1 alone would hide it", recorded["macro_f1"] > 0.89 and rate > 0.13,
          f"macro_f1={recorded['macro_f1']:.3f} vs false_healthy={rate:.3f}")
    check("the selection score does not hide it",
          evaluation.selection_score(macro, rate) < macro - 0.2,
          f"{evaluation.selection_score(macro, rate):.4f}")


def synthetic_model(n: int, margin: float, seed: int = 4) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    truth = rng.integers(0, len(CLASSES), n)
    logits = rng.normal(0, 1.1, (n, len(CLASSES)))
    logits[np.arange(n), truth] += margin
    return truth, logits


def test_temperature_scaling() -> None:
    group("evaluation: temperature scaling moves confidence and nothing else")
    truth, logits = synthetic_model(4000, 2.4)
    temperature = evaluation.fit_temperature(logits, truth)
    before = evaluation.expected_calibration_error(truth, evaluation.softmax_rows(logits))
    after = evaluation.expected_calibration_error(truth, evaluation.softmax_rows(logits / temperature))
    check("calibration error falls", after < before, f"{before:.4f} -> {after:.4f}")
    check("predictions are unchanged",
          np.array_equal(evaluation.softmax_rows(logits).argmax(1),
                         evaluation.softmax_rows(logits / temperature).argmax(1)))

    # T must scale with the logits: the same model expressed at twice the
    # scale needs twice the temperature to reach the same calibration.
    doubled = evaluation.fit_temperature(logits * 2.0, truth)
    check("the fit is scale-equivariant", near(doubled, temperature * 2.0, temperature * 0.02),
          f"T={temperature:.4f}, T(2x)={doubled:.4f}")

    errors = [
        evaluation.expected_calibration_error(truth, evaluation.softmax_rows(logits * s / evaluation.fit_temperature(logits * s, truth)))
        for s in (0.25, 1.0, 4.0)
    ]
    check("the same calibration floor is reached from any starting scale",
          max(errors) - min(errors) < 1e-6, f"{errors}")

    check("a boundary temperature is flagged", evaluation.temperature_hit_boundary(evaluation.TEMPERATURE_MAX) is not None)
    check("a boundary temperature at the floor is flagged", evaluation.temperature_hit_boundary(evaluation.TEMPERATURE_MIN) is not None)
    check("an interior temperature is not flagged", evaluation.temperature_hit_boundary(1.4) is None)
    try:
        evaluation.fit_temperature(np.zeros((1, len(CLASSES))), np.array([0]))
        check("a one-image fit is refused", False)
    except ValueError:
        check("a one-image fit is refused", True)


def test_threshold_search() -> None:
    group("evaluation: the threshold search prices a missed infection correctly")
    check("a miss costs more than a false alarm", evaluation.MISS_COST > evaluation.FALSE_ALARM_COST)
    check("abstaining is the cheapest mistake", evaluation.ABSTAIN_COST < evaluation.FALSE_ALARM_COST)
    check("abstaining is not free", evaluation.ABSTAIN_COST > 0)

    truth, logits = synthetic_model(3000, 2.4)
    probs = evaluation.softmax_rows(logits)
    result = evaluation.search_thresholds(truth, probs)
    check("the search beats the v2 pair it is compared against",
          result["best"]["cost"] <= result["v2_baseline"]["cost"],
          f"{result['best']['cost_per_image']:.4f} vs {result['v2_baseline']['cost_per_image']:.4f}")
    check("a usable model beats never answering", result["beats_always_abstain"])

    noise_truth, noise_logits = synthetic_model(3000, 0.0, seed=11)
    noise = evaluation.search_thresholds(noise_truth, evaluation.softmax_rows(noise_logits))
    check("a model with no signal does NOT beat never answering",
          not noise["beats_always_abstain"],
          f"{noise['best']['cost_per_image']:.4f} vs {noise['always_abstain_baseline']['cost_per_image']:.4f}")

    weak_truth, weak_logits = synthetic_model(3000, 0.8, seed=12)
    weak = evaluation.search_thresholds(weak_truth, evaluation.softmax_rows(weak_logits))
    strong_truth, strong_logits = synthetic_model(3000, 5.0, seed=13)
    strong = evaluation.search_thresholds(strong_truth, evaluation.softmax_rows(strong_logits))
    check("a weaker model is given a stricter healthy bar",
          weak["best"]["healthy_threshold"] > strong["best"]["healthy_threshold"],
          f"weak={weak['best']['healthy_threshold']:.3f} strong={strong['best']['healthy_threshold']:.3f}")
    check("a weaker model abstains more often",
          weak["best"]["abstained"] > strong["best"]["abstained"],
          f"{weak['best']['abstained']} vs {strong['best']['abstained']}")

    everything = evaluation.decision_cost(truth, probs, 1.01, 1.01)
    check("impossible thresholds abstain on every image", everything["abstained"] == len(truth))
    check("abstaining on everything records no diagnosis",
          everything["missed_disease"] == 0 and everything["false_alarm"] == 0)


def test_summarise_shape() -> None:
    group("evaluation: the report carries the numbers the app and the log need")
    truth, logits = synthetic_model(600, 2.0)
    report = evaluation.summarise(truth, evaluation.softmax_rows(logits))
    for key in (
        "loss", "accuracy", "macro_f1", "false_healthy_rate", "false_healthy_count",
        "selection_score", "expected_calibration_error", "per_class", "confusion_matrix",
    ):
        check(f"report has {key}", key in report)
    check("per-class covers every class", sorted(report["per_class"]) == sorted(CLASSES))
    check("the confusion matrix totals the sample count",
          sum(sum(row) for row in report["confusion_matrix"]) == len(truth))
    check("accuracy equals the matrix trace over the total",
          near(report["accuracy"],
               sum(report["confusion_matrix"][i][i] for i in range(len(CLASSES))) / len(truth)))


# -- end to end --------------------------------------------------------------


def test_against_the_real_model() -> None:
    group("end to end: the exported model, through the engine")
    model_path = HERE / "model.onnx"
    if not model_path.exists():
        check("model.onnx is present", False, "run export_onnx.py")
        return
    import onnxruntime as ort

    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    calibration = inference.load_calibration(model_path)

    def predict(image, mode="balanced"):
        return inference.run(session, input_name, output_name, image,
                             mode=mode, calibration=calibration, model_version="selfcheck")

    photo = leaf_photo(lesions=[(300, 700, 80)])
    result = predict(photo)
    check("the v2 contract keys are all still present",
          all(k in result for k in ("class_id", "confidence", "scores", "model_version")))
    check("class_id is one of the trained classes", result["class_id"] in CLASSES, result["class_id"])
    check("scores are a distribution over exactly the trained classes",
          sorted(result["scores"]) == sorted(CLASSES) and near(sum(result["scores"].values()), 1.0, 1e-5))
    check("confidence is the score of the reported class",
          near(result["confidence"], result["scores"][result["class_id"]], 1e-6))
    check("the engine reports its own version and mode",
          result["engine_version"] == inference.ENGINE_VERSION and result["mode"] == "balanced")

    # The reason the quality gate exists: the classifier has no "not a leaf"
    # class, so it answers anyway.
    wall = predict(flat((152, 152, 152)))
    check("a photo of a wall sets abstain", wall["abstain"] is True)
    check("...and the model did still name a disease, which is the point",
          wall["class_id"] in CLASSES, f"{wall['class_id']} at {wall['confidence']:.3f}")
    check("...and the reason is specific", any("เนื้อใบ" in r for r in wall["quality"]["reasons"]))

    check("a real leaf photo does not abstain", predict(photo)["abstain"] is False)

    for mode in inference.MODES:
        out = predict(photo, mode)
        regions, full_views, tile_views = inference.plan_regions(mode)
        check(f"{mode} returns one result per planned region", len(out["regions"]) == len(regions),
              f"{len(out['regions'])}/{len(regions)}")
        check(f"{mode} reports a latency", out["inference_ms"] > 0, f"{out['inference_ms']:.0f} ms")

    # TTA is an average, so it must not swing the answer on a clean image.
    fast = predict(photo, "fast")
    deep = predict(photo, "deep")
    check("fast and deep agree on an unambiguous photo", fast["class_id"] == deep["class_id"],
          f"{fast['class_id']} vs {deep['class_id']}")

    tall = predict(leaf_photo(height=1400, width=500, lesions=[(250, 1100, 70)]))
    check("a non-square photo is handled", tall["class_id"] in CLASSES)
    small = predict(leaf_photo(height=120, width=160))
    check("a tiny photo is handled without crashing", small["class_id"] in CLASSES)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-model", action="store_true", help="skip checks that need model.onnx")
    args = parser.parse_args()

    test_quality_gate()
    test_lesion_measurement()
    test_analyse_matches_separate_calls()
    test_tta_views_are_exact()
    test_region_plans()
    test_aggregation_rule()
    test_calibration_loading()
    test_metrics_reproduce_the_recorded_run()
    test_temperature_scaling()
    test_threshold_search()
    test_summarise_shape()
    if not args.no_model:
        test_against_the_real_model()

    print("\n" + "=" * 70)
    if failed:
        print(f"{passed} passed, {len(failed)} FAILED")
        for item in failed:
            print(f"  - {item}")
        return 1
    print(f"{passed} passed, 0 failed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
