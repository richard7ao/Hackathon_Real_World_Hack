"""Step 5b - Bypass Encord export and build training_labels.csv from a
local folder-per-class dataset.

Use this when you have a clean dataset on disk (one folder per defect class)
and want to skip the Encord pre-label / review loop. The output schema is
identical to Step 5 so Step 6 (training) runs unchanged.

Folder name normalisation maps common WM-811K folder spellings to the nine
canonical ``VALID_PATTERNS`` strings.
"""

from __future__ import annotations

import argparse
import random
import shutil
import sys
from pathlib import Path

import pandas as pd

from .constants import (
    CLASSIFIER_LABELS_CSV,
    REPO_ROOT,
    TRAINING_LABELS_CSV,
    VALID_PATTERNS,
)

DATASET_ROOT = REPO_ROOT / "data" / "WM811k_Dataset"

FOLDER_TO_LABEL: dict[str, str] = {
    "center": "center",
    "donut": "donut",
    "edge local": "edge-loc",
    "edge_local": "edge-loc",
    "edge-loc": "edge-loc",
    "edge ring": "edge-ring",
    "edge_ring": "edge-ring",
    "edge-ring": "edge-ring",
    "local": "loc",
    "loc": "loc",
    "scratch": "scratch",
    "near full": "near-full",
    "near_full": "near-full",
    "near-full": "near-full",
    "none": "none",
    "random": "random",
}

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


def _normalise_folder(name: str) -> str:
    key = name.strip().lower().replace("-", " ").replace("_", " ")
    return FOLDER_TO_LABEL.get(key) or FOLDER_TO_LABEL.get(name.strip().lower(), "")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dataset",
        type=Path,
        default=DATASET_ROOT,
        help=f"Folder containing one subfolder per class (default: {DATASET_ROOT}).",
    )
    parser.add_argument(
        "--per-class",
        type=int,
        default=100,
        help="Cap each class to this many samples (sampled deterministically). 0 = no cap.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for the per-class sampling.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.dataset.exists():
        print(f"Dataset folder not found: {args.dataset}", file=sys.stderr)
        sys.exit(1)

    rng = random.Random(args.seed)

    rows: list[dict] = []
    skipped_folders: list[str] = []

    for child in sorted(args.dataset.iterdir()):
        if not child.is_dir():
            continue
        label = _normalise_folder(child.name)
        if not label:
            skipped_folders.append(child.name)
            continue

        images = sorted(
            p for p in child.iterdir() if p.suffix.lower() in IMAGE_EXTS
        )
        if args.per_class and len(images) > args.per_class:
            rng.shuffle(images)
            images = sorted(images[: args.per_class])

        for img in images:
            rows.append(
                {
                    "filename": img.name,
                    "label": label,
                    "annotator_confidence": "certain",
                    "label_hash": "",
                    "data_hash": "",
                    "status": "folder_label",
                    "local_path": str(img.resolve()),
                }
            )

    if skipped_folders:
        print(f"Skipped unknown folders: {skipped_folders}", file=sys.stderr)

    if not rows:
        print("No labelled images found.", file=sys.stderr)
        sys.exit(1)

    df = pd.DataFrame(rows)
    TRAINING_LABELS_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(TRAINING_LABELS_CSV, index=False)
    shutil.copyfile(TRAINING_LABELS_CSV, CLASSIFIER_LABELS_CSV)

    print(f"Exported {len(df)} labelled images from {args.dataset}")
    print("\nClass distribution:")
    print(df["label"].value_counts().sort_index().to_string())
    missing = sorted(set(VALID_PATTERNS) - set(df["label"]))
    if missing:
        print(f"\nMissing classes: {missing}", file=sys.stderr)
    print(f"\nWritten:  {TRAINING_LABELS_CSV}")
    print(f"Mirrored: {CLASSIFIER_LABELS_CSV}")


if __name__ == "__main__":
    main()
