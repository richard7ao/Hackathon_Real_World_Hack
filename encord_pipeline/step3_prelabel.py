"""Step 3 — Pre-label every image with Gemini and push the answer back to Encord.

Reads :data:`MANIFEST_PATH`, classifies each PNG with ``gemini-2.5-flash``
(falling back to ``2.0-flash`` then ``1.5-flash``), and writes:

* a row to :data:`PRELABELS_CSV` capturing the prediction and outcome
* the predicted radio option onto the corresponding label row in Encord using
  the canonical SDK pattern (``ontology_structure.get_child_by_title`` ->
  ``Classification.create_instance`` -> ``set_answer`` -> ``set_for_frames``)
"""

from __future__ import annotations

import base64
import csv
import io
import json
import os
import time
from collections import Counter
from dataclasses import dataclass
from typing import Optional

from PIL import Image

import google.generativeai as genai
from encord.objects import Classification
from encord.objects.options import Option

from .constants import (
    CLASSIFICATION_TITLE,
    GEMINI_MODEL_FALLBACKS,
    GEMINI_MODEL_PRIMARY,
    MANIFEST_PATH,
    PATTERN_HUMAN_LABELS,
    PRELABELS_CSV,
    PROJECT_ID,
    VALID_PATTERNS,
)
from .encord_client import get_project

CLASSIFICATION_PROMPT = """You are an expert semiconductor process engineer.
You are analysing a wafer defect map image.

COLOUR CODING:
- BRIGHT GREEN pixels = GOOD dies (passed electrical test)
- BRIGHT RED pixels = FAILED dies (defective)
- DARK / GREY / BLACK = wafer edge boundary or no-die area

YOUR TASK: Classify the SPATIAL PATTERN of the red (failed) dies.

PATTERN DEFINITIONS:
1. "center"    — Failed dies form a circular cluster in the CENTRE of the wafer
2. "donut"     — Failed dies form a RING inside the wafer (not touching the edge)
3. "edge-loc"  — Failed dies are concentrated in ONE localised spot at the wafer edge
4. "edge-ring" — Failed dies form a COMPLETE (or near-complete) ring at the wafer BOUNDARY
5. "loc"       — Failed dies form a localised cluster that does NOT match center/donut/edge patterns
6. "random"    — Failed dies are SCATTERED with no clear spatial pattern
7. "scratch"   — Failed dies form a STRAIGHT LINE or gentle CURVE (mechanical damage)
8. "near-full" — MORE THAN 60% of dies are red/failing (catastrophic failure)
9. "none"      — Wafer is CLEAN: very few red pixels, no meaningful defect pattern

DECISION RULES:
- If <5% of dies are red and scattered: choose "none"
- If >60% of dies are red: choose "near-full"
- A scratch is always linear — look for a line or arc, not a blob
- Edge-ring is a full ring; edge-loc is a single spot at one edge location
- When unsure between two patterns, pick the one where red pixels cluster more strongly

CRITICAL: Respond with ONLY this JSON object, no other text, no markdown fences:
{
  "defect_pattern": "<exactly one of the 9 options>",
  "confidence": <float between 0.0 and 1.0>,
  "reasoning": "<one sentence describing the spatial distribution you observed>",
  "alternative": "<second most likely pattern, or null>"
}"""


@dataclass
class GeminiResult:
    defect_pattern: str
    confidence: float
    reasoning: str
    alternative: Optional[str]
    model: str
    error: Optional[str] = None


def _select_gemini_model() -> "genai.GenerativeModel":
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit(
            "Set GOOGLE_API_KEY (or GEMINI_API_KEY) before running pre-labelling."
        )
    genai.configure(api_key=api_key)

    candidates = [GEMINI_MODEL_PRIMARY, *GEMINI_MODEL_FALLBACKS]
    last_error: Optional[Exception] = None
    for name in candidates:
        try:
            model = genai.GenerativeModel(name)
            probe = model.generate_content("Reply with READY")
            if "READY" in (probe.text or "").upper():
                print(f"Using Gemini model: {name}")
                return model
        except Exception as exc:
            last_error = exc
            print(f"  {name} unavailable: {exc}")
    raise SystemExit(f"No Gemini model usable: {last_error}")


def _image_to_part(image: Image.Image) -> dict:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return {
        "mime_type": "image/png",
        "data": base64.b64encode(buffer.getvalue()).decode(),
    }


def _normalise_pattern(value: str) -> str:
    value = (value or "").strip().lower()
    if value in VALID_PATTERNS:
        return value
    for known in VALID_PATTERNS:
        if known in value or value in known:
            return known
    return "none"


def _parse_response(text: str) -> dict:
    raw = (text or "").strip()
    if "```" in raw:
        for chunk in raw.split("```"):
            chunk = chunk.strip()
            if chunk.startswith("json"):
                chunk = chunk[4:].strip()
            if chunk.startswith("{"):
                raw = chunk
                break
    return json.loads(raw)


def classify(model, image: Image.Image, retries: int = 3) -> GeminiResult:
    last_exc: Optional[Exception] = None
    for attempt in range(retries):
        try:
            response = model.generate_content([_image_to_part(image), CLASSIFICATION_PROMPT])
            data = _parse_response(response.text)
            return GeminiResult(
                defect_pattern=_normalise_pattern(data.get("defect_pattern", "")),
                confidence=max(0.0, min(1.0, float(data.get("confidence", 0.5)))),
                reasoning=str(data.get("reasoning", "")),
                alternative=data.get("alternative"),
                model=model.model_name if hasattr(model, "model_name") else "gemini",
            )
        except json.JSONDecodeError as exc:
            last_exc = exc
            time.sleep(1.0 * (attempt + 1))
        except Exception as exc:
            last_exc = exc
            time.sleep(1.5 * (attempt + 1))
    return GeminiResult(
        defect_pattern="none",
        confidence=0.0,
        reasoning="",
        alternative=None,
        model=getattr(model, "model_name", "gemini"),
        error=f"{type(last_exc).__name__}: {last_exc}",
    )


def _resolve_classification(label_row) -> Classification:
    structure = label_row.ontology_structure
    classification = structure.get_child_by_title(
        title=CLASSIFICATION_TITLE, type_=Classification
    )
    if classification is None:
        for cls in structure.classifications:
            attrs = cls.attributes
            if attrs and (
                "defect" in attrs[0].name.lower() or "pattern" in attrs[0].name.lower()
            ):
                return cls
        raise RuntimeError(
            "Cannot find a 'Defect Pattern' classification on the project ontology."
        )
    return classification


def _resolve_option(classification: Classification, pattern: str) -> Option:
    label = PATTERN_HUMAN_LABELS.get(pattern, pattern)
    option = classification.get_child_by_title(title=label, type_=Option)
    if option is not None:
        return option
    option = classification.get_child_by_title(title=pattern, type_=Option)
    if option is not None:
        return option
    attr = classification.attributes[0]
    for candidate in attr.options:
        if getattr(candidate, "value", None) == pattern:
            return candidate
        if getattr(candidate, "label", "").strip().lower().startswith(pattern):
            return candidate
    raise RuntimeError(
        f"Cannot map pattern '{pattern}' to an option in the ontology"
    )


def _write_prelabel(label_row, pattern: str, confidence: float) -> bool:
    try:
        label_row.initialise_labels()
        classification = _resolve_classification(label_row)
        option = _resolve_option(classification, pattern)

        instance = classification.create_instance()
        instance.set_answer(answer=option)
        instance.set_for_frames(
            frames=0,
            manual_annotation=False,
            confidence=float(confidence),
        )
        label_row.add_classification_instance(instance, force=True)
        label_row.save()
        return True
    except Exception as exc:
        print(f"    write error: {exc}")
        return False


def main() -> None:
    if not MANIFEST_PATH.exists():
        raise SystemExit(
            f"{MANIFEST_PATH} not found. Run step2_download_images first."
        )

    manifest = json.loads(MANIFEST_PATH.read_text())
    pending = [item for item in manifest if item.get("local_path") and not item.get("error")]
    if not pending:
        raise SystemExit("Manifest has no downloaded images to label.")

    model = _select_gemini_model()
    project = get_project(PROJECT_ID)
    rows_by_hash = {row.label_hash: row for row in project.list_label_rows_v2()}

    PRELABELS_CSV.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "filename",
        "label_hash",
        "defect_pattern",
        "confidence",
        "reasoning",
        "alternative",
        "encord_written",
        "model",
        "error",
    ]
    counts: Counter[str] = Counter()
    written = 0
    errors = 0

    with PRELABELS_CSV.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()

        for index, item in enumerate(pending, start=1):
            label_hash = item["label_hash"]
            local_path = item["local_path"]
            filename = item["data_title"]
            prefix = f"[{index:3d}/{len(pending)}]"

            try:
                image = Image.open(local_path).convert("RGB")
            except Exception as exc:
                print(f"{prefix} {filename[:45]:<45} ! cannot open: {exc}")
                writer.writerow(
                    {
                        "filename": filename,
                        "label_hash": label_hash,
                        "defect_pattern": "none",
                        "confidence": 0.0,
                        "reasoning": "",
                        "alternative": None,
                        "encord_written": False,
                        "model": "",
                        "error": f"open: {exc}",
                    }
                )
                errors += 1
                continue

            result = classify(model, image)
            counts[result.defect_pattern] += 1

            label_row = rows_by_hash.get(label_hash)
            wrote = False
            if label_row is None:
                msg = "label row missing"
            else:
                wrote = _write_prelabel(label_row, result.defect_pattern, result.confidence)
                msg = "saved" if wrote else "write failed"

            print(
                f"{prefix} {filename[:40]:<40} -> "
                f"{result.defect_pattern:<10} ({result.confidence:.2f}) {msg}"
            )

            if wrote:
                written += 1
            if result.error:
                errors += 1

            writer.writerow(
                {
                    "filename": filename,
                    "label_hash": label_hash,
                    "defect_pattern": result.defect_pattern,
                    "confidence": round(result.confidence, 4),
                    "reasoning": result.reasoning,
                    "alternative": result.alternative,
                    "encord_written": wrote,
                    "model": result.model,
                    "error": result.error,
                }
            )
            fh.flush()
            time.sleep(0.4)

    print("\nPattern distribution:")
    for pattern in VALID_PATTERNS:
        bar = "#" * counts.get(pattern, 0)
        print(f"  {pattern:<10} {counts.get(pattern, 0):3d}  {bar}")

    print(f"\nProcessed: {len(pending)}, written: {written}, errors: {errors}")
    print(f"CSV: {PRELABELS_CSV}")


if __name__ == "__main__":
    main()
