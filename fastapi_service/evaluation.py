"""Scoring, calibration and threshold selection. NumPy only, no PyTorch.

Split out of ``train.py`` for a practical reason: the training loop needs a
machine with working PyTorch, but everything in this file is arithmetic over a
matrix of logits, so it can be exercised by ``selfcheck.py`` on any machine —
including the ones where Smart App Control refuses to load torch's DLLs. It is
also what ``fit_calibration.py`` uses to re-measure the served engine, so the
numbers in ``metrics.json`` and the numbers a calibration run reports come
from the same code rather than from two implementations that agree until they
do not.

The one opinion encoded here is in ``selection_score`` and ``search_thresholds``:
calling a diseased leaf healthy is not an ordinary mistake. Plain accuracy and
plain macro-F1 both treat it as one, which is how v2 ended up with a 0.62
precision on ``Healthy`` and a respectable-looking 0.89 accuracy on the same
test set.
"""

from __future__ import annotations

import math

import numpy as np

from model import CLASSES

HEALTHY_INDEX = CLASSES.index("Healthy")
DISEASE_INDICES = tuple(i for i in range(len(CLASSES)) if i != HEALTHY_INDEX)

# -- Relative costs ----------------------------------------------------------
# Not tuning knobs — a statement about what each mistake does to a farm.
#
#   miss         an untreated infection. From the yield-loss figures in
#                ``src/data/diseases.ts``, 40-80% of the crop.
#   false alarm  one unnecessary spray: the chemical, the labour, residue on
#                fruit that will be sold, and selection pressure for
#                resistance. Real money, but one application of it.
#   abstain      the farmer is told the truth and sent to look at the plant.
#                A trip and a second photo, not a loss.
#
# The ratio matters more than the units. Abstention is deliberately the
# cheapest outcome *and* non-zero: zero would make "never answer" optimal,
# while anything near the false-alarm cost makes the search avoid saying "I
# don't know" — the opposite of what this project needs. At 0.5 it is the bar
# a prediction has to beat in order to be worth making, which is the right
# shape for the question.
MISS_COST = 10.0
FALSE_ALARM_COST = 2.0
ABSTAIN_COST = 0.5

# How hard ``selection_score`` penalises the false-healthy rate when picking
# the best epoch. At 2.0, halving the rate is worth roughly 8 macro-F1 points,
# which is the trade this project wants to make.
FALSE_HEALTHY_WEIGHT = 2.0


def confusion(truth: np.ndarray, predicted: np.ndarray) -> np.ndarray:
    """Rows are the true class, columns the predicted one."""
    matrix = np.zeros((len(CLASSES), len(CLASSES)), dtype=int)
    for actual, guess in zip(np.asarray(truth).ravel(), np.asarray(predicted).ravel()):
        matrix[int(actual), int(guess)] += 1
    return matrix


def per_class(matrix: np.ndarray) -> dict[str, dict[str, float]]:
    out: dict[str, dict[str, float]] = {}
    for i, name in enumerate(CLASSES):
        tp = int(matrix[i, i])
        support = int(matrix[i].sum())
        predicted_count = int(matrix[:, i].sum())
        precision = tp / predicted_count if predicted_count else 0.0
        recall = tp / support if support else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        out[name] = {"precision": precision, "recall": recall, "f1": f1, "support": support}
    return out


def false_healthy_rate(matrix: np.ndarray) -> float:
    """Share of genuinely diseased images that were called ``Healthy``.

    The single number this project is trying to drive down. On the v2 test set
    it is 19/119 = 0.160.
    """
    diseased = sum(int(matrix[i].sum()) for i in DISEASE_INDICES)
    if not diseased:
        return 0.0
    missed = sum(int(matrix[i, HEALTHY_INDEX]) for i in DISEASE_INDICES)
    return missed / diseased


def summarise(truth: np.ndarray, probs: np.ndarray) -> dict:
    """Full report for one set of predictions.

    ``probs`` is (n, len(CLASSES)); the argmax is the prediction, so this is
    the report for a model with no abstain option — comparable with v2's
    ``metrics.json``.
    """
    probs = np.asarray(probs, dtype=np.float64)
    truth = np.asarray(truth).ravel()
    predicted = probs.argmax(axis=1)
    matrix = confusion(truth, predicted)
    classes = per_class(matrix)
    rate = false_healthy_rate(matrix)
    macro_f1 = float(np.mean([c["f1"] for c in classes.values()]))
    # Clipped before the log so a probability of exactly 0 on the true class
    # gives a large loss rather than an infinite one.
    nll = float(-np.log(np.clip(probs[np.arange(len(truth)), truth], 1e-12, 1.0)).mean())
    return {
        "loss": nll,
        "accuracy": float(np.trace(matrix) / max(1, matrix.sum())),
        "macro_f1": macro_f1,
        "false_healthy_rate": rate,
        "false_healthy_count": int(
            sum(int(matrix[i, HEALTHY_INDEX]) for i in DISEASE_INDICES)
        ),
        "selection_score": selection_score(macro_f1, rate),
        "expected_calibration_error": expected_calibration_error(truth, probs),
        "per_class": classes,
        "confusion_matrix": matrix.tolist(),
    }


def selection_score(macro_f1: float, rate: float) -> float:
    """What "best epoch" means here.

    Macro-F1 alone picked v2's epoch 11, which scored 0.898 macro-F1 while
    calling 19 diseased leaves healthy. Subtracting the false-healthy rate
    makes the training loop prefer the checkpoint a farmer would prefer.
    """
    return macro_f1 - FALSE_HEALTHY_WEIGHT * rate


def expected_calibration_error(truth: np.ndarray, probs: np.ndarray, bins: int = 10) -> float:
    """How far the stated confidence is from the observed hit rate.

    Grouped into equal-width confidence bins; each bin contributes the gap
    between its mean confidence and its accuracy, weighted by its size. A
    model that says 90% and is right 90% of the time scores 0. Reported
    because ``confidence_percentage`` is shown to farmers as a number, and an
    overconfident 95% is a different thing to a calibrated one.
    """
    probs = np.asarray(probs, dtype=np.float64)
    truth = np.asarray(truth).ravel()
    confidence = probs.max(axis=1)
    correct = probs.argmax(axis=1) == truth
    error = 0.0
    edges = np.linspace(0.0, 1.0, bins + 1)
    for index in range(bins):
        lower = edges[index]
        # The top bin is closed at exactly 1.0 so a prediction of 1.0 is
        # counted rather than falling off the end through rounding.
        upper = 1.0 if index == bins - 1 else edges[index + 1]
        in_bin = (confidence > lower) & (confidence <= upper)
        if not in_bin.any():
            continue
        error += in_bin.mean() * abs(correct[in_bin].mean() - confidence[in_bin].mean())
    return float(error)


def softmax_rows(logits: np.ndarray) -> np.ndarray:
    shifted = logits - logits.max(axis=-1, keepdims=True)
    exp = np.exp(shifted)
    return exp / exp.sum(axis=-1, keepdims=True)


def nll_at_temperature(logits: np.ndarray, truth: np.ndarray, temperature: float) -> float:
    probs = softmax_rows(np.asarray(logits, dtype=np.float64) / temperature)
    return float(-np.log(np.clip(probs[np.arange(len(truth)), truth], 1e-12, 1.0)).mean())


# Search bounds for temperature scaling. A fit that lands on either bound did
# not find an interior optimum, which means the model is not merely
# overconfident but wrong — see ``temperature_hit_boundary``.
TEMPERATURE_MIN = 0.05
TEMPERATURE_MAX = 20.0


def temperature_hit_boundary(temperature: float, tolerance: float = 0.02) -> str | None:
    """Why a fitted temperature should not be trusted, or ``None`` if it is fine.

    NLL is minimised by pushing every prediction towards uniform when the
    model's ranking carries no information, so a fit that runs to the upper
    bound is the signature of a broken checkpoint rather than of a calibration
    that happens to need a lot of smoothing. Writing that number into
    ``calibration.json`` would present a broken model as a calibrated one.
    """
    if temperature >= TEMPERATURE_MAX * (1.0 - tolerance):
        return (
            f"temperature ชนขอบบน ({temperature:.3f} จากเพดาน {TEMPERATURE_MAX}) — "
            "แปลว่าการจัดอันดับคลาสของโมเดลแทบไม่มีข้อมูล ไม่ใช่แค่มั่นใจเกินจริง "
            "ให้ตรวจว่าโมเดลและป้ายกำกับตรงกันก่อน"
        )
    if temperature <= TEMPERATURE_MIN * (1.0 + tolerance):
        return (
            f"temperature ชนขอบล่าง ({temperature:.3f} จากพื้น {TEMPERATURE_MIN}) — "
            "แปลว่าโมเดลมั่นใจน้อยกว่าความถูกต้องจริงอย่างมาก ซึ่งผิดปกติ "
            "ให้ตรวจชุดข้อมูลที่ใช้ปรับเทียบ"
        )
    return None


def fit_temperature(
    logits: np.ndarray,
    truth: np.ndarray,
    *,
    low: float = TEMPERATURE_MIN,
    high: float = TEMPERATURE_MAX,
    iterations: int = 80,
) -> float:
    """Temperature scaling (Guo et al., 2017), by golden-section search.

    One scalar divides every logit before the softmax. It cannot change which
    class wins, so it cannot change accuracy — it only moves the stated
    confidence towards the observed hit rate. T > 1 means the model was
    overconfident, which is the usual result for a network trained to
    convergence on a few hundred images.

    Golden-section rather than gradient descent because the objective is a
    smooth unimodal function of one variable: 80 evaluations is exact to well
    past the precision anyone will read, and it keeps SciPy out of the
    dependency list.
    """
    logits = np.asarray(logits, dtype=np.float64)
    truth = np.asarray(truth).ravel()
    if len(truth) < 2:
        raise ValueError("ต้องมีข้อมูลอย่างน้อย 2 ภาพจึงจะปรับเทียบได้")

    # Searched in log space: T = 2 and T = 0.5 are equally far from T = 1.
    lo, hi = math.log(low), math.log(high)
    invphi = (math.sqrt(5.0) - 1.0) / 2.0
    a, b = hi - invphi * (hi - lo), lo + invphi * (hi - lo)
    fa = nll_at_temperature(logits, truth, math.exp(a))
    fb = nll_at_temperature(logits, truth, math.exp(b))
    for _ in range(iterations):
        if fa < fb:
            hi, b, fb = b, a, fa
            a = hi - invphi * (hi - lo)
            fa = nll_at_temperature(logits, truth, math.exp(a))
        else:
            lo, a, fa = a, b, fb
            b = lo + invphi * (hi - lo)
            fb = nll_at_temperature(logits, truth, math.exp(b))
    return float(math.exp((lo + hi) / 2.0))


def decision_cost(
    truth: np.ndarray,
    probs: np.ndarray,
    healthy_threshold: float,
    disease_threshold: float,
) -> dict:
    """What a pair of thresholds costs, in the units at the top of this file.

    Mirrors exactly what ``buildDetection`` in ``src/lib/diseaseModel.ts``
    does with the same two numbers, so a threshold chosen here is the
    threshold the app applies:

      * top class is ``Healthy`` and clears ``healthy_threshold`` -> healthy
      * top class is a disease and clears ``disease_threshold``   -> diagnosed
      * otherwise                                                 -> abstain
    """
    probs = np.asarray(probs, dtype=np.float64)
    truth = np.asarray(truth).ravel()
    top = probs.argmax(axis=1)
    confidence = probs.max(axis=1)

    said_healthy = (top == HEALTHY_INDEX) & (confidence >= healthy_threshold)
    said_disease = (top != HEALTHY_INDEX) & (confidence >= disease_threshold)
    abstained = ~(said_healthy | said_disease)

    is_diseased = truth != HEALTHY_INDEX

    # A diseased leaf called healthy. The expensive error.
    missed = int((is_diseased & said_healthy).sum())
    # A healthy leaf called diseased, or the wrong disease named. Both send
    # the farmer to spray something; the second also sends the wrong product.
    false_alarm = int(((~is_diseased) & said_disease).sum())
    wrong_disease = int((is_diseased & said_disease & (top != truth)).sum())
    correct_disease = int((is_diseased & said_disease & (top == truth)).sum())
    correct_healthy = int(((~is_diseased) & said_healthy).sum())
    abstentions = int(abstained.sum())

    cost = (
        MISS_COST * missed
        + FALSE_ALARM_COST * (false_alarm + wrong_disease)
        + ABSTAIN_COST * abstentions
    )
    return {
        "healthy_threshold": round(healthy_threshold, 4),
        "disease_threshold": round(disease_threshold, 4),
        "cost": round(cost, 3),
        "cost_per_image": round(cost / max(1, len(truth)), 4),
        "missed_disease": missed,
        "false_alarm": false_alarm,
        "wrong_disease": wrong_disease,
        "correct_disease": correct_disease,
        "correct_healthy": correct_healthy,
        "abstained": abstentions,
    }


def search_thresholds(
    truth: np.ndarray,
    probs: np.ndarray,
    *,
    grid: int = 41,
) -> dict:
    """The threshold pair with the lowest expected cost on this set.

    v2's 0.70 and 0.90 were reasoned about rather than measured. This returns
    the measured pair, together with the cost of the v2 pair on the same data
    so the change is reviewable instead of a silent retune.

    Fit this on the *validation* set. Choosing thresholds on the test set and
    then reporting that set's cost is the oldest way to publish a number that
    does not survive contact with a field.
    """
    healthy_grid = np.linspace(0.50, 0.995, grid)
    disease_grid = np.linspace(0.40, 0.95, grid)
    best = None
    for healthy in healthy_grid:
        for disease in disease_grid:
            trial = decision_cost(truth, probs, float(healthy), float(disease))
            if best is None or trial["cost"] < best["cost"]:
                best = trial
    assert best is not None
    # Thresholds of 1.01 can never be cleared, so every image abstains. This
    # is the "the model is not worth consulting" baseline: if the best pair
    # cannot beat it, the honest move is to stop showing predictions, not to
    # retune the thresholds.
    always_abstain = decision_cost(truth, probs, 1.01, 1.01)
    return {
        "best": best,
        "v2_baseline": decision_cost(truth, probs, 0.90, 0.70),
        "always_abstain_baseline": always_abstain,
        "beats_always_abstain": best["cost"] < always_abstain["cost"],
        "cost_model": {
            "miss": MISS_COST,
            "false_alarm": FALSE_ALARM_COST,
            "abstain": ABSTAIN_COST,
            "note": "น้ำหนักมาจากมูลค่าผลผลิตที่เสียไปจริงเมื่อปล่อยโรคไว้ ดู src/data/diseases.ts",
        },
    }
