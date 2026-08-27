"""Retrieve 10-K chunks from Pinecone and hydrate page text.

LangChain's PineconeVectorStore keeps only matches whose metadata includes
`text`. Older ingestions stored ticker/year/source/chunk but not the chunk
body, which made /api/ask look like an empty index. This module queries
Pinecone directly and fills missing text from Cloud Storage using the same
splitter as RAG_Pinecone Ingestion.ipynb.
"""

from __future__ import annotations

import logging
from typing import Any, Callable, Dict, List

from google.cloud import storage
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)

CHUNK_SIZE = 1200
CHUNK_OVERLAP = 150
CHUNK_SEPARATORS = ["\n\n", "\n", " ", ""]


def chunk_10k_text(text: str) -> List[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=CHUNK_SEPARATORS,
    )
    return splitter.split_text(text)


def parse_gs_path(gs_path: str) -> tuple[str, str]:
    without = gs_path.replace("gs://", "", 1)
    bucket, _, obj = without.partition("/")
    return bucket, obj


class ChunkTextResolver:
    """Resolve chunk text from Pinecone metadata, falling back to GCS."""

    def __init__(self, storage_client: storage.Client | None = None):
        self.storage_client = storage_client
        self._chunks_by_source: Dict[str, List[str]] = {}

    def resolve(self, metadata: dict[str, Any] | None) -> str:
        meta = metadata or {}
        existing = meta.get("text")
        if isinstance(existing, str) and existing.strip():
            return existing

        source = meta.get("source")
        chunk_idx = meta.get("chunk")
        if source is None or chunk_idx is None:
            return ""

        chunks = self._chunks_for_source(str(source))
        try:
            index = int(chunk_idx)
        except (TypeError, ValueError):
            return ""
        if 0 <= index < len(chunks):
            return chunks[index]
        return ""

    def _chunks_for_source(self, source: str) -> List[str]:
        cached = self._chunks_by_source.get(source)
        if cached is not None:
            return cached
        if self.storage_client is None:
            return []
        try:
            bucket_name, object_path = parse_gs_path(source)
            text = (
                self.storage_client.bucket(bucket_name)
                .blob(object_path)
                .download_as_text(encoding="utf-8")
            )
            chunks = chunk_10k_text(text)
            self._chunks_by_source[source] = chunks
            return chunks
        except Exception as exc:
            logger.warning("Failed to hydrate chunks from %s: %s", source, exc)
            self._chunks_by_source[source] = []
            return []


def pinecone_similarity_search(
    *,
    index,
    embed_query: Callable[[str], List[float]],
    query: str,
    k: int,
    namespace: str,
    resolver: ChunkTextResolver,
) -> List[Document]:
    """Query Pinecone and return documents with hydrated page content."""
    vector = embed_query(query)
    result = index.query(
        vector=vector,
        top_k=k,
        namespace=namespace,
        include_metadata=True,
    )
    docs: List[Document] = []
    for match in getattr(result, "matches", None) or []:
        meta = dict(getattr(match, "metadata", None) or {})
        text = resolver.resolve(meta)
        if not text.strip():
            continue
        meta["score"] = getattr(match, "score", None)
        meta["vector_id"] = getattr(match, "id", None)
        docs.append(Document(page_content=text, metadata=meta))
    return docs
