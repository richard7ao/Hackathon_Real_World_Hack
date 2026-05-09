"""Build the deterministic 30-wafer demo batch under ``data/demo_batch/``.

Demo narrative: "this batch of 30 wafers came off CoWoS-Station-A42 in the
last hour." Most are clean, but a handful of defects are seeded so the
audience sees the model identify, rank, and route them to corrective
actions in real time.

Filename convention: ``<sequence>_<true-label>_<source-name>.jpg`` so the UI
can decode the ground-truth class from the filename without extra metadata.
"""

from __future__ import annotations

import argparse
import random
import shutil
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DATASET_ROOT = REPO_ROOT / "data" / "WM811k_Dataset"
DEMO_BATCH = REPO_ROOT / "data" / "demo_batch"

# Folder name -> canonical pattern (mirrors the rest of the pipeline).
FOLDER_TO_LABEL: dict[str, str] = {
    "Center": "center",
    "Donut": "donut",
    "Edge Local": "edge-loc",
    "Edge Ring": "edge-ring",
    "Local": "loc",
    "Scratch": "scratch",
    "near full": "near-full",
    "none": "none",
    "random": "random",
}
LABEL_TO_FOLDER = {v: k for k, v in FOLDER_TO_LABEL.items()}

# 30-wafer recipe. Mostly pass, with a curated mix of defect classes.
# Order matters — the UI plays through the batch in this sequence so you
# can rehearse exactly what the audience will see.
RECIPE: list[str] = [
    # Quiet opening — the line is healthy.
    "none", "none", "none", "none", "none",
    # First defect: an obvious edge-ring (this is the demo's hero defect —
    # plasma etch issue, maps to STG-04 CoW bonding).
    "edge-ring",
    "none", "none",
    # Second defect: donut — spin-coater issue.
    "donut",
    "none", "none", "none",
    # Third + fourth defects clustered: the line is drifting.
    "edge-ring", "edge-ring",
    "none",
    # Center cluster (wafer chuck thermal issue).
    "center",
    "none", "none",
    # A scratch (mechanical handling — different responsible equipment).
    "scratch",
    "none",
    # Near-full failure — the catastrophic case.
    "near-full",
    "none", "none", "none",
    # Local cluster (cleanroom particulate).
    "loc",
    "none", "none",
    # Final three passes — settle back to nominal.
    "none", "none", "none",
]


def _ensure_dataset() -> None:
    if not DATASET_ROOT.exists():
        raise SystemExit(f"Dataset not found at {DATASET_ROOT}")
    for folder in set(LABEL_TO_FOLDER[label] for label in RECIPE):
        if not (DATASET_ROOT / folder).exists():
            raise SystemExit(
                f"Missing source folder '{folder}' under {DATASET_ROOT}"
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--seed",
        type=int,
        default=20260509,
        help="Random seed for picking source images (default: stable demo seed).",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Wipe the existing demo_batch folder before populating.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    _ensure_dataset()

    rng = random.Random(args.seed)

    if args.clean and DEMO_BATCH.exists():
        shutil.rmtree(DEMO_BATCH)
    DEMO_BATCH.mkdir(parents=True, exist_ok=True)

    summary: list[tuple[str, str]] = []
    for idx, label in enumerate(RECIPE, start=1):
        folder = LABEL_TO_FOLDER[label]
        candidates = sorted(
            (DATASET_ROOT / folder).glob("*.[jp][pn]g")
        )
        if not candidates:
            raise SystemExit(f"No images in {DATASET_ROOT / folder}")
        pick = rng.choice(candidates)
        seq = f"{idx:02d}"
        dest_name = f"{seq}_{label}_{pick.name}"
        shutil.copyfile(pick, DEMO_BATCH / dest_name)
        summary.append((seq, label))

    print(f"Wrote {len(summary)} wafers to {DEMO_BATCH}")
    print("Sequence:")
    for seq, label in summary:
        marker = "  " if label == "none" else "* "
        print(f"  {marker}{seq}  {label}")


if __name__ == "__main__":
    main()
