import API_BASE_URL from './config';

async function fetchWithTimeout(url, options = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(
        'Request timed out. The API may be starting up (Render free tier can take 30-60 seconds to wake up). Please try again.'
      );
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Failed to connect to API at ${API_BASE_URL}. The service may be starting up. Please wait a moment and try again.`
      );
    }
    throw error;
  }
}

/**
 * List ingested 10-K filings from the RAG API ingestion manifest.
 * @param {Object} options
 * @param {string|null} options.ticker - Optional ticker filter
 * @param {string} options.status - Ingestion status filter (default: 'success')
 * @param {number} options.limit - Max records to return (default: 500)
 * @param {number} options.retries - Retry attempts for cold starts (default: 1)
 * @returns {Promise<{count: number, items: Array}>}
 */
export const listIngestionFiles = async (options = {}) => {
  const {
    ticker = null,
    status = 'success',
    limit = 500,
    retries = 1,
  } = options;

  const params = new URLSearchParams({ status, limit: String(limit) });
  if (ticker) {
    params.set('ticker', ticker.trim().toUpperCase());
  }

  const url = `${API_BASE_URL}/api/ingestion/files?${params.toString()}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `API request failed with status ${response.status}`
        );
      }

      return response.json();
    } catch (error) {
      if (attempt < retries && (error.message.includes('starting up') || error.message.includes('timed out'))) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
};

/**
 * Calls the RAG API to ask a question
 * @param {string} question - The question to ask
 * @param {Object} options - Optional parameters
 * @param {string} options.retrieval_method - Retrieval method: 'similarity', 'mmr', 'multi_query', 'llm_enhanced', or 'hybrid' (default: 'llm_enhanced')
 * @param {number} options.k - Number of documents to retrieve (default: 5)
 * @param {number} options.retries - Number of retry attempts (default: 1)
 * @returns {Promise<{answer: string}>} - The response containing the answer
 * @throws {Error} - If the API call fails
 */
export const askQuestion = async (question, options = {}) => {
  if (!question || !question.trim()) {
    throw new Error('Question cannot be empty');
  }

  const {
    retrieval_method = 'llm_enhanced',
    k = 5,
    retries = 1
  } = options;

  const makeRequest = async () => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: question.trim(),
        retrieval_method: retrieval_method,
        k: k,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `API request failed with status ${response.status}`
      );
    }

    return response.json();
  };

  // Retry logic for cold starts
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await makeRequest();
    } catch (error) {
      if (attempt < retries && (error.message.includes('starting up') || error.message.includes('timed out'))) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
};


