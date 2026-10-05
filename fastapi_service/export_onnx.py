"""Convert ``model.pt`` into the ``model.onnx`` the service actually serves.

Run this once, anywhere PyTorch works — the machine that trained the model, a
Linux box, a container. The API process never needs PyTorch afterwards.

    py export_onnx.py                       # model.pt  → model.onnx
    py export_onnx.py --checkpoint other.pt --output other.onnx

It writes a sidecar ``<output>.json`` holding the class order and the source
checkpoint's digest. ``main.py`` reads that sidecar and refuses to start if the
class order no longer matches the code, because a silent remap would hand every
farmer the wrong disease.

After exporting, it compares PyTorch and ONNX Runtime outputs on random inputs
and fails loudly if they diverge, so a bad conversion cannot reach the field.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import torch

from model import CLASSES, IMAGE_SIZE
from torch_arch import build_model

# Tolerance for the PyTorch↔ONNX comparison. Both run float32 on CPU, so the
# only expected difference is operator fusion ordering.
MAX_ABS_DIFF = 1e-4


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=Path, default=Path(__file__).with_name("model.pt"))
    parser.add_argument("--output", type=Path, default=Path(__file__).with_name("model.onnx"))
    parser.add_argument("--opset", type=int, default=17)
    args = parser.parse_args()

    if not args.checkpoint.exists():
        raise SystemExit(f"ไม่พบ checkpoint: {args.checkpoint}")

    checkpoint = torch.load(args.checkpoint, map_location="cpu", weights_only=True)
    if checkpoint.get("classes") != CLASSES:
        raise SystemExit(
            f"ลำดับคลาสใน checkpoint ไม่ตรงกับ model.py\n"
            f"  checkpoint: {checkpoint.get('classes')}\n"
            f"  code      : {CLASSES}"
        )

    architecture = checkpoint.get("architecture", "efficientnet_b0")

    # A checkpoint trained at 260 px exported into a 224 px graph still runs —
    # EfficientNet ends in an adaptive pool, so nothing raises — and quietly
    # shows the network every lesion at the wrong scale. That is the kind of
    # regression nobody finds without a labelled set, so it stops here.
    trained_size = checkpoint.get("image_size", IMAGE_SIZE)
    if trained_size != IMAGE_SIZE:
        raise SystemExit(
            f"checkpoint ฝึกที่ {trained_size}px แต่ model.py เสิร์ฟที่ {IMAGE_SIZE}px\n"
            f"  แก้ IMAGE_SIZE = {trained_size} ใน model.py แล้วรันใหม่\n"
            f"  (ถ้าปล่อยผ่าน โมเดลจะเห็นแผลผิดสเกลโดยไม่มี error ให้เห็น)"
        )

    model = build_model(architecture=architecture)
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()

    example = torch.randn(1, 3, IMAGE_SIZE, IMAGE_SIZE)
    torch.onnx.export(
        model,
        example,
        str(args.output),
        input_names=["input"],
        output_names=["logits"],
        # Batch stays dynamic so a future caller can score several photos at once.
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=args.opset,
        do_constant_folding=True,
    )
    # torch's exporter spills weights into a sibling <name>.data file. Fold
    # them back in: one file is one thing to copy, and one digest then covers
    # the weights too — a model_version that hashed only the graph would stay
    # identical after a weight swap.
    import onnx

    graph = onnx.load(str(args.output))
    onnx.save_model(graph, str(args.output), save_as_external_data=False)
    external = args.output.with_suffix(args.output.suffix + ".data")
    if external.exists():
        external.unlink()
    print(f"เขียน {args.output} ({args.output.stat().st_size / 1e6:.1f} MB, รวมน้ำหนักในไฟล์เดียว)")

    # ── Verify the file we are actually going to ship ──
    import onnxruntime as ort

    session = ort.InferenceSession(str(args.output), providers=["CPUExecutionProvider"])
    worst = 0.0
    for seed in range(5):
        rng = np.random.default_rng(seed)
        sample = rng.standard_normal((1, 3, IMAGE_SIZE, IMAGE_SIZE), dtype=np.float32)
        with torch.inference_mode():
            expected = model(torch.from_numpy(sample)).numpy()
        actual = session.run(["logits"], {"input": sample})[0]
        worst = max(worst, float(np.abs(expected - actual).max()))
        if not np.array_equal(expected.argmax(1), actual.argmax(1)):
            raise SystemExit(f"ONNX ทำนายคลาสไม่ตรงกับ PyTorch ที่ seed {seed} — ไม่ปล่อยไฟล์นี้")
    print(f"ตรวจเทียบ PyTorch ↔ ONNX: ผลต่างสูงสุด {worst:.2e}")
    if worst > MAX_ABS_DIFF:
        raise SystemExit(f"ผลต่างเกินเกณฑ์ {MAX_ABS_DIFF:.0e} — ไม่ปล่อยไฟล์นี้")

    sidecar = args.output.with_suffix(args.output.suffix + ".json")
    sidecar.write_text(
        json.dumps(
            {
                "classes": CLASSES,
                "architecture": architecture,
                "image_size": IMAGE_SIZE,
                "trained_image_size": trained_size,
                "opset": args.opset,
                "trained_epoch": checkpoint.get("epoch"),
                "source_checkpoint": args.checkpoint.name,
                "source_sha256": hashlib.sha256(args.checkpoint.read_bytes()).hexdigest(),
                "onnx_sha256": hashlib.sha256(args.output.read_bytes()).hexdigest(),
                "max_abs_diff_vs_torch": worst,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"เขียน {sidecar.name}")


if __name__ == "__main__":
    main()
