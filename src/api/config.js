// API Configuration
// Update the API_BASE_URL based on your deployment environment

const RENDER_API_BASE_URL = 'https://one0k-rag-query.onrender.com';

// Use Render API by default. To use local API, set REACT_APP_USE_LOCAL_API=true
const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.REACT_APP_USE_LOCAL_API === 'true'
    ? 'http://localhost:8000' // Local FastAPI server default port
    : RENDER_API_BASE_URL); // Default to Render API

export default API_BASE_URL;


