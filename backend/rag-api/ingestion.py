"""Read helpers for the Firestore ingestion manifest collection."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

INGESTION_DOC_TYPE = "10k"
FILES_COLLECTION = "files"


def manifest_doc_ref(
    db: firestore.Client,
    ticker: str,
    year: int,
    doc_type: str = INGESTION_DOC_TYPE,
) -> firestore.DocumentReference:
    """Return ingestion/{doc_type}/files/{TICKER}_{year}."""
    normalized_ticker = ticker.strip().upper()
    return (
        db.collection("ingestion")
        .document(doc_type)
        .collection(FILES_COLLECTION)
        .document(f"{normalized_ticker}_{year}")
    )


def _serialize_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()

    if hasattr(value, "timestamp"):
        return datetime.fromtimestamp(value.timestamp(), tz=timezone.utc).isoformat()

    if isinstance(value, dict):
        return {key: _serialize_value(item) for key, item in value.items()}

    if isinstance(value, list):
        return [_serialize_value(item) for item in value]

    return value


def serialize_ingestion_doc(doc_id: str, data: dict[str, Any] | None) -> dict[str, Any]:
    """Convert a Firestore ingestion manifest document to JSON-safe dict."""
    payload = _serialize_value(data or {})
    ticker, _, year_part = doc_id.partition("_")
    year = int(year_part) if year_part.isdigit() else None

    return {
        "id": doc_id,
        "ticker": payload.get("ticker") or ticker,
        "year": payload.get("year") or year,
        **payload,
    }


def get_ingestion_record(
    db: firestore.Client,
    ticker: str,
    year: int,
    doc_type: str = INGESTION_DOC_TYPE,
) -> dict[str, Any] | None:
    """Fetch a single ingestion manifest by ticker and year."""
    doc = manifest_doc_ref(db, ticker, year, doc_type).get()
    if not doc.exists:
        return None
    return serialize_ingestion_doc(doc.id, doc.to_dict())


def list_ingestion_records(
    db: firestore.Client,
    *,
    ticker: str | None = None,
    status: str | None = None,
    doc_type: str = INGESTION_DOC_TYPE,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """List ingestion manifest documents with optional ticker/status filters."""
    query = db.collection("ingestion").document(doc_type).collection(FILES_COLLECTION)

    if ticker:
        query = query.where(filter=FieldFilter("ticker", "==", ticker.strip().upper()))

    if status:
        query = query.where(filter=FieldFilter("status", "==", status.strip().lower()))

    query = query.limit(limit)
    docs = query.stream()

    records = [serialize_ingestion_doc(doc.id, doc.to_dict()) for doc in docs]
    records.sort(key=lambda record: (record.get("ticker") or "", record.get("year") or 0), reverse=True)
    return records


def already_ingested(
    db: firestore.Client,
    ticker: str,
    year: int,
    file_hash: str,
    doc_type: str = INGESTION_DOC_TYPE,
) -> bool:
    """Return True when the manifest shows a successful ingest for the same file hash."""
    record = get_ingestion_record(db, ticker, year, doc_type)
    if not record:
        return False
    return record.get("sha256") == file_hash and record.get("status") == "success"
