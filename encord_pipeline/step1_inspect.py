"""Step 1.1 — Inspect the Wafer AI project state.

Prints ontology, dataset/task counts, and saves a JSON snapshot to
``data/inspection_output.json``. Confirms whether the existing ontology already
contains the nine VALID_PATTERNS values; if not, run ``step1b_setup_ontology``.
"""

from __future__ import annotations

import json
from collections import Counter

from .constants import (
    CLASSIFICATION_TITLE,
    INSPECTION_PATH,
    PROJECT_ID,
    VALID_PATTERNS,
)
from .encord_client import get_project


def _summarise_ontology(ontology_dict: dict) -> dict:
    classifications = ontology_dict.get("classifications", [])
    summary = []
    for cls in classifications:
        attrs = cls.get("attributes") or []
        for attr in attrs:
            options = attr.get("options") or []
            summary.append(
                {
                    "classification_uid": cls.get("id") or cls.get("uid"),
                    "feature_node_hash": cls.get("featureNodeHash")
                    or cls.get("feature_node_hash"),
                    "attribute_name": attr.get("name"),
                    "attribute_type": attr.get("type"),
                    "required": attr.get("required"),
                    "option_values": [opt.get("value") for opt in options],
                    "option_labels": [opt.get("label") for opt in options],
                }
            )
    return {"classifications": summary, "raw": ontology_dict}


def main() -> None:
    project = get_project(PROJECT_ID)

    print("=" * 60)
    print(f"PROJECT: {project.title}")
    print(f"ID:      {project.project_hash}")
    print("=" * 60)

    ontology_dict = project.ontology_structure.to_dict()
    summary = _summarise_ontology(ontology_dict)

    print("\nClassifications:")
    pattern_classification = None
    for cls in summary["classifications"]:
        print(
            f"  - {cls['attribute_name']!r} "
            f"({cls['attribute_type']}, required={cls['required']}) "
            f"options={cls['option_values']}"
        )
        name = (cls["attribute_name"] or "").strip().lower()
        if (
            name == CLASSIFICATION_TITLE.lower()
            or "defect" in name
            or "pattern" in name
        ):
            pattern_classification = cls

    label_rows = project.list_label_rows_v2()
    statuses: Counter[str] = Counter()
    for row in label_rows:
        try:
            node = row.workflow_graph_node
            statuses[node.title if node else "<no-stage>"] += 1
        except Exception:
            try:
                statuses[str(row.annotation_task_status)] += 1
            except Exception:
                statuses["<unknown>"] += 1

    print(f"\nTotal label rows: {len(label_rows)}")
    print("Task status breakdown:")
    for status, count in statuses.most_common():
        print(f"  {status}: {count}")

    def _row_stage(row) -> str:
        try:
            node = row.workflow_graph_node
            return node.title if node else "<no-stage>"
        except Exception:
            try:
                return str(row.annotation_task_status)
            except Exception:
                return "<unknown>"

    print("\nSample rows:")
    for row in label_rows[:5]:
        short_hash = (row.label_hash or "<no-label-hash>")[:8]
        print(
            f"  {short_hash} | "
            f"{(row.data_title or '')[:48]:<48} | {_row_stage(row)}"
        )

    ontology_ok = False
    missing_options: list[str] = []
    if pattern_classification is not None:
        existing = set(pattern_classification["option_values"] or [])
        missing_options = [v for v in VALID_PATTERNS if v not in existing]
        ontology_ok = not missing_options

    print("\nOntology gate:")
    if ontology_ok:
        print("  PASS — all nine VALID_PATTERNS are present as option values.")
    else:
        if pattern_classification is None:
            print(
                "  FAIL — could not find a 'Defect Pattern' classification in the ontology."
            )
        else:
            print(
                "  FAIL — defect-pattern classification is missing values: "
                f"{missing_options}"
            )
        print(
            "  Run `python -m encord_pipeline.step1b_setup_ontology` and follow the printed instructions."
        )

    INSPECTION_PATH.parent.mkdir(parents=True, exist_ok=True)
    INSPECTION_PATH.write_text(
        json.dumps(
            {
                "project_id": project.project_hash,
                "project_title": project.title,
                "total_label_rows": len(label_rows),
                "status_breakdown": dict(statuses),
                "ontology": ontology_dict,
                "ontology_summary": summary["classifications"],
                "ontology_gate_ok": ontology_ok,
                "missing_pattern_values": missing_options,
                "sample_rows": [
                    {
                        "label_hash": row.label_hash,
                        "data_title": row.data_title,
                        "status": _row_stage(row),
                    }
                    for row in label_rows[:20]
                ],
            },
            indent=2,
        )
    )
    print(f"\nSaved snapshot to {INSPECTION_PATH}")


if __name__ == "__main__":
    main()
