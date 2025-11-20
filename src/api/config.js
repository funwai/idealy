// API Configuration
// Update the API_BASE_URL based on your deployment environment

const RENDER_API_BASE_URL = 'https://one0k-rag-query.onrender.com';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? RENDER_API_BASE_URL
    : 'http://localhost:8000'); // Local FastAPI server default port

export default API_BASE_URL;


