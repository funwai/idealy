# Local API Testing Guide

This guide will help you test the RAG API locally before deploying to production.

## Prerequisites

1. Python 3.8+ installed
2. Environment variables set up (see below)

## Setup

### 1. Install Dependencies

```bash
cd backend/rag-api
pip install -r requirements.txt
```

### 2. Create `.env` File

Create a `.env` file in the `backend/rag-api` directory with your API keys:

```env
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=your_pinecone_index_name_here
OPENAI_API_KEY=your_openai_api_key_here
```

**Note:** The `.env` file is gitignored, so it won't be committed to your repository.

### 3. Run the API Server

```bash
cd backend/rag-api
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The `--reload` flag enables auto-reload on code changes (useful for development).

The API will be available at:
- **Root:** http://localhost:8000/
- **Health Check:** http://localhost:8000/health
- **API Endpoint:** http://localhost:8000/api/ask

### 4. Test the API

#### Option A: Using cURL

```bash
# Test root endpoint
curl http://localhost:8000/

# Test health endpoint
curl http://localhost:8000/health

# Test the ask endpoint
curl -X POST http://localhost:8000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is Nvidia?"}'
```

#### Option B: Using Browser

1. Open http://localhost:8000/ in your browser - you should see `{"message":"RAG API is up and running."}`
2. Open http://localhost:8000/docs - FastAPI automatically generates interactive API documentation (Swagger UI)

#### Option C: Using Your Frontend

1. Make sure your frontend is running (`npm start` in the root directory)
2. The frontend is already configured to use `http://localhost:8000` in development mode
3. Try asking a question in the chat input - it should connect to your local API

#### Option D: Using Python

```python
import requests

response = requests.post(
    "http://localhost:8000/api/ask",
    json={"question": "What is Nvidia?"}
)
print(response.json())
```

## Troubleshooting

### Port Already in Use

If port 8000 is already in use, you can change it:

```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Then update `src/api/config.js` to use `http://localhost:8001` for local development.

### Missing Environment Variables

If you get errors about missing API keys, make sure:
1. Your `.env` file exists in `backend/rag-api/`
2. All required variables are set (PINECONE_API_KEY, PINECONE_INDEX_NAME, OPENAI_API_KEY)
3. No typos in variable names

### CORS Errors

The API is already configured to allow `http://localhost:3000` and `http://localhost:3001` for local development. If you're using a different port, you may need to add it to the CORS origins in `main.py`.

## Next Steps

Once local testing works:
1. Test all your endpoints
2. Verify responses match expected format
3. Deploy to Render
4. Update production frontend to use the Render URL

