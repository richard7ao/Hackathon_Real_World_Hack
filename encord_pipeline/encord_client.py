"""Authenticated Encord SDK client + project helper.

Supports three credential paths, in priority order:

1. ``ENCORD_SSH_KEY_FILE`` — absolute path to the private key file.
2. ``ENCORD_SSH_KEY``      — raw private key contents.
3. ``ENCORD_API_KEY``      — service-account bearer token.

The PRD mentions ``ENCORD_API_KEY`` as a "Encord API key", but the SDK's
``create_with_api_key`` method does not exist. The Encord Python SDK accepts a
bearer token via ``EncordUserClient.create_with_bearer_token`` for service
accounts; we use that path when only ``ENCORD_API_KEY`` is set.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from encord import EncordUserClient

from .constants import PROJECT_ID

ENCORD_DOMAIN = os.environ.get("ENCORD_DOMAIN", "https://api.encord.com")


class MissingEncordCredentials(RuntimeError):
    """Raised when no Encord auth env var is configured."""


def _client_from_ssh_file(path: str) -> EncordUserClient:
    key_path = Path(path).expanduser()
    if not key_path.exists():
        raise MissingEncordCredentials(
            f"ENCORD_SSH_KEY_FILE points to {key_path}, which does not exist"
        )
    return EncordUserClient.create_with_ssh_private_key(
        ssh_private_key_path=str(key_path),
        domain=ENCORD_DOMAIN,
    )


def _client_from_ssh_inline(raw_key: str) -> EncordUserClient:
    return EncordUserClient.create_with_ssh_private_key(
        ssh_private_key=raw_key,
        domain=ENCORD_DOMAIN,
    )


def _client_from_bearer(token: str) -> EncordUserClient:
    return EncordUserClient.create_with_bearer_token(
        token=token,
        domain=ENCORD_DOMAIN,
    )


_HEX_CHARS = set("0123456789abcdefABCDEF")


def _looks_like_short_api_key(value: str) -> bool:
    """The Encord UI shows a 64-char hex 'API key' identifier next to a key.

    That string is NOT a valid SDK credential — it is a fingerprint of the
    keypair. The SDK requires the actual SSH private key contents (or a path
    to the .txt file Encord downloaded when the key was generated).
    """
    return len(value) <= 80 and all(ch in _HEX_CHARS for ch in value)


def get_user_client() -> EncordUserClient:
    """Return an authenticated EncordUserClient or raise a helpful error."""
    key_file = os.environ.get("ENCORD_SSH_KEY_FILE")
    if key_file:
        return _client_from_ssh_file(key_file)

    raw_key = os.environ.get("ENCORD_SSH_KEY")
    if raw_key:
        return _client_from_ssh_inline(raw_key)

    api_key = os.environ.get("ENCORD_API_KEY", "").strip()
    if api_key:
        if _looks_like_short_api_key(api_key):
            raise MissingEncordCredentials(
                "ENCORD_API_KEY looks like the short hex identifier shown next "
                "to the key in the Encord UI, not the actual private key. The "
                "SDK needs the contents of the .txt file Encord downloaded "
                "when the key was generated. Either:\n"
                "  - set ENCORD_SSH_KEY_FILE=/absolute/path/to/that/file.txt, or\n"
                "  - paste the multi-line private key block into ENCORD_SSH_KEY."
            )
        return _client_from_bearer(api_key)

    raise MissingEncordCredentials(
        "Set one of ENCORD_SSH_KEY_FILE, ENCORD_SSH_KEY, or ENCORD_API_KEY "
        "before running this script."
    )


def get_project(project_id: Optional[str] = None):
    """Return the Wafer AI project (or another project_id) using env auth."""
    return get_user_client().get_project(project_id or PROJECT_ID)
