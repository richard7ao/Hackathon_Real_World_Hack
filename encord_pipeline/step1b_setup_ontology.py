"""Step 1.2 — Ensure the Wafer AI ontology exposes the nine VALID_PATTERNS.

Strategy:

1. Locate the ontology already attached to the project (``project.ontology_hash``)
   and mutate its :class:`OntologyStructure` in place: add a "Defect Pattern"
   radio classification with the nine canonical option ``value`` strings, plus
   an optional "Annotator Confidence" radio classification.
2. Persist with ``ontology.save()`` (PUT to ``/v2/public/ontologies/{hash}``).
3. If the existing ontology already has the nine values, this is a no-op.

Run with ``--create-new`` to instead create a fresh ontology (useful when the
project's ontology is shared and you do not want to mutate it). Pair with
``--create-project --dataset-hash <hash>`` to also spin up a brand-new project
bound to the new ontology.
"""

from __future__ import annotations

import argparse

from encord.objects import OntologyStructure
from encord.objects.attributes import RadioAttribute
from encord.objects.classification import Classification

from .constants import (
    CLASSIFICATION_TITLE,
    CONFIDENCE_OPTIONS,
    CONFIDENCE_TITLE,
    PATTERN_HUMAN_LABELS,
    PROJECT_ID,
    VALID_PATTERNS,
)
from .encord_client import get_user_client


def _add_pattern_classification(structure: OntologyStructure) -> None:
    classification = structure.add_classification()
    attr = classification.add_attribute(
        RadioAttribute,
        CLASSIFICATION_TITLE,
        required=True,
    )
    for value in VALID_PATTERNS:
        attr.add_option(label=PATTERN_HUMAN_LABELS[value], value=value)


def _add_confidence_classification(structure: OntologyStructure) -> None:
    classification = structure.add_classification()
    attr = classification.add_attribute(
        RadioAttribute,
        CONFIDENCE_TITLE,
        required=False,
    )
    for value in CONFIDENCE_OPTIONS:
        attr.add_option(label=value.title(), value=value)


def _existing_classification_titles(structure: OntologyStructure) -> set[str]:
    titles: set[str] = set()
    for cls in structure.classifications:
        for attr in cls.attributes:
            if attr.name:
                titles.add(attr.name.strip().lower())
    return titles


def _option_values_for(structure: OntologyStructure, title: str) -> list[str]:
    target = title.strip().lower()
    for cls in structure.classifications:
        for attr in cls.attributes:
            if (attr.name or "").strip().lower() == target:
                return [opt.value for opt in getattr(attr, "options", [])]
    return []


def _build_full_structure() -> OntologyStructure:
    structure = OntologyStructure()
    _add_pattern_classification(structure)
    _add_confidence_classification(structure)
    return structure


def update_existing(project_id: str) -> None:
    user_client = get_user_client()
    project = user_client.get_project(project_id)
    ontology = user_client.get_ontology(project.ontology_hash)
    structure = ontology.structure

    pattern_present = (
        sorted(_option_values_for(structure, CLASSIFICATION_TITLE))
        == sorted(VALID_PATTERNS)
    )
    confidence_present = CONFIDENCE_TITLE.lower() in _existing_classification_titles(structure)

    if pattern_present and confidence_present:
        print("Ontology already matches the nine VALID_PATTERNS + confidence. No changes.")
        return

    if not pattern_present:
        if CLASSIFICATION_TITLE.lower() in _existing_classification_titles(structure):
            print(
                f"WARNING: '{CLASSIFICATION_TITLE}' classification already exists "
                "with different option values. Adding a fresh one alongside; "
                "consider cleaning up the duplicate in the Encord UI."
            )
        _add_pattern_classification(structure)
        print(f"Added '{CLASSIFICATION_TITLE}' radio with {len(VALID_PATTERNS)} options.")

    if not confidence_present:
        _add_confidence_classification(structure)
        print(
            f"Added optional '{CONFIDENCE_TITLE}' radio with options "
            f"{CONFIDENCE_OPTIONS}."
        )

    ontology.save()
    print(f"Saved ontology {ontology.ontology_hash}.")


def create_new(args: argparse.Namespace) -> None:
    user_client = get_user_client()
    structure = _build_full_structure()
    ontology = user_client.create_ontology(
        title=args.ontology_title,
        structure=structure,
    )
    print(f"Created ontology '{ontology.title}' -> hash {ontology.ontology_hash}")

    if args.create_project:
        if not args.dataset_hash:
            raise SystemExit("--create-project requires --dataset-hash.")
        project_hash = user_client.create_project(
            project_title=args.project_title,
            dataset_hashes=[args.dataset_hash],
            ontology_hash=ontology.ontology_hash,
        )
        print(f"Created project '{args.project_title}' -> hash {project_hash}")
        print(
            "Update encord_pipeline/constants.py PROJECT_ID to this hash if you "
            "want subsequent steps to target the new project."
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--create-new",
        action="store_true",
        help="Create a new ontology instead of mutating the project's existing one.",
    )
    parser.add_argument(
        "--ontology-title",
        default="Wafer AI - Defect Pattern v1",
        help="Title for the new ontology (with --create-new).",
    )
    parser.add_argument(
        "--create-project",
        action="store_true",
        help="With --create-new, also create a new project.",
    )
    parser.add_argument(
        "--project-title",
        default="Wafer AI",
        help="Title for the new project (with --create-project).",
    )
    parser.add_argument(
        "--dataset-hash",
        default=None,
        help="Existing dataset hash to attach when creating a project.",
    )
    parser.add_argument(
        "--project-id",
        default=PROJECT_ID,
        help="Project hash to update (default: Wafer AI from constants).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.create_new:
        create_new(args)
    else:
        update_existing(args.project_id)


if __name__ == "__main__":
    main()
