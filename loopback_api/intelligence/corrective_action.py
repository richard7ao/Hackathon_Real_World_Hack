"""Corrective action engine + verification loop.

Given a correlation result, simulate "applying" the action by sampling a
post-fix defect rate around the LLM's prediction. Compare RPN before/after
and report whether the fix is verified.
"""

from __future__ import annotations

import random
from datetime import datetime, timezone

from ..standards.fmeca import calculate_fmeca_assessment


def apply_corrective_action_and_verify(
    correlation_result: dict,
    verification_threshold: float = 0.05,
) -> dict:
    target_defect: str = correlation_result["target_defect"]
    action: dict = correlation_result["llm_analysis"]["corrective_action"]

    occurrence_before: int = correlation_result["statistical_findings"]["occurrence_count"]
    fmeca_before = calculate_fmeca_assessment(
        defect_pattern=target_defect,
        occurrence_in_recent_batches=occurrence_before,
        detection_confidence=0.91,
    )
    rpn_before = fmeca_before["fmeca"]["rpn"]

    predicted_rate = float(action.get("predicted_defect_rate_after", 0.03))
    actual_rate_after_fix = round(
        random.uniform(max(0.005, predicted_rate * 0.6), predicted_rate * 1.3),
        3,
    )

    primary_machine = (
        correlation_result["llm_analysis"].get("cluster_fingerprint", {}).get("primary_machine", "M3")
    )
    verification_batch = {
        "batch_id": f"B-{random.randint(2400, 2500)}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "machine_id": primary_machine,
        "applied_action": action.get("specific_adjustment", "(no adjustment specified)"),
        "wafer_count": 24,
        "defect_rate": actual_rate_after_fix,
        "wafers_passed": int(24 * (1 - actual_rate_after_fix)),
        "primary_defect_pattern": target_defect if actual_rate_after_fix > 0.03 else "none",
    }

    fix_verified = actual_rate_after_fix < verification_threshold

    fmeca_after = calculate_fmeca_assessment(
        defect_pattern=target_defect,
        occurrence_in_recent_batches=1 if fix_verified else max(2, occurrence_before // 4),
        detection_confidence=0.91,
    )
    rpn_after = fmeca_after["fmeca"]["rpn"]

    return {
        "action_applied": action,
        "verification_batch": verification_batch,
        "fix_verified": fix_verified,
        "rpn_before": rpn_before,
        "rpn_after": rpn_after,
        "rpn_improvement_pct": (
            round((rpn_before - rpn_after) / rpn_before * 100, 1) if rpn_before > 0 else 0
        ),
        "defect_rate_before": correlation_result["statistical_findings"]["occurrence_rate"],
        "defect_rate_after": actual_rate_after_fix,
        "below_mandatory_threshold": rpn_after < 100,
        "verification_timestamp": datetime.now(timezone.utc).isoformat(),
    }
