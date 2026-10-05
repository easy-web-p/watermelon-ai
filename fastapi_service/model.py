"""Class list and preprocessing for the watermelon leaf classifier.

Deliberately free of PyTorch: this module is on the serving path, and the
service runs inference through ONNX Runtime. Smart App Control is enforced on
some Windows machines and blocks PyTorch's unsigned DLLs, while ONNX Runtime
loads fine — see README.md.

The PyTorch architecture lives in ``torch_arch.py`` and is needed only for
training (``train.py``) and for the one-off ONNX export (``export_onnx.py``).

``CLASSES`` is the label order the network was trained with, so reordering it
silently remaps every prediction. The service checks it against the order
recorded beside the exported model and refuses to start if they disagree.
"""

from __future__ import annotations

import numpy as np
from PIL import Image

CLASSES = ["Anthracnose", "Downy_Mildew", "Healthy", "Mosaic_Virus"]

IMAGE_SIZE = 224

# ImageNet statistics, because the backbone started from ImageNet weights.
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def preprocess(image: Image.Image) -> np.ndarray:
    """PIL image → NCHW float32 batch of 1.

    Mirrors the eval transform used in training:
    ``Resize((224, 224))`` → ``ToTensor()`` → ``Normalize(MEAN, STD)``.
    Pillow's bilinear resize is the same filter torchvision applies to a PIL
    input, so the exported model sees what it was validated on.
    """
    resized = image.convert("RGB").resize((IMAGE_SIZE, IMAGE_SIZE), Image.BILINEAR)
    array = np.asarray(resized, dtype=np.float32) / 255.0  # HWC in [0, 1]
    array = (array - MEAN) / STD
    return np.ascontiguousarray(array.transpose(2, 0, 1)[np.newaxis], dtype=np.float32)


def softmax(logits: np.ndarray) -> np.ndarray:
    """Numerically stable softmax over the last axis."""
    shifted = logits - np.max(logits, axis=-1, keepdims=True)
    exp = np.exp(shifted)
    return exp / np.sum(exp, axis=-1, keepdims=True)
