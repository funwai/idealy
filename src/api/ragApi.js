import API_BASE_URL from './config';

/**
 * Calls the RAG API to ask a question
 * @param {string} question - The question to ask
 * @returns {Promise<{answer: string}>} - The response containing the answer
 * @throws {Error} - If the API call fails
 */
export const askQuestion = async (question) => {
  if (!question || !question.trim()) {
    throw new Error('Question cannot be empty');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: question.trim(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `API request failed with status ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Failed to connect to API. Make sure the backend server is running at ${API_BASE_URL}`
      );
    }
    throw error;
  }
};


