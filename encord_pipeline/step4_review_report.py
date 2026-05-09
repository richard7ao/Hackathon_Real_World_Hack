"""Step 4.1 — Generate a confidence-sorted review queue from Gemini pre-labels.

Reads :data:`PRELABELS_CSV` and writes :data:`REVIEW_QUEUE_CSV` with the rows
that the human annotators should look at in the Encord UI (low confidence or
ambiguous predictions). Also prints a quick summary so you can see whether the
distribution looks sane before kicking off review.
"""

from __future__ import annotations

import sys

import pandas as pd

from .constants import PRELABELS_CSV, REVIEW_QUEUE_CSV


CONFIDENCE_BANDS = [
    ("High   (>=0.85)", lambda c: c >= 0.85),
    ("Medium (0.60-0.85)", lambda c: 0.60 <= c < 0.85),
    ("Low    (<0.60)", lambda c: c < 0.60),
]


def main() -> None:
    if not PRELABELS_CSV.exists():
        print(f"Missing {PRELABELS_CSV}. Run step3_prelabel first.", file=sys.stderr)
        raise SystemExit(1)

    df = pd.read_csv(PRELABELS_CSV)
    if df.empty:
        print("Pre-label CSV has no rows. Nothing to review.")
        raise SystemExit(0)

    print("=" * 60)
    print("PRE-LABEL QUALITY REPORT")
    print("=" * 60)
    print(f"Total images:      {len(df)}")
    print(f"Written to Encord: {df['encord_written'].sum()}")
    print(f"Errors:            {df['error'].notna().sum()}")

    print("\nConfidence breakdown:")
    for label, predicate in CONFIDENCE_BANDS:
        mask = df["confidence"].apply(predicate)
        count = int(mask.sum())
        pct = count / len(df) * 100 if len(df) else 0.0
        print(f"  {label}: {count:3d} ({pct:5.1f}%)")

    print("\nPattern distribution:")
    print(df["defect_pattern"].value_counts().to_string())

    print("\nMean confidence by pattern:")
    print(
        df.groupby("defect_pattern")["confidence"].mean().round(3).sort_values().to_string()
    )

    low_conf = df[df["confidence"] < 0.60]
    ambiguous = df[df["alternative"].notna() & (df["confidence"] < 0.75)]
    review = (
        pd.concat([low_conf, ambiguous])
        .drop_duplicates(subset=["label_hash"])
        .sort_values("confidence")
    )

    REVIEW_QUEUE_CSV.parent.mkdir(parents=True, exist_ok=True)
    review.to_csv(REVIEW_QUEUE_CSV, index=False)

    train_ready = df[df["confidence"] >= 0.75]
    print(f"\nReview priority:")
    print(f"  Low confidence:    {len(low_conf)}")
    print(f"  Ambiguous:         {len(ambiguous)}")
    print(f"  Training-ready:    {len(train_ready)} (>=0.75 confidence)")
    print(f"\nReview queue saved: {REVIEW_QUEUE_CSV}")
    print(
        "\nReviewer brief:"
        "\n  1. Open https://app.encord.com -> Wafer AI project -> Queue tab."
        "\n  2. Sort by confidence ascending; correct or accept each pre-label."
        "\n  3. Submit each task so the workflow status flips to Completed."
    )


if __name__ == "__main__":
    main()
