"""Hybrid wafer-defect classifier (port 8001).

POST /classify  multipart upload field name ``file``
   -> {"image_id": "...", "defect_pattern": "...", "confidence": 0..1,
       "model_used": "loopback_cnn_v1" | "gemini_fallback" | "demo_mode"}

Loads the ResNet18 trained at ``models/wafer_classifier.pt`` and routes:
- CNN prediction with confidence >= ``CONFIDENCE_THRESHOLD`` -> CNN
- otherwise -> Gemini 3.1 flash-lite (if GOOGLE_API_KEY is set)
- otherwise -> demo-mode "none"

The output ``defect_pattern`` is one of the nine ``VALID_PATTERNS`` strings
that the Loopback API's /enrich endpoint accepts.
"""

from __future__ import annotations

import io
import json
import logging
import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

REPO_ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = REPO_ROOT / "models" / "wafer_classifier.pt"
CONFIDENCE_THRESHOLD = float(os.environ.get("LOOPBACK_CNN_CONF_THRESHOLD", "0.75"))

VALID_PATTERNS = [
    "center", "donut", "edge-loc", "edge-ring",
    "loc", "random", "scratch", "near-full", "none",
]


class _CnnState:
    """Lazy holder for the optional CNN dependencies + model checkpoint."""

    def __init__(self) -> None:
        self.ready = False
        self.model = None
        self.transform = None
        self.labels = VALID_PATTERNS
        self.device = None
        self.error: Optional[str] = None

    def load(self) -> None:
        if self.ready or self.error:
            return
        if not MODEL_PATH.exists():
            self.error = f"Checkpoint not found at {MODEL_PATH}"
            logger.warning(self.error)
            return
        try:
            import torch
            import torch.nn as nn
            from torchvision import models, transforms

            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            checkpoint = torch.load(MODEL_PATH, map_location=device, weights_only=False)
            labels = list(checkpoint.get("labels") or VALID_PATTERNS)

            model = models.resnet18(weights=None)
            model.fc = nn.Linear(model.fc.in_features, len(labels))
            model.load_state_dict(checkpoint["model_state_dict"])
            model.to(device).eval()

            self.model = model
            self.transform = transforms.Compose(
                [
                    transforms.Resize((224, 224)),
                    transforms.ToTensor(),
                    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
                ]
            )
            self.labels = labels
            self.device = device
            self.ready = True
            logger.info("CNN loaded with %d classes on %s", len(labels), device)
        except Exception as exc:
            self.error = f"Failed to load CNN: {type(exc).__name__}: {exc}"
            logger.warning(self.error)


_cnn = _CnnState()
_cnn.load()


def _normalise_pattern(value: str) -> str:
    text = (value or "").strip().lower()
    if text in VALID_PATTERNS:
        return text
    for known in VALID_PATTERNS:
        if known in text or text in known:
            return known
    return "none"


def _cnn_predict(image: Image.Image) -> Optional[dict]:
    if not _cnn.ready:
        return None
    try:
        import torch

        with torch.no_grad():
            tensor = _cnn.transform(image).unsqueeze(0).to(_cnn.device)
            logits = _cnn.model(tensor)
            probs = torch.softmax(logits, dim=1)
            confidence_t, idx_t = probs.max(1)
            return {
                "defect_pattern": _cnn.labels[int(idx_t.item())],
                "confidence": float(confidence_t.item()),
                "model_used": "loopback_cnn_v1",
                "all_probabilities": {
                    _cnn.labels[i]: float(probs[0, i].item())
                    for i in range(len(_cnn.labels))
                },
            }
    except Exception as exc:
        logger.warning("CNN inference failed: %s", exc)
        return None


GEMINI_PROMPT = """You are an expert semiconductor process engineer.
You are analysing a wafer defect map image.

COLOUR CODING:
- BRIGHT GREEN pixels = GOOD dies (passed electrical test)
- BRIGHT RED pixels = FAILED dies (defective)
- DARK / GREY / BLACK = wafer edge boundary or no-die area

YOUR TASK: Classify the SPATIAL PATTERN of the red (failed) dies.

PATTERN OPTIONS: center, donut, edge-loc, edge-ring, loc, random, scratch, near-full, none.

Respond with ONLY this JSON object, no other text, no markdown fences:
{"defect_pattern": "<one of the 9>", "confidence": 0.0-1.0}"""


def _gemini_predict(image: Image.Image) -> Optional[dict]:
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        import base64

        import google.generativeai as genai

        genai.configure(api_key=api_key)

        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        part = {"mime_type": "image/png", "data": base64.b64encode(buffer.getvalue()).decode()}

        for model_name in (
            "gemini-3.1-flash-lite",
            "gemini-flash-latest",
            "gemini-2.5-flash",
        ):
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content([part, GEMINI_PROMPT])
                raw = (response.text or "").strip()
                if "```" in raw:
                    for chunk in raw.split("```"):
                        chunk = chunk.strip()
                        if chunk.startswith("json"):
                            chunk = chunk[4:].strip()
                        if chunk.startswith("{"):
                            raw = chunk
                            break
                data = json.loads(raw)
                return {
                    "defect_pattern": _normalise_pattern(data.get("defect_pattern", "")),
                    "confidence": max(0.0, min(1.0, float(data.get("confidence", 0.5)))),
                    "model_used": "gemini_fallback",
                }
            except Exception as exc:
                logger.warning("Gemini %s failed: %s", model_name, exc)
                continue
    except Exception as exc:
        logger.warning("Gemini fallback unavailable: %s", exc)
    return None


app = FastAPI(title="Loopback Classifier", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "loopback-classifier",
        "cnn_loaded": _cnn.ready,
        "cnn_error": _cnn.error,
        "gemini_available": bool(os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")),
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "labels": _cnn.labels,
    }


@app.post("/classify")
async def classify(file: UploadFile = File(...)):
    try:
        payload = await file.read()
        image = Image.open(io.BytesIO(payload)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Cannot decode image: {exc}")

    image_id = file.filename or f"wafer_{uuid.uuid4().hex[:8]}"

    cnn_result = _cnn_predict(image)
    if cnn_result and cnn_result["confidence"] >= CONFIDENCE_THRESHOLD:
        cnn_result["image_id"] = image_id
        return cnn_result

    gemini_result = _gemini_predict(image)
    if gemini_result is not None:
        gemini_result["image_id"] = image_id
        if cnn_result is not None:
            gemini_result["cnn_secondary"] = {
                "defect_pattern": cnn_result["defect_pattern"],
                "confidence": cnn_result["confidence"],
            }
        return gemini_result

    if cnn_result is not None:
        cnn_result["image_id"] = image_id
        cnn_result["model_used"] = "loopback_cnn_v1_low_confidence"
        return cnn_result

    return {
        "image_id": image_id,
        "defect_pattern": "none",
        "confidence": 0.0,
        "model_used": "demo_mode",
    }
