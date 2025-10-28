from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# import your helper functions here
from financial_api import get_cashflow_json, store_financials_to_firestore

app = FastAPI(title="Kurio Financial API", version="1.0")

# ✅ Allow your frontend (e.g. kurio.web.app) to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with your actual domain for production, e.g. ["https://kurio.web.app"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Kurio backend is running!"}


@app.get("/api/cashflow/{ticker}")
def get_cashflow_endpoint(ticker: str):
    """Endpoint to fetch cashflow and income statement data for a given ticker"""
    try:
        data = get_cashflow_json(ticker)
        return data
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
