# Retrieval Methods Guide

This API now supports multiple retrieval strategies beyond basic similarity search. Each method has different strengths for finding relevant context.

## Available Methods

### 1. `similarity` (Default Fallback)
**Basic semantic similarity search**
- Uses embedding similarity to find the most relevant documents
- Fast and straightforward
- Best for: Simple, direct questions

**Example:**
```json
{
  "question": "What is Nvidia's revenue?",
  "retrieval_method": "similarity",
  "k": 5
}
```

### 2. `llm_enhanced` (Recommended - Default)
**LLM-refined query search**
- Uses the LLM to refine/improve your query before searching
- Expands key terms and focuses on relevant concepts
- Best for: Complex questions, when you want better query understanding

**How it works:**
1. LLM analyzes your question and creates a refined search query
2. Performs similarity search with the refined query
3. Returns more relevant results

**Example:**
```json
{
  "question": "tell me about apple's financials",
  "retrieval_method": "llm_enhanced",
  "k": 5
}
```
*The LLM might refine this to: "Apple Inc financial performance revenue earnings income statement"*

### 3. `multi_query`
**Multiple query variations**
- Generates 2-3 alternative phrasings of your question
- Searches with each variation and combines results
- Best for: Ensuring comprehensive coverage, avoiding missing relevant docs

**How it works:**
1. LLM generates multiple query variations
2. Searches with each query
3. Combines and deduplicates results

**Example:**
```json
{
  "question": "How does Microsoft handle cloud revenue?",
  "retrieval_method": "multi_query",
  "k": 5
}
```
*Might generate queries like:*
- *"Microsoft cloud revenue recognition"*
- *"Azure revenue accounting methods"*
- *"Microsoft cloud services financial reporting"*

### 4. `mmr` (Maximal Marginal Relevance)
**Diverse, non-redundant results**
- Balances relevance with diversity
- Avoids returning very similar documents
- Best for: When you want varied perspectives or comprehensive coverage

**How it works:**
1. Finds more candidates than requested (fetch_k)
2. Selects diverse results that are still relevant
3. Reduces redundancy in retrieved documents

**Example:**
```json
{
  "question": "What are the risks in the tech industry?",
  "retrieval_method": "mmr",
  "k": 5
}
```

### 5. `hybrid`
**Combines multiple methods**
- Uses LLM-enhanced, multi-query, and similarity search
- Combines results from all methods
- Best for: Maximum coverage, important queries

**How it works:**
1. Runs LLM-enhanced search
2. Runs multi-query search
3. Runs regular similarity search
4. Combines and deduplicates all results
5. Returns top k documents

**Example:**
```json
{
  "question": "Compare Apple and Microsoft's financial strategies",
  "retrieval_method": "hybrid",
  "k": 10
}
```

## API Usage

### Default (LLM-Enhanced)
```bash
curl -X POST http://localhost:8000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is Nvidia?"}'
```

### Specify Method
```bash
curl -X POST http://localhost:8000/api/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is Nvidia?",
    "retrieval_method": "multi_query",
    "k": 10
  }'
```

### Frontend Usage
The frontend can specify the retrieval method:
```javascript
const result = await askQuestion("What is Nvidia?", {
  retrieval_method: "llm_enhanced",
  k: 5
});
```

## Method Comparison

| Method | Speed | Coverage | Best For |
|--------|-------|----------|----------|
| `similarity` | ⚡⚡⚡ Fast | ⭐⭐ Good | Simple questions |
| `llm_enhanced` | ⚡⚡ Medium | ⭐⭐⭐ Better | Complex questions (default) |
| `multi_query` | ⚡ Slower | ⭐⭐⭐⭐ Excellent | Comprehensive search |
| `mmr` | ⚡⚡ Medium | ⭐⭐⭐⭐ Excellent | Diverse perspectives |
| `hybrid` | ⚡ Slowest | ⭐⭐⭐⭐⭐ Best | Critical queries |

## Recommendations

- **Start with `llm_enhanced`** - It's the default and works well for most cases
- **Use `multi_query`** when you need comprehensive coverage
- **Use `mmr`** when you want diverse, non-redundant results
- **Use `hybrid`** for important queries where you want maximum coverage
- **Use `similarity`** for simple, fast queries

## Parameters

- `question` (required): Your search question
- `retrieval_method` (optional): One of the methods above (default: `"llm_enhanced"`)
- `k` (optional): Number of documents to retrieve (default: 5)

