"""Measure the serving engine on labelled photos, and fit its temperature.

``train.py`` measures the *checkpoint*. This measures what the service
actually does with it — multi-scale crops, test-time augmentation, the
aggregation rule and the quality gate — because those are what a farmer's
photo passes through, and none of them existed when ``metrics.json`` was
written.

It answers four questions, in this order of importance:

  1. Does the engine lower the false-healthy rate? That is the number v2 lost
     19 diseased leaves to, and the reason every mechanism in
     ``inference.py`` exists. The report prints it for the raw checkpoint and
     for each mode, side by side, on the same images.
  2. What temperature calibrates the engine's confidence? Written to
     ``calibration.json``, which the service then loads.
  3. What confidence thresholds minimise expected cost? Reported as a
     suggestion for ``src/lib/diseaseModel.ts``, never applied automatically:
     those two numbers change what a farmer is told to spray.
  4. How many real photos does the quality gate reject? A gate that refuses a
     tenth of a genuine dataset is miscalibrated, and this is the only way to
     find out before the field does.

Usage — the directory holds one subfolder per class, which is exactly the
layout ``train.py --cache-dir`` leaves behind:

    py fit_calibration.py --images data/leaf-cache
    py fit_calibration.py --images data/leaf-cache --modes raw balanced deep --write

Nothing is written without ``--write``. A calibration file that claims to be
fitted is a promise to every caller of ``/health``, so producing one is an
explicit act.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

import evaluation
import inference
import leafcheck
from model import CLASSES, preprocess, softmax

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
ALL_MODES = ("raw", *inference.MODES)


def find_images(root: Path) -> list[tuple[Path, int]]:
    """(path, label) for every image under a class-named subfolder."""
    rows: list[tuple[Path, int]] = []
    for index, name in enumerate(CLASSES):
        folder = root / name
        if not folder.is_dir():
            raise SystemExit(
                f"ไม่พบโฟลเดอร์ {folder} — โครงสร้างต้องเป็น {root}/<ชื่อคลาส>/*.jpg "
                f"โดยชื่อคลาสคือ {', '.join(CLASSES)}"
            )
        for path in sorted(folder.iterdir()):
            if path.suffix.lower() in IMAGE_SUFFIXES:
                rows.append((path, index))
    if not rows:
        raise SystemExit(f"ไม่พบไฟล์ภาพใน {root}")
    return rows


def split_for_fitting(rows: list[tuple[Path, int]], fraction: float, seed: int):
    """Class-stratified split into (fit, held_out).

    Temperature is fitted on one half and reported on the other. A temperature
    fitted and evaluated on the same images always looks perfectly calibrated,
    which is the one result that would be worth nothing.
    """
    rng = np.random.default_rng(seed)
    fit: list[tuple[Path, int]] = []
    held: list[tuple[Path, int]] = []
    for index in range(len(CLASSES)):
        group = [row for row in rows if row[1] == index]
        order = rng.permutation(len(group))
        cut = max(1, round(len(group) * fraction)) if len(group) > 1 else len(group)
        for position, item in enumerate(order):
            (fit if position < cut else held).append(group[item])
    return fit, held


def load(path: Path) -> Image.Image:
    with Image.open(path) as im:
        return ImageOps.exif_transpose(im).convert("RGB")


def score_all(session, input_name, output_name, rows, mode, calibration):
    """(logits, labels, abstained, seconds) for one mode over every image.

    Logits rather than probabilities, so a temperature can be fitted
    afterwards without re-running the model. For the engine modes the
    "logits" are the log of the aggregated probabilities, which is the same
    thing up to the constant that softmax removes.
    """
    logits, labels, abstained = [], [], []
    started = time.perf_counter()
    for position, (path, label) in enumerate(rows, 1):
        image = load(path)
        if mode == "raw":
            raw = session.run([output_name], {input_name: preprocess(image)})[0][0]
            logits.append(raw)
            abstained.append(False)
        else:
            result = inference.run(
                session, input_name, output_name, image,
                mode=mode, calibration=calibration, model_version="fit",
            )
            probs = np.array([result["scores"][c] for c in CLASSES], dtype=np.float64)
            logits.append(np.log(np.clip(probs, 1e-12, 1.0)))
            abstained.append(bool(result["abstain"]))
        labels.append(label)
        if position % 100 == 0:
            print(f"  {mode}: {position}/{len(rows)}", flush=True)
    return (
        np.array(logits, dtype=np.float64),
        np.array(labels),
        np.array(abstained),
        time.perf_counter() - started,
    )


def quality_audit(rows: list[tuple[Path, int]]) -> dict:
    """What the quality gate does to a known-good dataset.

    Every image here is a real leaf that a researcher labelled, so every
    rejection is a false rejection. Counted per class and per reason, because
    a gate that rejects 1% is tuned and one that rejects 15% is broken.
    """
    verdicts = {name: {"usable": 0, "marginal": 0, "unusable": 0} for name in CLASSES}
    reasons: dict[str, int] = {}
    for path, label in rows:
        quality = leafcheck.assess_quality(load(path))
        verdicts[CLASSES[label]][quality.verdict] += 1
        if quality.verdict == "unusable":
            for reason in quality.reasons:
                # Group by the leading phrase; the numbers inside differ per image.
                key = reason.split("(")[0].strip()
                reasons[key] = reasons.get(key, 0) + 1
    total = len(rows)
    rejected = sum(v["unusable"] for v in verdicts.values())
    return {
        "images": total,
        "rejected": rejected,
        "rejected_fraction": round(rejected / max(1, total), 4),
        "per_class": verdicts,
        "rejection_reasons": dict(sorted(reasons.items(), key=lambda kv: -kv[1])),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--images", type=Path, required=True, help="directory with one subfolder per class")
    parser.add_argument("--model", type=Path, default=Path(__file__).with_name("model.onnx"))
    parser.add_argument("--modes", nargs="+", default=list(ALL_MODES), choices=list(ALL_MODES))
    parser.add_argument("--fit-fraction", type=float, default=0.5)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--write", action="store_true", help="write calibration.json and engine_report.json")
    parser.add_argument("--report", type=Path, default=Path(__file__).with_name("engine_report.json"))
    args = parser.parse_args()

    if not args.model.exists():
        raise SystemExit(f"ไม่พบโมเดล {args.model}")
    if not 0.1 <= args.fit_fraction <= 0.9:
        raise SystemExit("--fit-fraction ต้องอยู่ระหว่าง 0.1 ถึง 0.9")

    rows = find_images(args.images)
    fit_rows, held_rows = split_for_fitting(rows, args.fit_fraction, args.seed)
    print(f"พบ {len(rows)} ภาพ — ปรับเทียบด้วย {len(fit_rows)} ภาพ รายงานผลบน {len(held_rows)} ภาพ\n", flush=True)

    session = ort.InferenceSession(str(args.model), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name

    print("ตรวจคุณภาพภาพทั้งชุด (ทุกภาพในชุดนี้เป็นใบจริง การถูกปฏิเสธคือ false rejection)", flush=True)
    audit = quality_audit(rows)
    print(
        f"  ปฏิเสธ {audit['rejected']}/{audit['images']} ภาพ ({audit['rejected_fraction'] * 100:.1f}%)",
        flush=True,
    )
    for reason, count in audit["rejection_reasons"].items():
        print(f"    {count:4d}  {reason}", flush=True)
    if audit["rejected_fraction"] > 0.05:
        print(
            "  คำเตือน: ปฏิเสธเกิน 5% ของชุดข้อมูลจริง ให้ทบทวนเกณฑ์ใน leafcheck.py "
            "ก่อนนำไปใช้ ไม่ใช่ยอมรับตัวเลขนี้",
            flush=True,
        )

    results: dict[str, dict] = {}
    for mode in args.modes:
        print(f"\nรัน mode={mode}", flush=True)
        fit_logits, fit_labels, _, _ = score_all(
            session, input_name, output_name, fit_rows, mode, inference.UNFITTED_CALIBRATION
        )
        held_logits, held_labels, held_abstain, seconds = score_all(
            session, input_name, output_name, held_rows, mode, inference.UNFITTED_CALIBRATION
        )

        temperature = evaluation.fit_temperature(fit_logits, fit_labels)
        boundary = evaluation.temperature_hit_boundary(temperature)
        if boundary:
            print(f"  คำเตือน: {boundary}", flush=True)
        uncalibrated = evaluation.summarise(held_labels, evaluation.softmax_rows(held_logits))
        calibrated = evaluation.summarise(held_labels, evaluation.softmax_rows(held_logits / temperature))
        thresholds = evaluation.search_thresholds(
            fit_labels, evaluation.softmax_rows(fit_logits / temperature)
        )

        results[mode] = {
            "temperature": round(temperature, 6),
            "temperature_warning": boundary,
            "ms_per_image": round(seconds / max(1, len(held_rows)) * 1000, 1),
            "held_out_images": int(len(held_labels)),
            "abstained": int(held_abstain.sum()),
            "uncalibrated": uncalibrated,
            "calibrated": calibrated,
            "thresholds_from_fit_split": thresholds,
        }
        print(
            f"  accuracy={calibrated['accuracy']:.4f} macro_f1={calibrated['macro_f1']:.4f} "
            f"false_healthy={calibrated['false_healthy_rate']:.4f} "
            f"({calibrated['false_healthy_count']} ภาพ) "
            f"ECE {uncalibrated['expected_calibration_error']:.4f} -> "
            f"{calibrated['expected_calibration_error']:.4f}  T={temperature:.3f}  "
            f"{results[mode]['ms_per_image']:.0f} ms/ภาพ",
            flush=True,
        )

    # -- The comparison this script exists for -------------------------------
    print("\n" + "=" * 78, flush=True)
    print("เทียบผลบนชุด held-out เดียวกัน (ตัวเลขที่สำคัญที่สุดคือ false_healthy)", flush=True)
    print(f"{'mode':10} {'accuracy':>9} {'macro_f1':>9} {'false_healthy':>14} {'ECE':>7} {'abstain':>8} {'ms/img':>8}", flush=True)
    for mode, data in results.items():
        c = data["calibrated"]
        print(
            f"{mode:10} {c['accuracy']:9.4f} {c['macro_f1']:9.4f} "
            f"{c['false_healthy_rate']:9.4f} ({c['false_healthy_count']:3d}) "
            f"{c['expected_calibration_error']:7.4f} {data['abstained']:8d} {data['ms_per_image']:8.0f}",
            flush=True,
        )

    if "raw" in results and len(results) > 1:
        baseline = results["raw"]["calibrated"]["false_healthy_rate"]
        print("", flush=True)
        for mode, data in results.items():
            if mode == "raw":
                continue
            rate = data["calibrated"]["false_healthy_rate"]
            if baseline > 0:
                change = (rate - baseline) / baseline * 100
                verdict = "ดีขึ้น" if rate < baseline else ("แย่ลง" if rate > baseline else "เท่าเดิม")
                print(f"  {mode}: false_healthy {baseline:.4f} -> {rate:.4f} ({change:+.1f}%) {verdict}", flush=True)
            else:
                print(f"  {mode}: false_healthy {baseline:.4f} -> {rate:.4f}", flush=True)

    report = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "images_root": str(args.images),
        "model": args.model.name,
        "engine_version": inference.ENGINE_VERSION,
        "split": {"fit": len(fit_rows), "held_out": len(held_rows), "seed": args.seed},
        "quality_gate_audit": audit,
        "modes": results,
    }

    if not args.write:
        print(
            "\n(ยังไม่เขียนไฟล์ — เพิ่ม --write เพื่อบันทึก calibration.json และ engine_report.json)",
            flush=True,
        )
        return

    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nเขียน {args.report.name}", flush=True)

    # The service runs one mode, so only that mode's temperature belongs in
    # the file it reads. Defaults to the engine default rather than to
    # whichever mode scored best, because serving a temperature fitted for
    # "deep" while running "balanced" is a quiet miscalibration.
    serving_mode = inference.DEFAULT_MODE if inference.DEFAULT_MODE in results else next(
        m for m in results if m != "raw"
    )
    chosen = results[serving_mode]
    if chosen["temperature_warning"]:
        # The report is still written — it is the evidence of the problem —
        # but the file the service trusts is not. A calibration.json makes
        # /health report `fitted: true`, and that must not be true of a
        # temperature that ran to the end of its search range.
        raise SystemExit(
            f"\nไม่เขียน calibration.json: {chosen['temperature_warning']}\n"
            f"(engine_report.json เขียนแล้ว ใช้ดูรายละเอียดได้)"
        )
    (args.model.with_name("calibration.json")).write_text(
        json.dumps(
            {
                "temperature": chosen["temperature"],
                "fitted_on": f"{len(fit_rows)} ภาพจาก {args.images.name} (mode={serving_mode})",
                "engine_version": inference.ENGINE_VERSION,
                "mode": serving_mode,
                "held_out_accuracy": round(chosen["calibrated"]["accuracy"], 6),
                "held_out_false_healthy_rate": round(chosen["calibrated"]["false_healthy_rate"], 6),
                "expected_calibration_error": round(
                    chosen["calibrated"]["expected_calibration_error"], 6
                ),
                "suggested_healthy_threshold": chosen["thresholds_from_fit_split"]["best"]["healthy_threshold"],
                "suggested_disease_threshold": chosen["thresholds_from_fit_split"]["best"]["disease_threshold"],
                "note": (
                    "suggested_* ยังไม่มีผลกับแอป ต้องแก้ MIN_HEALTHY_CONFIDENCE และ "
                    "MIN_DISEASE_CONFIDENCE ใน src/lib/diseaseModel.ts ด้วยมือ "
                    "และควรทบทวนกับทีมเกษตรก่อน เพราะสองค่านี้กำหนดว่าจะบอกเกษตรกรให้พ่นสารหรือไม่"
                ),
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f"เขียน calibration.json (mode={serving_mode}, T={chosen['temperature']:.4f})", flush=True)
    print(
        "\nขั้นถัดไป: รีสตาร์ตเซอร์วิสแล้วเช็ก /health ว่า calibration.fitted เป็น true "
        "และอัปเดต MODEL_METRICS ใน src/lib/diseaseModel.ts จากตัวเลข held-out ด้านบน",
        flush=True,
    )


if __name__ == "__main__":
    main()
