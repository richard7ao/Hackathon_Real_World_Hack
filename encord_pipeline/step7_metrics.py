"""Step 7 — Package model metrics for the demo dashboard.

The PRD's optional ``step7_upload_model_to_encord.py`` does not actually push a
model artefact to Encord (the SDK does not currently expose a generic model
registry). It instead derives a metrics snapshot for the UI / pitch deck. We
keep that behaviour: the file produced here is the asset Demo Person 1 wires
into the stats panel.
"""

from __future__ import annotations

import json
import sys

from .constants import GEMINI_MODEL_PRIMARY, MODEL_METRICS_PATH, TRAINING_HISTORY_PATH


def main() -> None:
    if not TRAINING_HISTORY_PATH.exists():
        print(
            f"Missing {TRAINING_HISTORY_PATH}. Run step6_train first.",
            file=sys.stderr,
        )
        raise SystemExit(1)

    history = json.loads(TRAINING_HISTORY_PATH.read_text())
    if not history:
        raise SystemExit("Training history file is empty.")
    best = max(history, key=lambda entry: entry["val_acc"])

    metrics = {
        "model": "ResNet18 fine-tuned (layer4 + fc)",
        "dataset": "WM-811K curated subset",
        "labels_generated_by": GEMINI_MODEL_PRIMARY,
        "annotation_platform": "Encord",
        "best_val_accuracy": best["val_acc"],
        "best_epoch": best["epoch"],
        "per_class_accuracy": best["per_class_acc"],
        "architecture": "ResNet18",
        "image_size": 224,
        "classes": list(best["per_class_acc"].keys()),
    }
    MODEL_METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    MODEL_METRICS_PATH.write_text(json.dumps(metrics, indent=2))

    print(json.dumps(metrics, indent=2))
    print(f"\nMetrics saved: {MODEL_METRICS_PATH}")


if __name__ == "__main__":
    main()
