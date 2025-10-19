# Kurio Backend API

FastAPI backend for fetching financial data from SEC filings.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Server

Start the FastAPI server:
```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Get Company Financials
**GET** `/api/get-financials`

**Query Parameters:**
- `ticker` (string, required) - Company stock ticker symbol (e.g., "AAPL", "MSFT")

**Example:**
```
http://localhost:8000/api/get-financials?ticker=AAPL
```

**Response:**
```json
{
  "ticker": "AAPL",
  "filing": "https://www.sec.gov/Archives/edgar/...",
  "cashflow": [
    { ... }
  ]
}
```

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Notes

- The API fetches data from SEC EDGAR database
- It retrieves the latest 10-K filing for the specified company
- Extracts the Cash Flow Statement from the filing
- CORS is enabled for all origins (adjust in production)


