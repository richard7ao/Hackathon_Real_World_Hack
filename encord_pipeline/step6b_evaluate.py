"""Step 6b — Print per-class metrics for the saved checkpoint."""

from __future__ import annotations

import sys

import torch
import torch.nn as nn
from torchvision import models

from .constants import MODEL_PATH, VALID_PATTERNS


def main() -> None:
    if not MODEL_PATH.exists():
        print(f"Missing {MODEL_PATH}. Run step6_train first.", file=sys.stderr)
        raise SystemExit(1)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    checkpoint = torch.load(MODEL_PATH, map_location=device)

    model = models.resnet18()
    model.fc = nn.Linear(model.fc.in_features, len(VALID_PATTERNS))
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device).eval()

    print(f"Best epoch: {checkpoint.get('epoch')}")
    print(f"Validation accuracy: {checkpoint.get('val_acc', 0)*100:.1f}%")
    print(f"Trained on: {checkpoint.get('config', {}).get('trained_on_n_images', '?')} images")

    print("\nPer-class accuracy:")
    per_class = checkpoint.get("per_class_acc", {})
    for label in VALID_PATTERNS:
        acc = per_class.get(label, 0)
        bar = "#" * int(acc * 20)
        print(f"  {label:<10} {acc*100:5.1f}%  {bar}")

    print("\nLabels stored in checkpoint match VALID_PATTERNS:",
          checkpoint.get("labels") == VALID_PATTERNS)


if __name__ == "__main__":
    main()
