"""One-off: attach chunk text to existing Pinecone vectors so LangChain can retrieve them."""

from __future__ import annotations

import argparse
import os
import re

from dotenv import load_dotenv
from google.cloud import firestore, storage
from google.oauth2 import service_account
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pinecone import Pinecone

load_dotenv()

NAMESPACE = os.getenv("PINECONE_NAMESPACE", "10k")
FETCH_BATCH = 100
UPSERT_BATCH = 100


def chunk_text(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1200,
        chunk_overlap=150,
        separators=["\n\n", "\n", " ", ""],
    )
    return splitter.split_text(text)


def parse_gs_path(gs_path: str) -> tuple[str, str]:
    without = gs_path.replace("gs://", "", 1)
    bucket, _, obj = without.partition("/")
    return bucket, obj


def read_gcs_text(storage_client: storage.Client, gs_path: str) -> str:
    bucket_name, object_path = parse_gs_path(gs_path)
    return storage_client.bucket(bucket_name).blob(object_path).download_as_text(encoding="utf-8")


def backfill_file(
    index,
    storage_client: storage.Client,
    ticker: str,
    year: int,
    source: str,
    expected_chunks: int | None = None,
) -> int:
    text = read_gcs_text(storage_client, source)
    chunks = chunk_text(text)
    if expected_chunks and expected_chunks != len(chunks):
        print(
            f"  warn {ticker} {year}: splitter produced {len(chunks)} chunks, "
            f"manifest has {expected_chunks}"
        )

    updated = 0
    ids = [f"{ticker}:{year}:10K:{i}" for i in range(len(chunks))]
    for start in range(0, len(ids), FETCH_BATCH):
        batch_ids = ids[start : start + FETCH_BATCH]
        fetched = index.fetch(ids=batch_ids, namespace=NAMESPACE)
        vectors = getattr(fetched, "vectors", {}) or {}
        upserts = []
        for vid, vec in vectors.items():
            meta = dict(vec.metadata or {})
            chunk_idx = meta.get("chunk")
            if chunk_idx is None:
                chunk_idx = int(str(vid).rsplit(":", 1)[-1])
            i = int(chunk_idx)
            if i < 0 or i >= len(chunks):
                continue
            if meta.get("text") == chunks[i]:
                continue
            meta["text"] = chunks[i]
            upserts.append(
                {
                    "id": vid,
                    "values": list(vec.values),
                    "metadata": meta,
                }
            )
        for i in range(0, len(upserts), UPSERT_BATCH):
            index.upsert(vectors=upserts[i : i + UPSERT_BATCH], namespace=NAMESPACE)
            updated += len(upserts[i : i + UPSERT_BATCH])
    print(f"updated {ticker} {year}: {updated}/{len(chunks)} vectors")
    return updated


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ticker", default=None, help="Only this ticker, e.g. A")
    parser.add_argument("--limit", type=int, default=0, help="Max files to process (0 = all)")
    args = parser.parse_args()

    sa_path = os.environ["FIREBASE_SERVICE_ACCOUNT_JSON"]
    creds = service_account.Credentials.from_service_account_file(sa_path)
    project = os.getenv("GCP_PROJECT_ID")
    db = firestore.Client(project=project, credentials=creds)
    storage_client = storage.Client(project=project, credentials=creds)
    index = Pinecone(api_key=os.environ["PINECONE_API_KEY"]).Index(
        os.environ["PINECONE_INDEX_NAME"]
    )

    query = db.collection("ingestion").document("10k").collection("files")
    if args.ticker:
        query = query.where("ticker", "==", args.ticker.strip().upper())
    records = list(query.stream())
    records.sort(key=lambda doc: doc.id)
    if args.limit:
        records = records[: args.limit]

    print(f"processing {len(records)} ingestion files")
    total = 0
    for doc in records:
        data = doc.to_dict() or {}
        ticker = data.get("ticker") or doc.id.split("_")[0]
        year_val = data.get("year")
        if year_val is None:
            match = re.search(r"_(\d{4})$", doc.id)
            year_val = int(match.group(1)) if match else None
        source = data.get("sourceGsPath") or data.get("source")
        if not ticker or not year_val or not source:
            print(f"skip {doc.id}: missing ticker/year/source")
            continue
        try:
            updated = backfill_file(
                index,
                storage_client,
                str(ticker).strip().upper(),
                int(year_val),
                source,
                expected_chunks=data.get("chunkCount"),
            )
            total += updated
            if updated:
                doc.reference.set(
                    {"hasTextMetadata": True, "updatedAt": firestore.SERVER_TIMESTAMP},
                    merge=True,
                )
        except Exception as ext:
            print(f"FAIL {doc.id}: {type(ext).__name__}: {ext}")
    print(f"done, updated {total} vectors")


if __name__ == "__main__":
    main()
