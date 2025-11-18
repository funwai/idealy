from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from langchain_pinecone import PineconeVectorStore
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pinecone import Pinecone


class Settings(BaseSettings):
    pinecone_api_key: str = Field(..., alias="PINECONE_API_KEY")
    pinecone_index_name: str = Field(..., alias="PINECONE_INDEX_NAME")
    openai_api_key: str = Field(..., alias="OPENAI_API_KEY")
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
#1. Load embedding model
# ---------------------------------------------
class Query(BaseModel):
    question: str


@app.get("/")
async def root():
    return {"message": "RAG API is up and running."}


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/api/ask")
async def ask(query: Query):
    vector_store = app.state.vector_store
    llm = app.state.llm

    # 1. Retrieve most relevant documents
    docs = await run_in_threadpool(vector_store.similarity_search, query.question, 5)
    context = "\n\n".join(doc.page_content for doc in docs)

    if not context:
        raise HTTPException(
            status_code=404,
            detail="I could not find relevant information in the knowledge base.",
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
