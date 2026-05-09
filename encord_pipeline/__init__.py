"""Loopback Encord pipeline package.

Importing this package auto-loads ``.env.local`` from the repo root (if present)
so that every ``python -m encord_pipeline.stepX`` invocation can pick up the
``ENCORD_*`` and ``GOOGLE_API_KEY`` variables without an explicit ``source``.
"""

from __future__ import annotations

import os
from pathlib import Path


def _load_env_local() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    env_path = repo_root / ".env.local"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_env_local()
