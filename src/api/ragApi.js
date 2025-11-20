import API_BASE_URL from './config';

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
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await fetch(`${API_BASE_URL}/api/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          retrieval_method: retrieval_method,
          k: k,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `API request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      return data;
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


