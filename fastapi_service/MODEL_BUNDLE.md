# Model bundle

The vision service loads only models whose weight and `*.labels.json` metadata
are present together. The metadata is part of the safety contract: it defines
the ordered classes, the training-data provenance, and any measured metrics.

| Registry name | Local weight(s) | Role |
| --- | --- | --- |
| `legacy4` | `model.onnx` | Primary four-class route. The ONNX sidecar identifies its source checkpoint. |
| `wide9` | `melon_m0.onnx`, `melon_e1.onnx`, `wide9.onnx` | Three-member ensemble for supplemental observations. `wide9.onnx` is byte-identical to the source `melon_m2.onnx`. |
| `wide11` | `melon_pv0.onnx` | Eleven-class experimental comparison engine. |
| `baseline9` | `watermelon_cls.onnx` | Earlier nine-class model retained only for comparison. |
| `claude` | External API | Opt-in, paid supplemental observation; it is not enabled merely because a key exists. |

`wide9`, `wide11`, `baseline9`, and `claude` never feed the primary diagnosis
or treatment route. Their output is an observation, not a diagnosis, and the
service reports `calibrated: false` for them.

The copied local weights are intentionally ignored by Git. Keep their small
`*.labels.json` files in source control and provision the matching weights at
deploy time. `Dockerfile` copies every locally provisioned ONNX weight and
label sidecar into the service image.

The separate YOLO leaf-detector checkpoint from the source project is not in
this bundle: it is only supplied as a PyTorch checkpoint, its hybrid route is
explicitly experimental, and it has no field validation. The current service
remains ONNX-only until a verified ONNX detector and independent field results
are available.
