"""Shared constants for the Loopback Encord pipeline.

The nine `VALID_PATTERNS` strings here are the wire contract with Engineer 2's
`/enrich` endpoint (see Engineer_notes.md). They MUST match the option `value`
fields stored in Encord and the literal type accepted by the FastAPI service.
"""

from pathlib import Path

PROJECT_ID = "66d359dc-24f7-4a05-86ae-0f4bb426e74e"
PROJECT_NAME = "Wafer AI"

CLASSIFICATION_TITLE = "Defect Pattern"
CONFIDENCE_TITLE = "Annotator Confidence"

VALID_PATTERNS = [
    "center",
    "donut",
    "edge-loc",
    "edge-ring",
    "loc",
    "random",
    "scratch",
    "near-full",
    "none",
]

PATTERN_HUMAN_LABELS = {
    "center": "Center — cluster in wafer centre",
    "donut": "Donut — ring inside wafer",
    "edge-loc": "Edge-Loc — localised spot at edge",
    "edge-ring": "Edge-Ring — ring around wafer edge",
    "loc": "Loc — localised cluster",
    "random": "Random — no spatial pattern",
    "scratch": "Scratch — linear or arc pattern",
    "near-full": "Near-Full — majority of wafer failing",
    "none": "None — clean wafer",
}

CONFIDENCE_OPTIONS = ["certain", "likely", "unsure"]

GEMINI_MODEL_PRIMARY = "gemini-2.5-flash"
GEMINI_MODEL_FALLBACKS = ["gemini-2.0-flash", "gemini-1.5-flash"]

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
IMAGE_DIR = DATA_DIR / "encord_images"
MODELS_DIR = REPO_ROOT / "models"

INSPECTION_PATH = DATA_DIR / "inspection_output.json"
MANIFEST_PATH = DATA_DIR / "image_manifest.json"
PRELABELS_CSV = DATA_DIR / "encord_prelabels.csv"
REVIEW_QUEUE_CSV = DATA_DIR / "review_queue.csv"
TRAINING_LABELS_CSV = DATA_DIR / "training_labels.csv"
TRAIN_SPLIT_CSV = DATA_DIR / "train_split.csv"
VAL_SPLIT_CSV = DATA_DIR / "val_split.csv"
TRAINING_HISTORY_PATH = DATA_DIR / "training_history.json"
MODEL_METRICS_PATH = DATA_DIR / "model_metrics.json"
CLASSIFIER_LABELS_CSV = DATA_DIR / "encord_labels.csv"
MODEL_PATH = MODELS_DIR / "wafer_classifier.pt"
