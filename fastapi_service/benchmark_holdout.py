"""Audit the served legacy4 route on the original model's held-out images.

This reconstructs the chronological per-class 15% test split in train.py.
It is an internal regression benchmark from the *same source dataset*, not an
independent farm-photo validation and not grounds to claim field accuracy.

Example:
  python benchmark_holdout.py --images D:/.../datasets/watermelon_real/Watermelon
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import onnxruntime as ort

import evaluation
import fit_calibration
import inference
from model import CLASSES


def held_out_rows(root: Path) -> list[tuple[Path, int]]:
    rows: list[tuple[Path, int]] = []
    for index, name in enumerate(CLASSES):
        folder = root / name
        if not folder.is_dir():
            raise ValueError(f"Missing class folder: {folder}")
        group = sorted(
            (p for p in folder.iterdir() if p.suffix.lower() in fit_calibration.IMAGE_SUFFIXES),
            key=lambda p: int("".join(c for c in p.stem if c.isdigit()) or 0),
        )
        if not group:
            raise ValueError(f"No images in {folder}")
        n_test = max(1, round(len(group) * 0.15))
        rows.extend((path, index) for path in group[-n_test:])
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--images", type=Path, required=True)
    parser.add_argument("--model", type=Path, default=Path(__file__).with_name("model.onnx"))
    parser.add_argument("--modes", nargs="+", choices=("raw", *inference.MODES),
                        default=["raw", "balanced", "deep"])
    args = parser.parse_args()

    rows = held_out_rows(args.images)
    print(f"Test images: {len(rows)}; source: {args.images}", flush=True)
    session = ort.InferenceSession(str(args.model), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    for mode in args.modes:
        logits, labels, abstained, seconds = fit_calibration.score_all(
            session, input_name, output_name, rows, mode, inference.UNFITTED_CALIBRATION,
        )
        report = evaluation.summarise(labels, evaluation.softmax_rows(logits))
        print(
            f"{mode}: accuracy={report['accuracy']:.4f} "
            f"macro_f1={report['macro_f1']:.4f} "
            f"false_healthy={report['false_healthy_count']}/{int(np.count_nonzero(labels != evaluation.HEALTHY_INDEX))} "
            f"abstained={int(abstained.sum())}/{len(rows)} "
            f"ms_per_image={1000 * seconds / len(rows):.0f}",
            flush=True,
        )


if __name__ == "__main__":
    main()
