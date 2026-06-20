from contextlib import asynccontextmanager
from typing import List
import logging

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import firestore
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from langchain_pinecone import PineconeVectorStore
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pinecone import Pinecone

from firebase_client import create_firestore_client
from ingestion import get_ingestion_record, list_ingestion_records

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    pinecone_api_key: str = Field(..., alias="PINECONE_API_KEY")
    pinecone_index_name: str = Field(..., alias="PINECONE_INDEX_NAME")
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

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }

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
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-large",
        openai_api_key=settings.openai_api_key,
    )
    pinecone_client = Pinecone(api_key=settings.pinecone_api_key)
    index = pinecone_client.Index(settings.pinecone_index_name)
    vector_store = PineconeVectorStore(embedding=embeddings, index=index)
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        openai_api_key=settings.openai_api_key,
    )

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
        default="llm_enhanced",
        description="Retrieval method: 'similarity', 'mmr', 'multi_query', 'llm_enhanced', or 'hybrid'"
    )
    k: int = Field(default=5, description="Number of documents to retrieve")


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


async def mmr_search(vector_store: PineconeVectorStore, query: str, k: int, fetch_k: int = 20):
    """Maximal Marginal Relevance search for diverse results"""
    try:
        if hasattr(vector_store, 'max_marginal_relevance_search'):
            docs = await run_in_threadpool(
                vector_store.max_marginal_relevance_search,
                query, k=k, fetch_k=fetch_k
            )
            return docs
        else:
            # Fallback to regular similarity search
            logger.warning("MMR search not available, falling back to similarity search")
            return await run_in_threadpool(vector_store.similarity_search, query, k)
    except Exception as e:
        logger.error(f"Error in MMR search: {e}")
        raise


async def multi_query_retrieval(vector_store: PineconeVectorStore, llm: ChatOpenAI, query: str, k: int):
    """Generate multiple queries and combine results"""
    # Generate multiple query variations
    queries = await expand_query_with_llm(llm, query)
    logger.info(f"Generated {len(queries)} query variations: {queries}")
    
    # Search with each query
    all_docs = []
    seen_ids = set()
    
    for q in queries:
        try:
            docs = await run_in_threadpool(vector_store.similarity_search, q, k)
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


async def llm_enhanced_retrieval(vector_store: PineconeVectorStore, llm: ChatOpenAI, query: str, k: int):
    """Use LLM to refine query, then perform similarity search"""
    # Refine the query first
    refined_query = await refine_query_with_llm(llm, query)
    logger.info(f"Original query: {query}")
    logger.info(f"Refined query: {refined_query}")
    
    # Perform similarity search with refined query
    docs = await run_in_threadpool(vector_store.similarity_search, refined_query, k)
    return docs


async def hybrid_retrieval(vector_store: PineconeVectorStore, llm: ChatOpenAI, query: str, k: int):
    """Combine multiple retrieval methods for best results"""
    # Get results from multiple methods
    results = []
    
    # 1. LLM-enhanced search
    try:
        llm_docs = await llm_enhanced_retrieval(vector_store, llm, query, k)
        results.extend(llm_docs)
    except Exception as e:
        logger.warning(f"LLM-enhanced retrieval failed: {e}")
    
    # 2. Multi-query retrieval
    try:
        multi_docs = await multi_query_retrieval(vector_store, llm, query, k // 2)
        results.extend(multi_docs)
    except Exception as e:
        logger.warning(f"Multi-query retrieval failed: {e}")
    
    # 3. Regular similarity search as fallback
    try:
        sim_docs = await run_in_threadpool(vector_store.similarity_search, query, k)
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
        vector_store = app.state.vector_store
        index = vector_store.index
        
        # Get index stats
        stats = index.describe_index_stats()
        
        # Try a simple test query
        test_docs = await run_in_threadpool(
            vector_store.similarity_search, 
            "test", 
            1
        )
        
        return {
            "index_name": settings.pinecone_index_name,
            "index_stats": stats,
            "test_query_results": len(test_docs),
            "embedding_model": "text-embedding-3-large",
            "embedding_dimension": 3072,
        }
    except Exception as e:
        logger.error(f"Error getting index stats: {str(e)}", exc_info=True)
        return {
            "error": str(e),
            "index_name": settings.pinecone_index_name,
        }


@app.post("/api/ask")
async def ask(query: AskRequest):
    vector_store = app.state.vector_store
    llm = app.state.llm

    logger.info(f"Received question: {query.question} (method: {query.retrieval_method})")
    
    # 1. Retrieve most relevant documents using selected method
    try:
        if query.retrieval_method == "similarity":
            docs = await run_in_threadpool(vector_store.similarity_search, query.question, query.k)
        elif query.retrieval_method == "mmr":
            docs = await mmr_search(vector_store, query.question, query.k)
        elif query.retrieval_method == "multi_query":
            docs = await multi_query_retrieval(vector_store, llm, query.question, query.k)
        elif query.retrieval_method == "llm_enhanced":
            docs = await llm_enhanced_retrieval(vector_store, llm, query.question, query.k)
        elif query.retrieval_method == "hybrid":
            docs = await hybrid_retrieval(vector_store, llm, query.question, query.k)
        else:
            logger.warning(f"Unknown retrieval method: {query.retrieval_method}, using similarity")
            docs = await run_in_threadpool(vector_store.similarity_search, query.question, query.k)
        
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
        
        context = "\n\n".join(doc.page_content for doc in docs_with_content)
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
    You are a factual assistant. Answer ONLY using the provided context.
    If the answer is not found in the context, say:
    "I could not find relevant information in the knowledge base."

    CONTEXT:
    {context}

    QUESTION:
    {query.question}
    """

    # 3. Query the LLM
    response = await llm.ainvoke(prompt)
    return {"answer": response.content}
