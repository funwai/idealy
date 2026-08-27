from contextlib import asynccontextmanager
from typing import List
import json
import logging

import numpy as np
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import firestore
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from langchain_core.embeddings import Embeddings
from langchain_pinecone import PineconeVectorStore
from langchain_openai import ChatOpenAI
from pinecone import Pinecone
from fastembed import TextEmbedding

from firebase_client import create_firestore_client, create_storage_client
from ingestion import get_ingestion_record, list_ingestion_records
from retrieval import ChunkTextResolver, pinecone_similarity_search

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Must match RAG_Pinecone Ingestion.ipynb (index dimension 384).
# fastembed ONNX is used instead of sentence-transformers/PyTorch so Render
# free/starter instances do not OOM (exit 137) on boot.
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384


def _l2_normalize(vector) -> List[float]:
    arr = np.asarray(vector, dtype=np.float32)
    norm = float(np.linalg.norm(arr))
    if norm == 0.0:
        return arr.tolist()
    return (arr / norm).tolist()


class MiniLMEmbeddings(Embeddings):
    """
    384-d MiniLM embeddings compatible with the existing Pinecone index.
    Uses fastembed (ONNX) to stay within Render memory limits.
    """

    def __init__(self, model_name: str = EMBEDDING_MODEL_NAME):
        logger.info("Loading embedding model via fastembed: %s", model_name)
        self.model = TextEmbedding(model_name=model_name)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [_l2_normalize(vec) for vec in self.model.embed(texts)]

    def embed_query(self, text: str) -> List[float]:
        # query_embed matches document embed for MiniLM; keep API explicit
        return _l2_normalize(next(self.model.query_embed(text)))


class Settings(BaseSettings):
    pinecone_api_key: str = Field(..., alias="PINECONE_API_KEY")
    pinecone_index_name: str = Field(..., alias="PINECONE_INDEX_NAME")
    pinecone_namespace: str = Field(default="10k", alias="PINECONE_NAMESPACE")
    openai_api_key: str = Field(..., alias="OPENAI_API_KEY")
    firebase_service_account_json: str | None = Field(
        default=None,
        alias="FIREBASE_SERVICE_ACCOUNT_JSON",
    )
    gcp_project_id: str | None = Field(default=None, alias="GCP_PROJECT_ID")
    allowed_origins: str | None = Field(
        default=None,
        alias="ALLOWED_ORIGINS",
        description="Comma separated list of allowed origins for CORS.",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def cors_origins(self) -> List[str]:
        if self.allowed_origins:
            origins = [origin.strip() for origin in self.allowed_origins.split(",")]
            return [origin for origin in origins if origin]
        return [
            # Production frontend
            "https://www.kurio-ai.com",
            "https://kurio-ai.com",
            "https://kurio.onrender.com",
            # Local development
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
        ]


settings = Settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Use the same 384-d MiniLM model family that built the Pinecone index
    embeddings = MiniLMEmbeddings()
    pinecone_client = Pinecone(api_key=settings.pinecone_api_key)
    index = pinecone_client.Index(settings.pinecone_index_name)
    # Must match the namespace used by RAG_Pinecone Ingestion.ipynb (default: "10k")
    vector_store = PineconeVectorStore(
        embedding=embeddings,
        index=index,
        namespace=settings.pinecone_namespace,
    )
    logger.info(
        "Pinecone vector store ready (index=%s, namespace=%s, embedding=%s, dim=%s)",
        settings.pinecone_index_name,
        settings.pinecone_namespace,
        EMBEDDING_MODEL_NAME,
        EMBEDDING_DIMENSION,
    )
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        openai_api_key=settings.openai_api_key,
    )

    app.state.embeddings = embeddings
    app.state.pinecone_index = index
    app.state.vector_store = vector_store
    app.state.llm = llm

    try:
        app.state.firestore = create_firestore_client(
            service_account_value=settings.firebase_service_account_json,
            project_id=settings.gcp_project_id,
        )
        logger.info("Firestore client initialized for ingestion reads")
    except Exception as exc:
        app.state.firestore = None
        logger.warning("Firestore client not initialized: %s", exc)

    storage_client = None
    try:
        storage_client = create_storage_client(
            service_account_value=settings.firebase_service_account_json,
            project_id=settings.gcp_project_id,
        )
        logger.info("Cloud Storage client initialized for chunk text hydration")
    except Exception as exc:
        logger.warning("Cloud Storage client not initialized: %s", exc)

    app.state.chunk_resolver = ChunkTextResolver(storage_client)

    yield


app = FastAPI(lifespan=lifespan)

# ---------------------------------------------
# Configure CORS middleware
# ---------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------
# Models and Retrieval Strategies
# ---------------------------------------------
class AskRequest(BaseModel):
    question: str
    retrieval_method: str = Field(
        default="similarity",
        description="Retrieval method: 'similarity', 'mmr', 'multi_query', 'llm_enhanced', or 'hybrid'"
    )
    k: int = Field(default=8, description="Number of documents to retrieve")


def _json_safe(value):
    """Convert Pinecone/SDK objects into JSON-serializable data."""
    return json.loads(json.dumps(value, default=str))


def search_docs(query: str, k: int):
    """Similarity search that hydrates chunk text from metadata or GCS."""
    return pinecone_similarity_search(
        index=app.state.pinecone_index,
        embed_query=app.state.embeddings.embed_query,
        query=query,
        k=k,
        namespace=settings.pinecone_namespace,
        resolver=app.state.chunk_resolver,
    )


def _require_firestore(request: Request) -> firestore.Client:
    db = request.app.state.firestore
    if db is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Firestore is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON "
                "(file path, JSON string, or base64-encoded JSON) and optionally GCP_PROJECT_ID."
            ),
        )
    return db


async def expand_query_with_llm(llm: ChatOpenAI, original_query: str) -> List[str]:
    """Use LLM to generate multiple search queries from the original question"""
    expansion_prompt = f"""
    Given the following question, generate 2-3 alternative search queries that would help find relevant information.
    The queries should be rephrased or focus on different aspects of the question.
    
    Original question: {original_query}
    
    Return only the queries, one per line, without numbering or bullets.
    """
    
    try:
        response = await llm.ainvoke(expansion_prompt)
        queries = [q.strip() for q in response.content.split('\n') if q.strip()]
        # Always include the original query
        queries.insert(0, original_query)
        return queries[:3]  # Limit to 3 queries
    except Exception as e:
        logger.warning(f"Query expansion failed: {e}, using original query only")
        return [original_query]


async def refine_query_with_llm(llm: ChatOpenAI, original_query: str) -> str:
    """Use LLM to refine/improve the search query for better retrieval"""
    refinement_prompt = f"""
    Refine the following search query to make it more effective for finding relevant information in a financial/company knowledge base.
    Focus on key terms, company names, financial concepts, and specific details.
    
    Original query: {original_query}
    
    Return only the refined query, nothing else.
    """
    
    try:
        response = await llm.ainvoke(refinement_prompt)
        refined = response.content.strip()
        return refined if refined else original_query
    except Exception as e:
        logger.warning(f"Query refinement failed: {e}, using original query")
        return original_query


async def mmr_search(query: str, k: int, fetch_k: int = 20):
    """Maximal Marginal Relevance search for diverse results"""
    try:
        vector_store = app.state.vector_store
        if hasattr(vector_store, 'max_marginal_relevance_search'):
            docs = await run_in_threadpool(
                vector_store.max_marginal_relevance_search,
                query, k=k, fetch_k=fetch_k
            )
            docs_with_content = [doc for doc in docs if doc.page_content and doc.page_content.strip()]
            if docs_with_content:
                return docs_with_content
        logger.warning("MMR returned no text; falling back to hydrated similarity search")
        return await run_in_threadpool(search_docs, query, k)
    except Exception as e:
        logger.error(f"Error in MMR search: {e}")
        raise


async def multi_query_retrieval(llm: ChatOpenAI, query: str, k: int):
    """Generate multiple queries and combine results"""
    # Generate multiple query variations
    queries = await expand_query_with_llm(llm, query)
    logger.info(f"Generated {len(queries)} query variations: {queries}")
    
    # Search with each query
    all_docs = []
    seen_ids = set()
    
    for q in queries:
        try:
            docs = await run_in_threadpool(search_docs, q, k)
            for doc in docs:
                # Use page_content as a simple deduplication key
                doc_id = hash(doc.page_content[:100])  # First 100 chars as ID
                if doc_id not in seen_ids:
                    seen_ids.add(doc_id)
                    all_docs.append(doc)
        except Exception as e:
            logger.warning(f"Error searching with query '{q}': {e}")
            continue
    
    # Return top k unique documents
    return all_docs[:k]


async def llm_enhanced_retrieval(llm: ChatOpenAI, query: str, k: int):
    """Use LLM to refine query, then search with both original and refined text."""
    refined_query = await refine_query_with_llm(llm, query)
    logger.info(f"Original query: {query}")
    logger.info(f"Refined query: {refined_query}")

    queries = [query]
    if refined_query and refined_query.strip().lower() != query.strip().lower():
        queries.append(refined_query)

    all_docs = []
    seen_ids = set()
    per_query_k = max(k, 8)
    for q in queries:
        docs = await run_in_threadpool(search_docs, q, per_query_k)
        for doc in docs:
            doc_id = hash(doc.page_content[:100])
            if doc_id not in seen_ids:
                seen_ids.add(doc_id)
                all_docs.append(doc)
    return all_docs[: max(k, 8)]


async def hybrid_retrieval(llm: ChatOpenAI, query: str, k: int):
    """Combine multiple retrieval methods for best results"""
    # Get results from multiple methods
    results = []
    
    # 1. LLM-enhanced search
    try:
        llm_docs = await llm_enhanced_retrieval(llm, query, k)
        results.extend(llm_docs)
    except Exception as e:
        logger.warning(f"LLM-enhanced retrieval failed: {e}")
    
    # 2. Multi-query retrieval
    try:
        multi_docs = await multi_query_retrieval(llm, query, k // 2)
        results.extend(multi_docs)
    except Exception as e:
        logger.warning(f"Multi-query retrieval failed: {e}")
    
    # 3. Regular similarity search as fallback
    try:
        sim_docs = await run_in_threadpool(search_docs, query, k)
        results.extend(sim_docs)
    except Exception as e:
        logger.warning(f"Similarity search failed: {e}")
    
    # Deduplicate and return top k
    seen = set()
    unique_docs = []
    for doc in results:
        doc_id = hash(doc.page_content[:100])
        if doc_id not in seen:
            seen.add(doc_id)
            unique_docs.append(doc)
    
    return unique_docs[:k]


@app.get("/")
async def root():
    return {"message": "RAG API is up and running."}


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/api/ingestion/files")
async def list_ingestion_files(
    request: Request,
    ticker: str | None = Query(default=None, description="Filter by ticker symbol, e.g. NFLX"),
    status: str | None = Query(default=None, description="Filter by status: running, success, etc."),
    limit: int = Query(default=100, ge=1, le=500, description="Maximum records to return"),
):
    """List ingestion manifest documents from ingestion/10k/files."""
    db = _require_firestore(request)
    records = await run_in_threadpool(
        list_ingestion_records,
        db,
        ticker=ticker,
        status=status,
        limit=limit,
    )
    return {
        "count": len(records),
        "items": records,
    }


@app.get("/api/ingestion/files/{ticker}/{year}")
async def get_ingestion_file(request: Request, ticker: str, year: int):
    """Get one ingestion manifest document by ticker and filing year."""
    db = _require_firestore(request)
    record = await run_in_threadpool(get_ingestion_record, db, ticker, year)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail=f"No ingestion record found for {ticker.strip().upper()} {year}",
        )
    return record


@app.get("/debug/index-stats")
async def debug_index_stats():
    """Debug endpoint to check if the Pinecone index has data"""
    try:
        index = app.state.pinecone_index

        raw_stats = index.describe_index_stats()
        # Pinecone SDK may return a non-JSON object; normalize for the response.
        if hasattr(raw_stats, "to_dict"):
            stats = raw_stats.to_dict()
        elif isinstance(raw_stats, dict):
            stats = raw_stats
        else:
            stats = {"raw": str(raw_stats)}
        stats = _json_safe(stats)

        namespaces = stats.get("namespaces") or {}
        namespace_stats = namespaces.get(settings.pinecone_namespace) or {}
        vector_count = namespace_stats.get("vector_count", namespace_stats.get("record_count"))

        test_docs = await run_in_threadpool(
            search_docs,
            "Agilent Technologies business",
            3,
        )

        return {
            "index_name": settings.pinecone_index_name,
            "namespace": settings.pinecone_namespace,
            "namespace_vector_count": vector_count,
            "total_vector_count": stats.get("total_vector_count"),
            "index_stats": stats,
            "test_query_results": len(test_docs),
            "test_query_preview": [
                (doc.page_content or "")[:160] for doc in test_docs
            ],
            "embedding_model": EMBEDDING_MODEL_NAME,
            "embedding_dimension": EMBEDDING_DIMENSION,
        }
    except Exception as e:
        logger.error(f"Error getting index stats: {str(e)}", exc_info=True)
        return {
            "error": str(e),
            "index_name": settings.pinecone_index_name,
            "namespace": settings.pinecone_namespace,
        }


@app.post("/api/ask")
async def ask(query: AskRequest):
    llm = app.state.llm

    logger.info(f"Received question: {query.question} (method: {query.retrieval_method})")
    
    # 1. Retrieve most relevant documents using selected method
    try:
        if query.retrieval_method == "similarity":
            docs = await run_in_threadpool(search_docs, query.question, query.k)
        elif query.retrieval_method == "mmr":
            docs = await mmr_search(query.question, query.k)
        elif query.retrieval_method == "multi_query":
            docs = await multi_query_retrieval(llm, query.question, query.k)
        elif query.retrieval_method == "llm_enhanced":
            docs = await llm_enhanced_retrieval(llm, query.question, query.k)
        elif query.retrieval_method == "hybrid":
            docs = await hybrid_retrieval(llm, query.question, query.k)
        else:
            logger.warning(f"Unknown retrieval method: {query.retrieval_method}, using similarity")
            docs = await run_in_threadpool(search_docs, query.question, query.k)
        
        logger.info(f"Found {len(docs)} documents using {query.retrieval_method} method")
        
        if not docs:
            logger.warning("No documents returned from search")
            raise HTTPException(
                status_code=404,
                detail="I could not find relevant information in the knowledge base. The index may be empty or the query doesn't match any documents.",
            )
        
        # Filter out documents with empty content
        docs_with_content = [doc for doc in docs if doc.page_content and doc.page_content.strip()]
        logger.info(f"Found {len(docs_with_content)} documents with content")
        
        if not docs_with_content:
            logger.warning("All documents returned have empty content")
            raise HTTPException(
                status_code=404,
                detail="I could not find relevant information in the knowledge base. Documents were found but contain no content.",
            )
        
        context = "\n\n".join(
            f"[{doc.metadata.get('ticker', 'unknown')} {doc.metadata.get('year', '')}] {doc.page_content}"
            for doc in docs_with_content
        )
        logger.info(f"Context length: {len(context)} characters")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during retrieval: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error searching the knowledge base: {str(e)}",
        )

    # 2. Build prompt
    prompt = f"""
    You are a factual assistant. Answer using the provided 10-K context.
    If the context does not contain enough information to answer, say:
    "I could not find relevant information in the knowledge base."

    CONTEXT:
    {context}

    QUESTION:
    {query.question}
    """

    # 3. Query the LLM
    response = await llm.ainvoke(prompt)
    return {"answer": response.content}
