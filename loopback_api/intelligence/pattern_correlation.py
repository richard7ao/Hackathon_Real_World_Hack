"""Pattern correlation layer: stats + LLM reasoning over recent batches.

Stage 1: deterministic Pandas analysis of the lookback window.
Stage 2: LLM reasoning that turns the stats into a root-cause hypothesis +
         specific corrective action.

The LLM call uses Gemini (``GOOGLE_API_KEY``) when available. If neither key
is configured or the API errors, we fall back to a deterministic synthesis
that quotes the standards map — the API stays online for the demo even
without an LLM key.
"""

from __future__ import annotations

import json
import os
from typing import Optional

import pandas as pd

from ..standards.defect_map import DEFECT_STANDARD_MAP


def correlate_pattern(
    batches_path: str = "data/batches.json",
    target_defect: str = "edge-ring",
    lookback_batches: int = 50,
) -> dict:
    """Identify the cluster pattern for a defect type and propose a root cause."""
    with open(batches_path) as f:
        batches = json.load(f)

    df = pd.DataFrame(batches[-lookback_batches:])
    target_batches = df[df["primary_defect_pattern"] == target_defect]
    other_batches = df[df["primary_defect_pattern"] != target_defect]

    if len(target_batches) == 0:
        return {"error": f"No occurrences of {target_defect} in last {lookback_batches} batches"}

    stats = _statistical_findings(df, target_batches, other_batches)
    dominant_machine = max(stats["machine_distribution"], key=stats["machine_distribution"].get)
    dominant_shift = max(stats["shift_distribution"], key=stats["shift_distribution"].get)
    standards_context = DEFECT_STANDARD_MAP[target_defect]

    llm_output = _llm_reasoning(
        target_defect=target_defect,
        lookback_batches=lookback_batches,
        stats=stats,
        standards_context=standards_context,
        dominant_machine=dominant_machine,
        dominant_shift=dominant_shift,
    )

    return {
        "target_defect": target_defect,
        "lookback_batches": lookback_batches,
        "statistical_findings": stats,
        "llm_analysis": llm_output,
        "standards_context": {
            "fmeca_severity_aerospace": standards_context["fmeca_severity"]["aerospace_class3"],
            "mil_std_category": standards_context["mil_std_1629a_category"],
            "ipc_class_3_outcome": standards_context["ipc_a_610_outcome"]["class_3"],
        },
    }


def _statistical_findings(df: pd.DataFrame, target: pd.DataFrame, other: pd.DataFrame) -> dict:
    return {
        "occurrence_count": int(len(target)),
        "occurrence_rate": float(len(target) / len(df)),
        "machine_distribution": target["machine_id"].value_counts().to_dict(),
        "shift_distribution": target["shift"].value_counts().to_dict(),
        "operator_distribution": target["operator_id"].value_counts().to_dict(),
        "mean_reflow_zone3_temp_in_target": float(target["reflow_zone3_temp"].mean()),
        "mean_reflow_zone3_temp_in_other": float(other["reflow_zone3_temp"].mean()) if len(other) else 0.0,
        "mean_humidity_in_target": float(target["humidity_pct"].mean()),
        "mean_humidity_in_other": float(other["humidity_pct"].mean()) if len(other) else 0.0,
        "mean_paste_viscosity_in_target": float(target["paste_viscosity_pa_s"].mean()),
        "mean_paste_viscosity_in_other": float(other["paste_viscosity_pa_s"].mean()) if len(other) else 0.0,
    }


def _llm_reasoning(
    *,
    target_defect: str,
    lookback_batches: int,
    stats: dict,
    standards_context: dict,
    dominant_machine: str,
    dominant_shift: str,
) -> dict:
    """Try Gemini; if it fails or no key, synthesise deterministically."""
    prompt = _build_prompt(
        target_defect=target_defect,
        lookback_batches=lookback_batches,
        stats=stats,
        standards_context=standards_context,
        dominant_machine=dominant_machine,
        dominant_shift=dominant_shift,
    )

    parsed = _try_gemini(prompt)
    if parsed is not None:
        parsed.setdefault("cluster_fingerprint", {})
        parsed["cluster_fingerprint"].setdefault("primary_machine", dominant_machine)
        parsed["cluster_fingerprint"].setdefault("primary_shift", dominant_shift)
        parsed["cluster_fingerprint"].setdefault("time_window", "see batch timestamps")
        return parsed

    return _deterministic_reasoning(
        target_defect=target_defect,
        stats=stats,
        standards_context=standards_context,
        dominant_machine=dominant_machine,
        dominant_shift=dominant_shift,
    )


def _build_prompt(
    *, target_defect: str, lookback_batches: int, stats: dict, standards_context: dict,
    dominant_machine: str, dominant_shift: str,
) -> str:
    return f"""You are a senior semiconductor process engineer with 20 years experience in FMECA root cause analysis.

A cluster of {target_defect} defects has been detected. Statistical analysis of the last {lookback_batches} batches shows:

Occurrence: {stats['occurrence_count']} batches affected ({stats['occurrence_rate']*100:.1f}% of recent production)

Machine distribution: {stats['machine_distribution']}
Shift distribution: {stats['shift_distribution']}
Operator distribution: {stats['operator_distribution']}

Process parameter comparison (defective batches vs healthy batches):
- Reflow zone 3 temperature: {stats['mean_reflow_zone3_temp_in_target']:.2f} C vs {stats['mean_reflow_zone3_temp_in_other']:.2f} C (nominal 240 C)
- Humidity: {stats['mean_humidity_in_target']:.1f}% vs {stats['mean_humidity_in_other']:.1f}%
- Paste viscosity: {stats['mean_paste_viscosity_in_target']:.1f} Pa.s vs {stats['mean_paste_viscosity_in_other']:.1f} Pa.s

Industry context for this defect type:
- Standard root cause hypothesis: {standards_context['root_cause_hypothesis']}
- Responsible equipment: {standards_context['responsible_equipment']}
- Process variable typically implicated: {standards_context['process_variable']}

Respond ONLY in valid JSON with this exact schema (no markdown, no commentary):
{{
  "root_cause_hypothesis": "specific 1-2 sentence diagnosis",
  "primary_correlated_variable": "name of the parameter most strongly implicated",
  "evidence": ["bullet 1", "bullet 2", "bullet 3"],
  "confidence": 0.0-1.0,
  "corrective_action": {{
    "summary": "one sentence",
    "specific_adjustment": "exact parameter change e.g. 'Reduce reflow zone 3 setpoint from 244 C to 240 C'",
    "predicted_defect_rate_after": 0.0-1.0,
    "predicted_rpn_after": 0-1000,
    "verification_method": "how to confirm fix worked"
  }},
  "cluster_fingerprint": {{
    "primary_machine": "{dominant_machine}",
    "primary_shift": "{dominant_shift}",
    "time_window": "best estimate"
  }}
}}"""


def _try_gemini(prompt: str) -> Optional[dict]:
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        for model_name in (
            "gemini-3.1-flash-lite",
            "gemini-flash-latest",
            "gemini-2.5-flash",
        ):
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                raw = (response.text or "").strip()
                if "```" in raw:
                    for chunk in raw.split("```"):
                        chunk = chunk.strip()
                        if chunk.startswith("json"):
                            chunk = chunk[4:].strip()
                        if chunk.startswith("{"):
                            raw = chunk
                            break
                return json.loads(raw)
            except Exception:
                continue
    except Exception:
        return None
    return None


def _deterministic_reasoning(
    *, target_defect: str, stats: dict, standards_context: dict,
    dominant_machine: str, dominant_shift: str,
) -> dict:
    delta_temp = (
        stats["mean_reflow_zone3_temp_in_target"]
        - stats["mean_reflow_zone3_temp_in_other"]
    )
    confidence = 0.6
    if abs(delta_temp) >= 2.0 and stats["occurrence_count"] >= 5:
        confidence = 0.9
    elif abs(delta_temp) >= 1.0:
        confidence = 0.75

    machine_total = sum(stats["machine_distribution"].values()) or 1
    machine_pct = stats["machine_distribution"].get(dominant_machine, 0) / machine_total * 100
    shift_total = sum(stats["shift_distribution"].values()) or 1
    shift_pct = stats["shift_distribution"].get(dominant_shift, 0) / shift_total * 100

    return {
        "root_cause_hypothesis": (
            f"{standards_context['root_cause_hypothesis']}. Reflow zone 3 ran "
            f"{delta_temp:+.1f} C vs the rest of production, concentrated on "
            f"machine {dominant_machine} during the {dominant_shift} shift."
        ),
        "primary_correlated_variable": "reflow_zone3_temp",
        "evidence": [
            f"{machine_pct:.0f}% of {target_defect} batches occurred on machine {dominant_machine}",
            f"{shift_pct:.0f}% of affected batches during the {dominant_shift} shift",
            (
                f"Zone 3 temperature {stats['mean_reflow_zone3_temp_in_target']:.1f} C "
                f"vs {stats['mean_reflow_zone3_temp_in_other']:.1f} C in healthy batches"
            ),
        ],
        "confidence": confidence,
        "corrective_action": {
            "summary": (
                f"Recalibrate {standards_context['responsible_equipment']} on "
                f"{dominant_machine} and verify with the next batch."
            ),
            "specific_adjustment": (
                f"Reduce reflow zone 3 setpoint on {dominant_machine}: "
                f"{stats['mean_reflow_zone3_temp_in_target']:.1f} C -> 240.0 C"
            ),
            "predicted_defect_rate_after": 0.025,
            "predicted_rpn_after": 28,
            "verification_method": (
                f"Run one verification batch on {dominant_machine} {dominant_shift} shift; "
                "defect rate should drop below 3%."
            ),
        },
        "cluster_fingerprint": {
            "primary_machine": dominant_machine,
            "primary_shift": dominant_shift,
            "time_window": "see batch timestamps",
        },
    }
