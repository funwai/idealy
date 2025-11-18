import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_pinecone import PineconeVectorStore
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pinecone import Pinecone

# ---------------------------------------------
# Load environment variables
# ---------------------------------------------
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not all([PINECONE_API_KEY, PINECONE_INDEX_NAME, OPENAI_API_KEY]):
    raise ValueError(
        "Missing required environment variables. "
        "Make sure PINECONE_API_KEY, PINECONE_INDEX_NAME, and OPENAI_API_KEY are set."
    )

app = FastAPI()

# ---------------------------------------------
# Configure CORS middleware
# ---------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server default
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        # Add your production frontend URL here when deployed
        # "https://your-frontend-domain.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------
#1. Load embedding model
# ---------------------------------------------
embeddings = OpenAIEmbeddings(
    model="text-embedding-3-large",
    openai_api_key=OPENAI_API_KEY
)

# ---------------------------------------------
#2. Create vector store
# ---------------------------------------------
# 2A. Connect Pinecone
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(PINECONE_INDEX_NAME)

# 2B. LangChain wrapper
vector_store = PineconeVectorStore(embedding=embeddings, index=index)

# ---------------------------------------------
#3. Select Chat LLM
# ---------------------------------------------
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, openai_api_key=OPENAI_API_KEY)

# ---------------------------------------------
# Request model - define an HTTP endpoint
# ---------------------------------------------
class Query(BaseModel):
    question: str

@app.post("/api/ask")
async def ask(query: Query):
    # 1. Retrieve most relevant documents
    docs = vector_store.similarity_search(query.question, k=5)
    context = "\n\n".join(doc.page_content for doc in docs)

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
    response = llm.invoke(prompt)
    return {"answer": response.content}
