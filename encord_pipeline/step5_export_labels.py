"""Step 5 — Export reviewed Encord labels to a flat training CSV.

Walks every label row, reads its Defect Pattern classification answer (and the
optional Annotator Confidence), and writes ``data/training_labels.csv`` plus a
copy at ``data/encord_labels.csv`` (the filename used by the loopback-classifier
service, see encord_prd.md line 18).
"""

from __future__ import annotations

import shutil
import sys

import pandas as pd

from encord.objects import Classification

from .constants import (
    CLASSIFICATION_TITLE,
    CLASSIFIER_LABELS_CSV,
    CONFIDENCE_TITLE,
    IMAGE_DIR,
    PROJECT_ID,
    TRAINING_LABELS_CSV,
    VALID_PATTERNS,
)
from .encord_client import get_project


def _normalise(value: str) -> str:
    text = (value or "").strip().lower()
    if text in VALID_PATTERNS:
        return text
    for known in VALID_PATTERNS:
        if known in text or text in known:
            return known
    return ""


def _local_image_path(label_hash: str, data_title: str) -> str:
    safe = (data_title or "untitled").replace("/", "_").replace(" ", "_")
    candidate = IMAGE_DIR / f"{label_hash[:8]}_{safe}"
    if candidate.exists():
        return str(candidate)
    candidate_png = IMAGE_DIR / f"{label_hash[:8]}_{safe}.png"
    return str(candidate_png)


def _extract_answers(label_row) -> tuple[str, str | None]:
    pattern = ""
    annotator_confidence: str | None = None

    for instance in label_row.get_classification_instances():
        attribute_name = (instance.classification_name or "").strip().lower()

        try:
            answer = instance.get_answer()
        except Exception:
            continue

        value = getattr(answer, "value", None) or getattr(answer, "title", None) or str(answer)

        if (
            attribute_name == CLASSIFICATION_TITLE.lower()
            or "defect" in attribute_name
            or "pattern" in attribute_name
        ):
            pattern = _normalise(value)
        elif attribute_name == CONFIDENCE_TITLE.lower() or "confidence" in attribute_name:
            annotator_confidence = (value or "").strip().lower() or None

    return pattern, annotator_confidence


def main() -> None:
    project = get_project(PROJECT_ID)
    label_rows = project.list_label_rows_v2()
    print(f"Exporting {len(label_rows)} label rows...")

    rows: list[dict] = []
    skipped = 0
    for label_row in label_rows:
        try:
            label_row.initialise_labels()
            pattern, annotator_confidence = _extract_answers(label_row)
            if not pattern:
                skipped += 1
                continue

            try:
                node = label_row.workflow_graph_node
                stage = node.title if node else "<no-stage>"
            except Exception:
                stage = "<unknown>"

            rows.append(
                {
                    "filename": label_row.data_title,
                    "label": pattern,
                    "annotator_confidence": annotator_confidence,
                    "label_hash": label_row.label_hash,
                    "data_hash": label_row.data_hash,
                    "status": stage,
                    "local_path": _local_image_path(
                        label_row.label_hash, label_row.data_title
                    ),
                }
            )
        except Exception as exc:
            print(f"  ! {label_row.data_title}: {exc}", file=sys.stderr)
            skipped += 1

    if not rows:
        raise SystemExit(
            "No labelled rows exported. Make sure the project ontology has a "
            "'Defect Pattern' classification and that reviewers have submitted answers."
        )

    df = pd.DataFrame(rows)
    TRAINING_LABELS_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(TRAINING_LABELS_CSV, index=False)
    shutil.copyfile(TRAINING_LABELS_CSV, CLASSIFIER_LABELS_CSV)

    print(f"\nExported: {len(df)} (skipped {skipped})")
    print("\nClass distribution:")
    print(df["label"].value_counts().to_string())
    print(f"\nWritten: {TRAINING_LABELS_CSV}")
    print(f"Mirrored: {CLASSIFIER_LABELS_CSV} (used by loopback-classifier)")


if __name__ == "__main__":
    main()
