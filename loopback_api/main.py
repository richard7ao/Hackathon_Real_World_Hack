"""Loopback FastAPI service.

Exposes the Standards & Intelligence layer to the Lovable frontend per the
contract documented in ``Engineer_notes.md`` section 7.7.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .intelligence.corrective_action import apply_corrective_action_and_verify
from .intelligence.pattern_correlation import correlate_pattern
from .reporting.fmeca_report import generate_fmeca_report
from .standards.defect_map import VALID_PATTERNS
from .standards.fmeca import calculate_fmeca_assessment

REPO_ROOT = Path(__file__).resolve().parent.parent
BATCHES_PATH = REPO_ROOT / "data" / "batches.json"

app = FastAPI(title="Loopback API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class EnrichRequest(BaseModel):
    image_id: str
    defect_pattern: Literal[
        "center", "donut", "edge-loc", "edge-ring",
        "loc", "random", "scratch", "near-full", "none",
    ]
    confidence: float
    target_market: Literal["aerospace_class3", "automotive", "consumer"] = "aerospace_class3"
    occurrence_override: Optional[int] = None


class CorrelateRequest(BaseModel):
    target_defect: str
    lookback_batches: int = 50


class FixAndVerifyRequest(BaseModel):
    target_defect: str


class ReportRequest(BaseModel):
    target_defect: str


def _load_batches() -> list[dict]:
    if not BATCHES_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail=(
                f"{BATCHES_PATH} missing. Run "
                "`python -m loopback_api.data_sim.batch_simulator` to generate it."
            ),
        )
    with BATCHES_PATH.open() as f:
        return json.load(f)


def _occurrence(defect_pattern: str, batches: list[dict], window: int = 50) -> int:
    return sum(
        1 for b in batches[-window:] if b["primary_defect_pattern"] == defect_pattern
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "loopback",
        "batches_loaded": BATCHES_PATH.exists(),
        "valid_patterns": VALID_PATTERNS,
    }


@app.get("/batches")
async def get_batches(limit: int = 200):
    batches = _load_batches()
    return batches[-limit:]


@app.post("/enrich")
async def enrich_defect(req: EnrichRequest):
    try:
        batches = _load_batches()
        occurrence = (
            req.occurrence_override
            if req.occurrence_override is not None
            else _occurrence(req.defect_pattern, batches)
        )
        assessment = calculate_fmeca_assessment(
            defect_pattern=req.defect_pattern,
            occurrence_in_recent_batches=occurrence,
            detection_confidence=req.confidence,
            target_market=req.target_market,
        )
        return {
            "image_id": req.image_id,
            "assessment": assessment,
            "next_action": (
                "correlate" if assessment["fmeca"]["mandatory_corrective_action"] else "monitor"
            ),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/correlate")
async def correlate(req: CorrelateRequest):
    try:
        return correlate_pattern(
            batches_path=str(BATCHES_PATH),
            target_defect=req.target_defect,
            lookback_batches=req.lookback_batches,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/fix-and-verify")
async def fix_and_verify(req: FixAndVerifyRequest):
    try:
        correlation = correlate_pattern(
            batches_path=str(BATCHES_PATH),
            target_defect=req.target_defect,
        )
        if "error" in correlation:
            raise HTTPException(status_code=400, detail=correlation["error"])
        verification = apply_corrective_action_and_verify(correlation)
        return {"correlation": correlation, "verification": verification}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/report")
async def generate_report(req: ReportRequest):
    try:
        batches = _load_batches()
        occurrence = _occurrence(req.target_defect, batches)
        assessment = calculate_fmeca_assessment(
            defect_pattern=req.target_defect,
            occurrence_in_recent_batches=occurrence,
            detection_confidence=0.91,
        )
        correlation = correlate_pattern(
            batches_path=str(BATCHES_PATH),
            target_defect=req.target_defect,
        )
        if "error" in correlation:
            raise HTTPException(status_code=400, detail=correlation["error"])
        verification = apply_corrective_action_and_verify(correlation)

        pdf_path = generate_fmeca_report(
            fmeca_assessment=assessment,
            correlation_result=correlation,
            verification_result=verification,
        )
        return FileResponse(
            path=pdf_path,
            filename=Path(pdf_path).name,
            media_type="application/pdf",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
