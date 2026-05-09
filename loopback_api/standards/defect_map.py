"""Authoritative mapping from WM-811K defect pattern to industry standards.

Sources cited inline:
- NASA MIL-STD-1629A (Failure Mode, Effects and Criticality Analysis)
- IPC-A-610J  (Acceptability of Electronic Assemblies, March 2024)
- JEDEC JESD22 family (Reliability Test Methods)
- AIAG/VDA FMEA (4th edition)

Severity is rated 1-10 per FMECA convention:
  10  = Catastrophic (loss of mission/life)
  7-9 = Critical (loss of major function)
  4-6 = Major (loss of minor function)
  1-3 = Minor (cosmetic / no functional impact)
"""

from __future__ import annotations

DEFECT_STANDARD_MAP: dict[str, dict] = {
    "center": {
        "human_label": "Center cluster defect",
        "root_cause_hypothesis": "Wafer chuck thermal non-uniformity or alignment drift",
        "process_variable": "chuck_temperature_uniformity",
        "responsible_equipment": "wafer_chuck",
        "fmeca_severity": {"aerospace_class3": 9, "automotive": 7, "consumer": 5},
        "ipc_a_610_outcome": {
            "class_1": "PASS_WITH_REWORK",
            "class_2": "FAIL",
            "class_3": "FAIL",
        },
        "jedec_impact": "JESD22-A104 (Thermal Cycling) — failure likely due to non-uniform thermal expansion",
        "mil_std_1629a_category": "II — Critical",
        "typical_corrective_action": "Recalibrate wafer chuck temperature controller. Verify chuck pin flatness within 5μm tolerance.",
    },
    "donut": {
        "human_label": "Donut (ring) pattern defect",
        "root_cause_hypothesis": "Spin-coater non-uniformity or post-exposure bake (PEB) temperature gradient",
        "process_variable": "spin_coat_uniformity",
        "responsible_equipment": "spin_coater",
        "fmeca_severity": {"aerospace_class3": 8, "automotive": 7, "consumer": 5},
        "ipc_a_610_outcome": {
            "class_1": "PASS_WITH_REWORK",
            "class_2": "FAIL",
            "class_3": "FAIL",
        },
        "jedec_impact": "JESD22-A110 (HAST) — moisture ingress risk through ring-shaped weakness",
        "mil_std_1629a_category": "II — Critical",
        "typical_corrective_action": "Inspect spin-coater dispense nozzle. Verify PEB hotplate uniformity within 1°C across wafer.",
    },
    "edge-loc": {
        "human_label": "Edge-localised defect",
        "root_cause_hypothesis": "Edge bead removal failure or wafer handling damage at edge",
        "process_variable": "edge_bead_removal_pressure",
        "responsible_equipment": "edge_bead_remover",
        "fmeca_severity": {"aerospace_class3": 6, "automotive": 5, "consumer": 3},
        "ipc_a_610_outcome": {
            "class_1": "PASS",
            "class_2": "PASS_WITH_REWORK",
            "class_3": "FAIL",
        },
        "jedec_impact": "JESD22-B111 (Drop Test) — edge dies vulnerable to mechanical shock",
        "mil_std_1629a_category": "III — Marginal",
        "typical_corrective_action": "Adjust edge bead removal solvent pressure. Inspect wafer handler end effectors for wear.",
    },
    "edge-ring": {
        "human_label": "Edge-ring defect",
        "root_cause_hypothesis": "Plasma etch non-uniformity or chamber edge effect",
        "process_variable": "plasma_etch_uniformity",
        "responsible_equipment": "plasma_etcher",
        "fmeca_severity": {"aerospace_class3": 7, "automotive": 6, "consumer": 4},
        "ipc_a_610_outcome": {
            "class_1": "PASS_WITH_REWORK",
            "class_2": "FAIL",
            "class_3": "FAIL",
        },
        "jedec_impact": "JESD22-A104 (Thermal Cycling) — edge stress concentration",
        "mil_std_1629a_category": "II — Critical",
        "typical_corrective_action": "Inspect plasma etcher edge ring. Verify gas flow uniformity. Clean chamber walls.",
    },
    "loc": {
        "human_label": "Localised cluster defect",
        "root_cause_hypothesis": "Particulate contamination or localised equipment defect",
        "process_variable": "cleanroom_particle_count",
        "responsible_equipment": "cleanroom_environment",
        "fmeca_severity": {"aerospace_class3": 7, "automotive": 5, "consumer": 3},
        "ipc_a_610_outcome": {
            "class_1": "PASS",
            "class_2": "PASS_WITH_REWORK",
            "class_3": "FAIL",
        },
        "jedec_impact": "JESD22-A101 (Steady State Temperature/Humidity)",
        "mil_std_1629a_category": "III — Marginal",
        "typical_corrective_action": "Trigger cleanroom particle audit. Inspect HEPA filters. Review operator gowning compliance.",
    },
    "random": {
        "human_label": "Random distributed defects",
        "root_cause_hypothesis": "Baseline particle contamination — within process control",
        "process_variable": "baseline_yield",
        "responsible_equipment": "general_process",
        "fmeca_severity": {"aerospace_class3": 3, "automotive": 2, "consumer": 1},
        "ipc_a_610_outcome": {
            "class_1": "PASS",
            "class_2": "PASS",
            "class_3": "PASS_WITH_REWORK",
        },
        "jedec_impact": "Within standard process variation",
        "mil_std_1629a_category": "IV — Negligible",
        "typical_corrective_action": "Continue monitoring. No immediate action required if within statistical process control limits.",
    },
    "scratch": {
        "human_label": "Scratch (linear) defect",
        "root_cause_hypothesis": "Mechanical wafer handling damage — robot end effector wear or cassette misalignment",
        "process_variable": "wafer_handler_wear",
        "responsible_equipment": "wafer_handler_robot",
        "fmeca_severity": {"aerospace_class3": 8, "automotive": 7, "consumer": 6},
        "ipc_a_610_outcome": {
            "class_1": "FAIL",
            "class_2": "FAIL",
            "class_3": "FAIL",
        },
        "jedec_impact": "JESD22-B111 (Drop) and JESD22-B104 (Mechanical Shock) — mechanical integrity compromised",
        "mil_std_1629a_category": "II — Critical",
        "typical_corrective_action": "Stop affected wafer handler. Inspect end effector pads. Verify cassette slot alignment within 0.1mm.",
    },
    "near-full": {
        "human_label": "Near-full wafer failure",
        "root_cause_hypothesis": "Catastrophic process failure — equipment malfunction or wrong recipe loaded",
        "process_variable": "process_recipe_integrity",
        "responsible_equipment": "process_control_system",
        "fmeca_severity": {"aerospace_class3": 10, "automotive": 10, "consumer": 9},
        "ipc_a_610_outcome": {
            "class_1": "FAIL",
            "class_2": "FAIL",
            "class_3": "FAIL",
        },
        "jedec_impact": "Wafer scrap — no qualification testing applicable",
        "mil_std_1629a_category": "I — Catastrophic",
        "typical_corrective_action": "IMMEDIATE LINE STOP. Verify recipe ID against work order. Audit last 3 wafers from same batch.",
    },
    "none": {
        "human_label": "No defect pattern detected",
        "root_cause_hypothesis": "No defect pattern detected — wafer passes",
        "process_variable": None,
        "responsible_equipment": None,
        "fmeca_severity": {"aerospace_class3": 0, "automotive": 0, "consumer": 0},
        "ipc_a_610_outcome": {"class_1": "PASS", "class_2": "PASS", "class_3": "PASS"},
        "jedec_impact": "All qualification tests applicable",
        "mil_std_1629a_category": "N/A",
        "typical_corrective_action": "No action required.",
    },
}

VALID_PATTERNS: list[str] = list(DEFECT_STANDARD_MAP.keys())
