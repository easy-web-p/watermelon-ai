"""PyTorch architectures — training and ONNX export only.

Nothing on the serving path imports this. Keeping torch out of the API process
means the service also runs on machines where Smart App Control blocks
PyTorch's DLLs.

Each entry knows three things the training loop needs and that differ between
families: where the classifier head lives, what input size the ImageNet
weights were trained at, and how to split parameters into backbone and head so
the head can be warmed up before the backbone is unfrozen.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import torch
from torchvision import models

from model import CLASSES


@dataclass(frozen=True)
class ArchSpec:
    """How to build one architecture and where its head is."""

    builder: Callable[..., torch.nn.Module]
    weights: Callable[[], object]
    #: Index into ``model.classifier`` of the final Linear layer.
    head_index: int
    #: Input resolution the pretrained weights expect. Training below it
    #: throws away pretrained detail; above it mostly costs time.
    image_size: int


# ``weights`` is a thunk rather than the enum itself so importing this module
# does not touch the torchvision download cache.
ARCHITECTURES: dict[str, ArchSpec] = {
    "mobilenet_v3_small": ArchSpec(
        models.mobilenet_v3_small, lambda: models.MobileNet_V3_Small_Weights.DEFAULT, 3, 224
    ),
    "mobilenet_v3_large": ArchSpec(
        models.mobilenet_v3_large, lambda: models.MobileNet_V3_Large_Weights.DEFAULT, 3, 224
    ),
    "efficientnet_b0": ArchSpec(
        models.efficientnet_b0, lambda: models.EfficientNet_B0_Weights.DEFAULT, 1, 224
    ),
    # b2 is the next step up that still runs on CPU at a sane speed, and its
    # native 260 px gives a small lesion ~35% more pixels than b0 does.
    "efficientnet_b2": ArchSpec(
        models.efficientnet_b2, lambda: models.EfficientNet_B2_Weights.DEFAULT, 1, 260
    ),
    "efficientnet_v2_s": ArchSpec(
        models.efficientnet_v2_s, lambda: models.EfficientNet_V2_S_Weights.DEFAULT, 1, 300
    ),
    "convnext_tiny": ArchSpec(
        models.convnext_tiny, lambda: models.ConvNeXt_Tiny_Weights.DEFAULT, 2, 224
    ),
}

SUPPORTED_ARCHITECTURES = tuple(ARCHITECTURES)

# Kept for the older call sites that imported this name.
DEFAULT_ARCHITECTURE = "efficientnet_b0"


def native_image_size(architecture: str) -> int:
    return _spec(architecture).image_size


def _spec(architecture: str) -> ArchSpec:
    try:
        return ARCHITECTURES[architecture]
    except KeyError:
        raise ValueError(
            f"Unsupported architecture: {architecture}. "
            f"Expected one of {', '.join(SUPPORTED_ARCHITECTURES)}"
        ) from None


def build_model(architecture: str = DEFAULT_ARCHITECTURE, pretrained: bool = False) -> torch.nn.Module:
    """Build the classifier with its head resized to ``len(CLASSES)``."""
    spec = _spec(architecture)
    model = spec.builder(weights=spec.weights() if pretrained else None)
    head = model.classifier[spec.head_index]
    model.classifier[spec.head_index] = torch.nn.Linear(head.in_features, len(CLASSES))
    return model


def split_parameters(
    model: torch.nn.Module, architecture: str
) -> tuple[list[torch.nn.Parameter], list[torch.nn.Parameter]]:
    """(backbone, head) parameter lists.

    A freshly initialised head produces large, meaningless gradients on the
    first few batches. Letting those flow into pretrained convolution weights
    at the same learning rate undoes ImageNet features that 800 leaf photos
    cannot rebuild, so ``train.py`` warms the head up first and then gives the
    backbone a lower rate.
    """
    _spec(architecture)  # validate the name even though the split is generic
    head_params = list(model.classifier.parameters())
    head_ids = {id(p) for p in head_params}
    backbone = [p for p in model.parameters() if id(p) not in head_ids]
    return backbone, head_params


def set_backbone_trainable(model: torch.nn.Module, architecture: str, trainable: bool) -> None:
    backbone, _ = split_parameters(model, architecture)
    for param in backbone:
        param.requires_grad = trainable
