// API Configuration
// Update the API_BASE_URL based on your deployment environment

const API_BASE_URL = 
  process.env.REACT_APP_API_URL || 
  process.env.NODE_ENV === 'production' 
    ? 'https://your-render-service-name.onrender.com'  // Update with your Render.com service URL
    : 'http://localhost:8000';  // Local FastAPI server default port

export default API_BASE_URL;


