"""List Pinecone filings with unusually few chunks.

Vector ids are {ticker}:{year}:10K:{chunk}. A full 10-K is usually a few
hundred chunks. Counts far below that are almost always an exhibit that was
saved as the 10-K (subsidiaries list, consent, incentive plan, and so on).

Usage (from backend/rag-api, with .env loaded):

    python check_low_chunk_filings.py
    python check_low_chunk_filings.py --max-chunks 50
"""

from __future__ import annotations

import argparse
import os
import sys
from collections import defaultdict

from dotenv import load_dotenv
from pinecone import Pinecone

load_dotenv()

NAMESPACE = os.getenv("PINECONE_NAMESPACE", "10k")
DEFAULT_MAX_CHUNKS = 50


def list_vector_ids(index, namespace: str) -> list[str]:
    ids: list[str] = []
    for batch in index.list(namespace=namespace, limit=100):
        if isinstance(batch, (list, tuple)):
            ids.extend(str(item) for item in batch)
        elif batch is not None:
            ids.append(str(batch))
    return ids


def filing_key(vector_id: str) -> str:
    """ABT:2025:10K:0 -> ABT:2025:10K. Anything else is returned unchanged."""
    parts = vector_id.split(":")
    if len(parts) >= 4 and parts[-1].isdigit():
        return ":".join(parts[:-1])
    return vector_id


def count_filings(vector_ids: list[str]) -> dict[str, int]:
    counts: dict[str, int] = defaultdict(int)
    for vector_id in vector_ids:
        counts[filing_key(vector_id)] += 1
    return dict(counts)


def first_chunk_preview(index, filing: str, namespace: str, limit: int = 140) -> str:
    vector_id = f"{filing}:0"
    fetched = index.fetch(ids=[vector_id], namespace=namespace)
    vectors = getattr(fetched, "vectors", None) or {}
    vector = vectors.get(vector_id)
    if vector is None:
        return "(chunk 0 missing)"
    text = ((getattr(vector, "metadata", None) or {}).get("text")) or ""
    return " ".join(text.split())[:limit]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--max-chunks",
        type=int,
        default=DEFAULT_MAX_CHUNKS,
        help="Flag filings with fewer chunks than this (default: 50).",
    )
    args = parser.parse_args()

    index_name = os.environ["PINECONE_INDEX_NAME"]
    index = Pinecone(api_key=os.environ["PINECONE_API_KEY"]).Index(index_name)
    vector_ids = list_vector_ids(index, NAMESPACE)
    counts = count_filings(vector_ids)
    sizes = sorted(counts.values())
    low = sorted(
        ((count, filing) for filing, count in counts.items() if count < args.max_chunks),
        key=lambda item: (item[0], item[1]),
    )

    print(f"index={index_name} namespace={NAMESPACE}")
    print(f"vectors={len(vector_ids)} filings={len(counts)}")
    if sizes:
        mid = sizes[len(sizes) // 2]
        print(f"chunks per filing: min={sizes[0]} median={mid} max={sizes[-1]}")
    print(f"filings under {args.max_chunks} chunks: {len(low)}")
    for count, filing in low:
        preview = first_chunk_preview(index, filing, NAMESPACE)
        print(f"{count:4d}  {filing}  {preview}")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    raise SystemExit(main())
