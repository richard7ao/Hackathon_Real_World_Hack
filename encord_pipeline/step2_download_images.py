"""Step 2 — Download every image referenced by the project to local disk.

Uses :meth:`LabelRowV2.initialise_labels` with ``include_signed_url=True`` to
get a short-lived signed URL (the documented Encord SDK pattern). Each image is
normalised to PNG and written under ``data/encord_images/``.
"""

from __future__ import annotations

import io
import json
import sys
import time
from typing import Optional

import requests
from PIL import Image

from .constants import (
    IMAGE_DIR,
    MANIFEST_PATH,
    PROJECT_ID,
)
from .encord_client import get_project

REQUEST_TIMEOUT = 30
MAX_RETRIES = 3


def _safe_filename(label_hash: str, data_title: str) -> str:
    base = (data_title or "untitled").replace("/", "_").replace(" ", "_")
    return f"{label_hash[:8]}_{base}"


def _ensure_png_path(name: str) -> str:
    if name.lower().endswith((".png", ".jpg", ".jpeg")):
        return name
    return name + ".png"


def _fetch_signed_url(label_row) -> Optional[str]:
    """Initialise labels with signed URL and return the link."""
    try:
        label_row.initialise_labels(include_signed_url=True)
    except TypeError:
        label_row.initialise_labels()
    url = getattr(label_row, "data_link", None)
    if url:
        return url
    try:
        storage_item = label_row.get_storage_item(get_signed_urls=True)
        return storage_item.get_signed_url()
    except Exception:
        return None


def _download(url: str) -> bytes:
    last_exc: Optional[Exception] = None
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(url, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            return response.content
        except Exception as exc:
            last_exc = exc
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Failed after {MAX_RETRIES} retries: {last_exc}")


def main() -> None:
    project = get_project(PROJECT_ID)
    label_rows = project.list_label_rows_v2()
    print(f"Downloading images for {len(label_rows)} label rows...")

    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []
    success = 0
    failed = 0

    for index, label_row in enumerate(label_rows, start=1):
        title = label_row.data_title or label_row.label_hash
        prefix = f"[{index:3d}/{len(label_rows)}]"
        try:
            url = _fetch_signed_url(label_row)
            if not url:
                raise RuntimeError("no signed url returned")

            payload = _download(url)
            image = Image.open(io.BytesIO(payload)).convert("RGB")
            local_name = _ensure_png_path(
                _safe_filename(label_row.label_hash, title)
            )
            local_path = IMAGE_DIR / local_name
            image.save(local_path, format="PNG")

            manifest.append(
                {
                    "label_hash": label_row.label_hash,
                    "data_hash": label_row.data_hash,
                    "data_title": title,
                    "local_path": str(local_path),
                    "status": str(label_row.annotation_task_status),
                    "error": None,
                }
            )
            success += 1
            print(f"{prefix} {title[:45]:<45} -> {local_name}")
        except Exception as exc:
            manifest.append(
                {
                    "label_hash": label_row.label_hash,
                    "data_hash": getattr(label_row, "data_hash", None),
                    "data_title": title,
                    "local_path": None,
                    "status": str(label_row.annotation_task_status),
                    "error": str(exc),
                }
            )
            failed += 1
            print(f"{prefix} {title[:45]:<45} ! {exc}", file=sys.stderr)

    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))
    print(f"\nDownloaded {success}, failed {failed}")
    print(f"Manifest: {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
