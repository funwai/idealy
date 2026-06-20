"""Firebase / Firestore client initialization for the RAG API."""

from __future__ import annotations

import base64
import json
import os
from pathlib import Path

from google.cloud import firestore
from google.oauth2 import service_account


def _load_service_account_info(raw_value: str) -> dict:
    """Load service account credentials from a file path, JSON string, or base64 JSON."""
    trimmed = raw_value.strip()
    if not trimmed:
        raise ValueError("FIREBASE_SERVICE_ACCOUNT_JSON is empty")

    path = Path(trimmed)
    if path.is_file():
        return json.loads(path.read_text(encoding="utf-8"))

    if trimmed.startswith("{"):
        return json.loads(trimmed)

    decoded = base64.b64decode(trimmed).decode("utf-8")
    return json.loads(decoded)


def create_firestore_client(
    service_account_value: str | None = None,
    project_id: str | None = None,
) -> firestore.Client:
    """
    Create a Firestore client.

    Credential resolution order:
    1. Explicit service_account_value argument
    2. FIREBASE_SERVICE_ACCOUNT_JSON environment variable
    3. Application default credentials
    """
    raw = service_account_value or os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    resolved_project = project_id or os.getenv("GCP_PROJECT_ID")

    if raw:
        info = _load_service_account_info(raw)
        credentials = service_account.Credentials.from_service_account_info(info)
        return firestore.Client(
            project=resolved_project or info.get("project_id"),
            credentials=credentials,
        )

    if resolved_project:
        return firestore.Client(project=resolved_project)

    return firestore.Client()
