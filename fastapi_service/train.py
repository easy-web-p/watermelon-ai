"""Train the leaf classifier.

Every option that is on by default exists to attack one measured number. From
the v2 run recorded in ``metrics.json``, on the held-out test set:

    19 of 142 diseased leaves were classified Healthy  (false-healthy rate 0.134)
    Healthy precision 0.62, macro-F1 0.898, accuracy 0.890

A farmer acts on "ใบปกติ" by doing nothing, so those 19 images are the whole
problem and plain macro-F1 does not see them. What this script does about it:

  --false-healthy-penalty   adds the model's own P(Healthy) on diseased
                            samples to the loss, so the gradient points away
                            from that specific mistake rather than away from
                            error in general
  --class-weight balanced   the dataset is uneven (57 downy vs 23
                            anthracnose); without this the loss is dominated
                            by whichever disease was photographed most
  --label-smoothing         stops the network driving its logits to infinity
                            on 809 images, which is where overconfidence on
                            unseen photos comes from
  --mixup-alpha             interpolated image/label pairs, the cheapest
                            regulariser that actually helps on a dataset this
                            small
  --freeze-epochs           warms the new head up before the ImageNet
                            backbone is allowed to move
  --ema-decay               keeps a running average of the weights; on a
                            noisy 25-batch epoch the average generalises
                            better than whichever step happened to land last
  best-epoch selection      by ``evaluation.selection_score`` (macro-F1 minus
                            2x the false-healthy rate), not macro-F1

After training it fits a temperature on the validation set, searches for the
cost-optimal confidence thresholds on the validation set, and evaluates the
test set both plainly and with test-time augmentation so the reported numbers
match how the service actually reads the model. The arithmetic for all of
that lives in ``evaluation.py``, which runs without torch and is covered by
``selfcheck.py``.

Example, reproducing the v2 recipe:

    py train.py --archive "archive (1).zip" --architecture efficientnet_b0 \\
        --strong-augment --false-healthy-penalty 0 --mixup-alpha 0 \\
        --freeze-epochs 0 --ema-decay 0 --label-smoothing 0

and the current default recipe:

    py train.py --archive "archive (1).zip"
"""

from __future__ import annotations

import argparse
import copy
import io
import json
import math
import random
import time
import zipfile
from collections import Counter
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image, ImageOps
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms

import evaluation
from evaluation import HEALTHY_INDEX
from model import CLASSES, IMAGE_SIZE, MEAN, STD
from torch_arch import (
    DEFAULT_ARCHITECTURE,
    SUPPORTED_ARCHITECTURES,
    build_model,
    native_image_size,
    set_backbone_trainable,
    split_parameters,
)

NORMALISE = transforms.Normalize(MEAN.tolist(), STD.tolist())

# The four flips the serving engine uses for test-time augmentation. Training
# with the same set is what makes TTA a variance reduction rather than a
# distribution shift — see the header of ``inference.py``.
TTA_FLIPS = (
    lambda t: t,
    lambda t: torch.flip(t, dims=[-1]),
    lambda t: torch.flip(t, dims=[-2]),
    lambda t: torch.flip(t, dims=[-2, -1]),
)


class LeafDataset(Dataset):
    def __init__(self, rows: list[tuple[Path, int]], training: bool, image_size: int, strong_augment: bool = True):
        self.rows = rows
        if not training:
            self.transform = transforms.Compose(
                [transforms.Resize((image_size, image_size)), transforms.ToTensor(), NORMALISE]
            )
            return

        if strong_augment:
            aug = [
                transforms.RandomResizedCrop(image_size, scale=(0.7, 1.0), ratio=(0.85, 1.15)),
                transforms.RandomHorizontalFlip(),
                transforms.RandomVerticalFlip(),
                transforms.RandomRotation(20),
                transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.25, hue=0.02),
                transforms.RandomPerspective(distortion_scale=0.15, p=0.3),
                # Phone photos of a leaf in a field are often slightly soft.
                # Training on only sharp images is why a hand-held photo
                # scores worse than the test set suggests.
                transforms.RandomApply([transforms.GaussianBlur(5, sigma=(0.1, 1.6))], p=0.25),
            ]
        else:
            aug = [
                transforms.Resize((image_size, image_size)),
                transforms.RandomHorizontalFlip(),
                transforms.RandomVerticalFlip(),
                transforms.RandomRotation(15),
                transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
            ]
        self.transform = transforms.Compose([*aug, transforms.ToTensor(), NORMALISE])

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, index):
        path, label = self.rows[index]
        with Image.open(path) as im:
            image = im.convert("RGB")
        return self.transform(image), label


def prepare_originals(archive: Path, cache_dir: Path) -> list[tuple[Path, int]]:
    cache_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    with zipfile.ZipFile(archive) as zf:
        members = [
            m
            for m in zf.infolist()
            if "/Original Image/Watermelon/" in m.filename
            and m.filename.lower().endswith((".jpg", ".jpeg", ".png"))
        ]
        for i, member in enumerate(members, 1):
            parts = member.filename.split("/")
            label = parts[-2]
            if label not in CLASSES:
                continue
            dest = cache_dir / label / (Path(parts[-1]).stem + ".jpg")
            dest.parent.mkdir(parents=True, exist_ok=True)
            if not dest.exists():
                try:
                    with Image.open(io.BytesIO(zf.read(member))) as im:
                        rgb = ImageOps.exif_transpose(im).convert("RGB")
                        # 640 rather than 512: RandomResizedCrop at scale 0.7
                        # on a 260 px model needs more source pixels than the
                        # old cache kept, and re-upsampling a 512 px cache
                        # would feed the network detail that is not there.
                        rgb.thumbnail((640, 640))
                        rgb.save(dest, "JPEG", quality=92)
                except Exception as exc:
                    print(f"Skipping corrupt image {member.filename}: {exc}", flush=True)
                    continue
            rows.append((dest, CLASSES.index(label)))
            if i % 200 == 0:
                print(f"Prepared {i}/{len(members)} original images", flush=True)
    return rows


def split_rows(rows: list[tuple[Path, int]], seed: int):
    # File numbers follow capture order. Keep adjacent captures in the same split.
    # A random image split gives an optimistic score when the same leaf was photographed repeatedly.
    groups = {i: [] for i in range(len(CLASSES))}
    for row in rows:
        groups[row[1]].append(row)
    train, val, test = [], [], []
    for group in groups.values():
        group.sort(key=lambda row: int("".join(c for c in row[0].stem if c.isdigit()) or 0))
        n_test = max(1, round(len(group) * 0.15))
        n_val = max(1, round(len(group) * 0.15))
        train.extend(group[: -(n_test + n_val)])
        val.extend(group[-(n_test + n_val) : -n_test])
        test.extend(group[-n_test:])
    return train, val, test


class FalseHealthyPenaltyLoss(torch.nn.Module):
    """Cross-entropy plus an explicit penalty on calling a diseased leaf healthy.

    Cross-entropy already punishes a wrong answer, but it punishes
    "anthracnose mistaken for downy mildew" and "anthracnose mistaken for
    healthy" by the same amount when the predicted probability is the same.
    On a farm those are not the same mistake: the first sends the farmer to
    spray the wrong fungicide, the second sends them home.

    The extra term is the mean P(Healthy) the model assigns to samples that
    are *not* healthy. It is zero for a model that never does this, so it adds
    nothing to a well-behaved run, and its gradient points specifically away
    from the failure in ``metrics.json``.
    """

    def __init__(self, weight: torch.Tensor | None, label_smoothing: float, penalty: float):
        super().__init__()
        self.register_buffer("weight", weight if weight is not None else torch.empty(0))
        self.label_smoothing = label_smoothing
        self.penalty = penalty

    def _weight(self) -> torch.Tensor | None:
        return self.weight if self.weight.numel() else None

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        loss = F.cross_entropy(
            logits, targets, weight=self._weight(), label_smoothing=self.label_smoothing
        )
        if self.penalty <= 0:
            return loss
        diseased = targets != HEALTHY_INDEX
        if not bool(diseased.any()):
            return loss
        p_healthy = logits.softmax(dim=1)[diseased, HEALTHY_INDEX]
        return loss + self.penalty * p_healthy.mean()


class WeightAverage:
    """Exponential moving average of the weights.

    With ~25 batches per epoch the last step of an epoch is a noisy sample of
    where the optimiser is heading. The average of recent steps consistently
    generalises better, and costs one extra copy of the model in memory.
    """

    def __init__(self, model: torch.nn.Module, decay: float):
        self.decay = decay
        self.shadow = copy.deepcopy(model).eval()
        for param in self.shadow.parameters():
            param.requires_grad_(False)

    @torch.no_grad()
    def update(self, model: torch.nn.Module) -> None:
        for shadow, live in zip(self.shadow.state_dict().values(), model.state_dict().values()):
            if shadow.dtype.is_floating_point:
                shadow.mul_(self.decay).add_(live.detach(), alpha=1.0 - self.decay)
            else:
                shadow.copy_(live)


def mixup(images: torch.Tensor, alpha: float) -> tuple[torch.Tensor, torch.Tensor, float]:
    """Blend the batch with a shuffled copy of itself.

    Returns the blended images, the permutation used, and lambda, so the
    caller can mix the *loss* of two hard targets rather than building a soft
    target. That composes with ``FalseHealthyPenaltyLoss``, which needs to
    know which samples are genuinely diseased.
    """
    lam = float(np.random.beta(alpha, alpha))
    # Keep the dominant image dominant; otherwise lam and 1-lam are the same
    # distribution and the penalty term sees both orderings equally.
    lam = max(lam, 1.0 - lam)
    index = torch.randperm(images.size(0), device=images.device)
    return lam * images + (1.0 - lam) * images[index], index, lam


@torch.no_grad()
def collect_logits(model, loader, device, tta: bool = False) -> tuple[np.ndarray, np.ndarray]:
    """(logits, labels) over a loader, optionally averaged across the flips.

    Averaging logits rather than probabilities, to match ``inference.run``.
    """
    model.eval()
    all_logits, all_labels = [], []
    for images, labels in loader:
        images = images.to(device)
        if tta:
            stacked = torch.stack([model(flip(images)) for flip in TTA_FLIPS])
            logits = stacked.mean(dim=0)
        else:
            logits = model(images)
        all_logits.append(logits.float().cpu().numpy())
        all_labels.append(labels.numpy())
    return np.concatenate(all_logits), np.concatenate(all_labels)


def evaluate(model, loader, device, tta: bool = False, temperature: float = 1.0) -> dict:
    logits, labels = collect_logits(model, loader, device, tta=tta)
    report = evaluation.summarise(labels, evaluation.softmax_rows(logits / temperature))
    report["tta"] = tta
    report["temperature"] = temperature
    return report


def class_weights(rows: list[tuple[Path, int]], mode: str, device) -> torch.Tensor | None:
    if mode == "none":
        return None
    counts = Counter(label for _, label in rows)
    total = sum(counts.values())
    # Inverse frequency, normalised to mean 1 so the loss scale — and
    # therefore a comparable learning rate — does not move with the mix.
    raw = np.array([total / (len(CLASSES) * max(1, counts.get(i, 0))) for i in range(len(CLASSES))])
    return torch.tensor(raw / raw.mean(), dtype=torch.float32, device=device)


def build_scheduler(optimizer, epochs: int, steps_per_epoch: int, warmup_epochs: float):
    """Linear warmup into a cosine decay, stepped per batch.

    Warmup matters here because the head starts random: a full learning rate
    on step one moves the pretrained backbone a long way in a direction
    decided by noise.
    """
    total = max(1, epochs * steps_per_epoch)
    warmup = max(1, int(warmup_epochs * steps_per_epoch))

    def factor(step: int) -> float:
        if step < warmup:
            return (step + 1) / warmup
        progress = (step - warmup) / max(1, total - warmup)
        return 0.5 * (1.0 + math.cos(math.pi * min(1.0, progress)))

    return torch.optim.lr_scheduler.LambdaLR(optimizer, factor)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--cache-dir", type=Path, default=Path("data/leaf-cache"))
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--architecture", choices=SUPPORTED_ARCHITECTURES, default=DEFAULT_ARCHITECTURE)
    parser.add_argument(
        "--image-size",
        type=int,
        default=0,
        help="0 = the architecture's native size. Must equal IMAGE_SIZE in model.py to be servable.",
    )
    parser.add_argument("--lr", type=float, default=3e-4, help="peak learning rate for the head")
    parser.add_argument(
        "--backbone-lr-scale",
        type=float,
        default=0.1,
        help="backbone learning rate as a fraction of --lr",
    )
    parser.add_argument("--weight-decay", type=float, default=0.02)
    parser.add_argument("--warmup-epochs", type=float, default=1.0)
    parser.add_argument("--freeze-epochs", type=int, default=2, help="epochs with the backbone frozen")
    parser.add_argument("--label-smoothing", type=float, default=0.05)
    parser.add_argument("--class-weight", choices=["balanced", "none"], default="balanced")
    parser.add_argument(
        "--false-healthy-penalty",
        type=float,
        default=0.5,
        help="weight on mean P(Healthy) over diseased samples. 0 disables it.",
    )
    parser.add_argument("--mixup-alpha", type=float, default=0.2, help="0 disables mixup")
    parser.add_argument("--ema-decay", type=float, default=0.995, help="0 disables weight averaging")
    parser.add_argument("--patience", type=int, default=8)
    parser.add_argument("--no-strong-augment", dest="strong_augment", action="store_false")
    parser.add_argument(
        "--strong-augment",
        dest="strong_augment",
        action="store_true",
        help="on by default; --no-strong-augment restores the v2 light recipe",
    )
    parser.set_defaults(strong_augment=True)
    args = parser.parse_args()

    image_size = args.image_size or native_image_size(args.architecture)
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    torch.set_num_threads(min(8, torch.get_num_threads()))
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device} | arch: {args.architecture} | input: {image_size}px", flush=True)
    if image_size != IMAGE_SIZE:
        # Not fatal — a size sweep is a legitimate experiment — but the result
        # cannot be served until model.py agrees, and finding that out after
        # an hour of training is worse than reading it now.
        print(
            f"NOTE: model.py serves at {IMAGE_SIZE}px. To deploy this run, set "
            f"IMAGE_SIZE = {image_size} in model.py before export_onnx.py.",
            flush=True,
        )

    rows = prepare_originals(args.archive, args.cache_dir)
    if not rows:
        raise SystemExit(f"ไม่พบภาพใน {args.archive} ที่ตรงกับคลาส {CLASSES}")
    train, val, test = split_rows(rows, args.seed)
    print(
        "Split:",
        {k: dict(Counter(label for _, label in x)) for k, x in [("train", train), ("val", val), ("test", test)]},
        flush=True,
    )

    pin = device.type == "cuda"
    loaders = {
        "train": DataLoader(
            LeafDataset(train, True, image_size, args.strong_augment),
            batch_size=args.batch_size,
            shuffle=True,
            drop_last=len(train) > args.batch_size,
            num_workers=0,
            pin_memory=pin,
        ),
        "val": DataLoader(LeafDataset(val, False, image_size), batch_size=args.batch_size, num_workers=0, pin_memory=pin),
        "test": DataLoader(LeafDataset(test, False, image_size), batch_size=args.batch_size, num_workers=0, pin_memory=pin),
    }

    model = build_model(architecture=args.architecture, pretrained=True).to(device)
    backbone, head = split_parameters(model, args.architecture)
    optimizer = torch.optim.AdamW(
        [
            {"params": head, "lr": args.lr},
            {"params": backbone, "lr": args.lr * args.backbone_lr_scale},
        ],
        weight_decay=args.weight_decay,
    )
    scheduler = build_scheduler(optimizer, args.epochs, max(1, len(loaders["train"])), args.warmup_epochs)
    criterion = FalseHealthyPenaltyLoss(
        class_weights(train, args.class_weight, device), args.label_smoothing, args.false_healthy_penalty
    ).to(device)
    averager = WeightAverage(model, args.ema_decay) if args.ema_decay > 0 else None

    checkpoint = Path(__file__).parent / "model.pt"
    best_score = -math.inf
    best_epoch = 0
    history = []
    start = time.time()

    for epoch in range(1, args.epochs + 1):
        frozen = epoch <= args.freeze_epochs
        set_backbone_trainable(model, args.architecture, not frozen)
        model.train()
        loss_sum = 0.0
        seen = 0
        for images, labels in loaders["train"]:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad(set_to_none=True)
            if args.mixup_alpha > 0 and images.size(0) > 1:
                mixed, index, lam = mixup(images, args.mixup_alpha)
                logits = model(mixed)
                loss = lam * criterion(logits, labels) + (1.0 - lam) * criterion(logits, labels[index])
            else:
                loss = criterion(model(images), labels)
            loss.backward()
            # 800 images and a fresh head produce occasional huge gradients;
            # one of those can undo an epoch of progress.
            torch.nn.utils.clip_grad_norm_(model.parameters(), 5.0)
            optimizer.step()
            scheduler.step()
            if averager is not None:
                averager.update(model)
            loss_sum += loss.item() * labels.size(0)
            seen += labels.size(0)

        # Selection always looks at the weights that would actually be saved.
        candidate = averager.shadow if averager is not None else model
        metrics = evaluate(candidate, loaders["val"], device)
        score = metrics["selection_score"]
        history.append(
            {
                "epoch": epoch,
                "frozen_backbone": frozen,
                "train_loss": round(loss_sum / max(1, seen), 4),
                "val_accuracy": round(metrics["accuracy"], 4),
                "val_macro_f1": round(metrics["macro_f1"], 4),
                "val_false_healthy_rate": round(metrics["false_healthy_rate"], 4),
                "val_selection_score": round(score, 4),
            }
        )
        print(
            f"Epoch {epoch:3d}{' (frozen)' if frozen else ''}: "
            f"train_loss={loss_sum / max(1, seen):.4f} "
            f"val_acc={metrics['accuracy']:.4f} val_macro_f1={metrics['macro_f1']:.4f} "
            f"false_healthy={metrics['false_healthy_rate']:.4f} score={score:.4f}",
            flush=True,
        )

        if score > best_score:
            best_score, best_epoch = score, epoch
            torch.save(
                {
                    "state_dict": candidate.state_dict(),
                    "classes": CLASSES,
                    "image_size": image_size,
                    "epoch": epoch,
                    "architecture": args.architecture,
                    "ema": averager is not None,
                },
                checkpoint,
            )
        if epoch - best_epoch >= args.patience:
            print(f"Early stopping: {args.patience} epochs without improvement", flush=True)
            break

    # -- Final measurement, on the weights that were saved -------------------
    saved = torch.load(checkpoint, map_location=device, weights_only=True)
    final = build_model(architecture=args.architecture).to(device)
    final.load_state_dict(saved["state_dict"])

    # Temperature and thresholds are fitted on validation and then *applied*
    # to test. Fitting either on the test set and reporting that set's score
    # is how a number stops predicting anything about a real field.
    val_logits, val_labels = collect_logits(final, loaders["val"], device, tta=True)
    temperature = evaluation.fit_temperature(val_logits, val_labels)
    thresholds = evaluation.search_thresholds(
        val_labels, evaluation.softmax_rows(val_logits / temperature)
    )

    report = {
        "dataset": args.archive.name,
        "source": "Original Image only",
        "seed": args.seed,
        "split_method": "class-stratified chronological image-number split",
        "architecture": args.architecture,
        "image_size": image_size,
        "strong_augment": args.strong_augment,
        "recipe": {
            "epochs_requested": args.epochs,
            "batch_size": args.batch_size,
            "lr": args.lr,
            "backbone_lr_scale": args.backbone_lr_scale,
            "weight_decay": args.weight_decay,
            "warmup_epochs": args.warmup_epochs,
            "freeze_epochs": args.freeze_epochs,
            "label_smoothing": args.label_smoothing,
            "class_weight": args.class_weight,
            "false_healthy_penalty": args.false_healthy_penalty,
            "mixup_alpha": args.mixup_alpha,
            "ema_decay": args.ema_decay,
            "selection_metric": f"macro_f1 - {evaluation.FALSE_HEALTHY_WEIGHT} * false_healthy_rate",
        },
        "split_counts": {"train": len(train), "validation": len(val), "test": len(test)},
        "classes": CLASSES,
        "best_epoch": best_epoch,
        "training_seconds": round(time.time() - start, 1),
        "history": history,
        "calibration": {
            "temperature": round(temperature, 6),
            "fitted_on": "validation (with TTA)",
            "method": "temperature scaling (Guo et al. 2017), golden-section on NLL",
        },
        "thresholds": thresholds,
        # Four readings of the same weights. The pair the service actually
        # serves is test_tta; the others are there so the effect of TTA and of
        # calibration is visible rather than asserted.
        "validation": evaluate(final, loaders["val"], device),
        "validation_tta": evaluate(final, loaders["val"], device, tta=True, temperature=temperature),
        "test": evaluate(final, loaders["test"], device),
        "test_tta": evaluate(final, loaders["test"], device, tta=True, temperature=temperature),
    }
    (Path(__file__).parent / "metrics.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # The sidecar the service reads. Written only now, from validation data,
    # so a half-finished run cannot leave a calibration file behind that
    # claims to be fitted.
    (Path(__file__).parent / "calibration.json").write_text(
        json.dumps(
            {
                "temperature": round(temperature, 6),
                "fitted_on": "validation (with TTA)",
                "architecture": args.architecture,
                "epoch": best_epoch,
                "suggested_healthy_threshold": thresholds["best"]["healthy_threshold"],
                "suggested_disease_threshold": thresholds["best"]["disease_threshold"],
                "note": (
                    "suggested_* เป็นค่าที่ค้นหาจากชุด validation — ต้องนำไปตั้งใน "
                    "src/lib/diseaseModel.ts ด้วยมือ และควรทบทวนกับทีมเกษตรก่อนใช้"
                ),
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    plain, tta = report["test"], report["test_tta"]
    print("\n=== TEST (single view, uncalibrated) ===", flush=True)
    print(
        f"  accuracy={plain['accuracy']:.4f} macro_f1={plain['macro_f1']:.4f} "
        f"false_healthy={plain['false_healthy_rate']:.4f} ({plain['false_healthy_count']} images) "
        f"ECE={plain['expected_calibration_error']:.4f}",
        flush=True,
    )
    print("=== TEST (TTA + temperature, what the service serves) ===", flush=True)
    print(
        f"  accuracy={tta['accuracy']:.4f} macro_f1={tta['macro_f1']:.4f} "
        f"false_healthy={tta['false_healthy_rate']:.4f} ({tta['false_healthy_count']} images) "
        f"ECE={tta['expected_calibration_error']:.4f}",
        flush=True,
    )
    print(
        f"\nNext: py export_onnx.py && py fit_calibration.py --images {args.cache_dir}\n"
        f"Then copy the four test_tta per-class numbers into MODEL_METRICS in "
        f"src/lib/diseaseModel.ts — the app reads them from there, not from this file.",
        flush=True,
    )


if __name__ == "__main__":
    main()
