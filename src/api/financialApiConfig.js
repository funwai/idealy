// Financial Data API Configuration
// Update the FINANCIAL_API_BASE_URL based on your deployment environment

const FINANCIAL_API_BASE_URL = process.env.REACT_APP_FINANCIAL_API_URL || 'https://pull-financial-statements-svc.onrender.com';

export default FINANCIAL_API_BASE_URL;
