"""FMECA assessment engine — pure deterministic rules over DEFECT_STANDARD_MAP."""

from __future__ import annotations

from typing import Literal

from .defect_map import DEFECT_STANDARD_MAP

DefectPattern = Literal[
    "center", "donut", "edge-loc", "edge-ring",
    "loc", "random", "scratch", "near-full", "none",
]
TargetMarket = Literal["aerospace_class3", "automotive", "consumer"]


def calculate_fmeca_assessment(
    defect_pattern: DefectPattern,
    occurrence_in_recent_batches: int,
    detection_confidence: float,
    target_market: TargetMarket = "aerospace_class3",
) -> dict:
    """Generate full FMECA criticality assessment per NASA MIL-STD-1629A."""
    if defect_pattern not in DEFECT_STANDARD_MAP:
        raise ValueError(f"Unknown defect pattern: {defect_pattern}")

    mapping = DEFECT_STANDARD_MAP[defect_pattern]

    severity = int(mapping["fmeca_severity"][target_market])
    occurrence = _scale_occurrence(int(occurrence_in_recent_batches))
    detection = _scale_detection(float(detection_confidence))
    rpn = severity * occurrence * detection

    return {
        "defect_pattern": defect_pattern,
        "human_label": mapping["human_label"],
        "fmeca": {
            "severity": severity,
            "occurrence": occurrence,
            "detection": detection,
            "rpn": rpn,
            "mil_std_1629a_category": mapping["mil_std_1629a_category"],
            "mandatory_corrective_action": rpn >= 100,
            "standard_invoked": "NASA MIL-STD-1629A",
            "severity_justification": _severity_justification(severity, target_market),
            "occurrence_justification": (
                f"{occurrence_in_recent_batches} instances in last 24h batches"
            ),
            "detection_justification": f"AI confidence {detection_confidence:.2f}",
        },
        "ipc_a_610": {
            "class_1_outcome": mapping["ipc_a_610_outcome"]["class_1"],
            "class_2_outcome": mapping["ipc_a_610_outcome"]["class_2"],
            "class_3_outcome": mapping["ipc_a_610_outcome"]["class_3"],
            "highest_class_passed": _highest_passing_class(mapping["ipc_a_610_outcome"]),
        },
        "jedec": {"impact": mapping["jedec_impact"]},
        "diagnosis": {
            "likely_root_cause": mapping["root_cause_hypothesis"],
            "process_variable_to_investigate": mapping["process_variable"],
            "responsible_equipment": mapping["responsible_equipment"],
            "typical_corrective_action": mapping["typical_corrective_action"],
        },
    }


def _scale_occurrence(count: int) -> int:
    if count == 0:
        return 1
    if count <= 2:
        return 2
    if count <= 5:
        return 4
    if count <= 10:
        return 6
    if count <= 20:
        return 8
    return 10


def _scale_detection(confidence: float) -> int:
    """Detection score is INVERSE of detectability per FMECA convention."""
    if confidence >= 0.95:
        return 1
    if confidence >= 0.85:
        return 2
    if confidence >= 0.75:
        return 4
    if confidence >= 0.60:
        return 6
    if confidence >= 0.40:
        return 8
    return 10


def _highest_passing_class(outcomes: dict) -> str:
    if outcomes["class_3"] == "PASS":
        return "Class 3 (Aerospace/Military)"
    if outcomes["class_2"] in ("PASS", "PASS_WITH_REWORK"):
        return "Class 2 (Industrial/Automotive)"
    if outcomes["class_1"] in ("PASS", "PASS_WITH_REWORK"):
        return "Class 1 (Consumer)"
    return "Fails all classes — scrap required"


def _severity_justification(severity: int, market: str) -> str:
    if severity >= 9:
        return f"Catastrophic for {market} — mission/life critical impact"
    if severity >= 7:
        return f"Critical for {market} — major function loss"
    if severity >= 4:
        return f"Major for {market} — minor function loss"
    if severity >= 1:
        return f"Minor for {market} — cosmetic only"
    return "No defect"
